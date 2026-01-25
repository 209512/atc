const { EventEmitter } = require('events');  
const hazelcastManager = require('../core/HazelcastManager');  
const Agent = require('../core/Agent');  
  
class ATCService extends EventEmitter {  
  constructor() {  
    super();  
    this.agents = new Map();  
    this.state = {  
      resourceId: `traffic-control-lock-${Date.now()}`,  
      holder: null,  
      waitingAgents: [],  
      collisionCount: 0,  
      overrideSignal: false,  
      fencingToken: null,  
      latency: 0,
      activeAgentCount: 0, // [New] Track explicit pool size
      timestamp: Date.now(),
      globalStop: false
    };  
      
    this.on('agent-acquired', this.handleAgentAcquired.bind(this));  
    this.on('agent-released', this.handleAgentReleased.bind(this));  
    this.on('agent-collision', this.handleAgentCollision.bind(this));  
    this.on('agent-waiting', this.handleAgentWaiting.bind(this));  
  }  
  
  async init() {  
    try {  
      await hazelcastManager.init();  
    } catch (err) {  
      console.error('Failed to initialize ATC Service:', err);  
    }  
  }  
  
  async updateAgentPool(targetCount) {
    if (this.updateTimeout) clearTimeout(this.updateTimeout);
    
    this.updateTimeout = setTimeout(() => {
       this._executeScaling(targetCount);
    }, 300);
  }

  async _executeScaling(targetCount) {
    if (this.scalingInProgress) {
        console.warn('⚠️ Scaling already in progress, skipping...');
        return;
    }
    this.scalingInProgress = true;
    
    try {
        console.log(`⚖️ Scaling Agent Pool to ${targetCount}...`);  
        for (let i = 1; i <= targetCount; i++) {  
          const agentId = `Agent-${i}`;  
          if (!this.agents.has(agentId)) {  
            const agent = new Agent(agentId, this);  
            this.agents.set(agentId, agent);  
            agent.start();  
          }  
        }  
        const currentIds = Array.from(this.agents.keys());  
        for (const id of currentIds) {  
          const agentNum = parseInt(id.split('-')[1]);  
          if (agentNum > targetCount) {  
            const agent = this.agents.get(id);  
            if (agent) {
                try {
                    await agent.stop();
                } catch (e) {
                    console.warn(`Error stopping agent ${id}:`, e.message);
                }
            }
            this.agents.delete(id);  
            console.log(`🔻 Scaled down: ${id}`);  
          }  
        }
        
        // [New] Update state with accurate count
        this.state.activeAgentCount = this.agents.size;
        this.emitState();
    } finally {
        this.scalingInProgress = false;
    }
  }  
  
  async startSimulation(count = 2) {  
    await this.updateAgentPool(count);  
  }  
  
  async humanOverride() {  
    console.log('🚨 [Human] Initiating Administrative Override...');  
    this.state.overrideSignal = true;  
    this.emitState();  
  
    try {  
      const cp = hazelcastManager.getCPSubsystem();  
      const lock = await cp.getLock(this.state.resourceId);  
        
      // Wait briefly to let agents detect signal and yield
      await new Promise(r => setTimeout(r, 1000)); // Increased to 1s for safety

      // Use longer timeout to guarantee acquisition
      const acquired = await lock.tryLock(5000);  
        
      if (acquired) {  
        const fence = "ADMIN-SESSION";  
        console.log(`🚨 [Admin] Override Successful`);  
          
        this.state.holder = 'Human (Admin)';  
        this.state.fencingToken = fence;  
        // Keep signal TRUE so agents continue to yield while Admin works
        this.state.overrideSignal = true;  
        this.state.waitingAgents = [];  
        this.emitState();  
        return { success: true, message: 'Override Successful' };  
      } else {  
        // If we can't get it, force reset? 
        // Or just fail and let user try again.
        // Failing fast is better for UI.
        console.warn('Override: Could not acquire lock in 2s');
        this.state.overrideSignal = false;  
        this.emitState();  
        return { success: false, message: 'System Busy: Retrying...' };  
      }  
    } catch (err) {  
      console.error('Override Failed:', err);  
      this.state.overrideSignal = false;  
      this.emitState();  
      return { success: false, message: err.message };  
    }  
  }  
  
  async releaseHumanLock() {  
    try {  
      const cp = hazelcastManager.getCPSubsystem();  
      const lock = await cp.getLock(this.state.resourceId);  
      
      // Force unlock safely
      try {
        if (await lock.isLocked()) {
          // In a real app we check ownership, but here we assume we are the only admin session
          await lock.unlock();
          console.log('🚨 [Human] Released Lock.');
        } else {
             console.log('[Human] Lock was already released.');
        }
      } catch (unlockErr) {  
        console.warn('Human Release notice:', unlockErr.message);  
        // Even if unlock fails, we must reset state
      } finally {
        this.state.holder = null;  
        this.state.fencingToken = null;
        this.state.overrideSignal = false; // Release the agents  
        this.emitState();  
      }
    } catch (err) {  
      console.error('Critical Release Error:', err);  
    }  
  }  
  
  async toggleGlobalStop(enable) {
      this.state.globalStop = enable;
      // Also update Hazelcast map if needed, but local state is propagated via event bus to agents
      this.emitState();
  }

  async pauseAgent(agentId, pause) {
      const client = hazelcastManager.getClient();
      if (client) {
          const map = await client.getMap('agent_commands');
          if (pause) {
              await map.put(agentId, { cmd: "PAUSE" });
          } else {
              await map.remove(agentId);
          }
      }
  }

  async getAgentStatus() {
      const client = hazelcastManager.getClient();
      if (client) {
          const map = await client.getMap('agent_status_map');
          const entrySet = await map.entrySet();
          // Convert to array
          const statusList = [];
          for (const entry of entrySet) {
             statusList.push(entry[1]);
          }
          return statusList.sort((a, b) => a.id.localeCompare(b.id));
      }
      return [];
  }

  handleAgentAcquired({ id, fence, latency }) {  
    this.state.holder = id;  
    this.state.fencingToken = fence;  
    this.state.latency = latency;  
    this.state.timestamp = Date.now();  
    this.state.waitingAgents = this.state.waitingAgents.filter(aid => aid !== id);  
    this.emitState();  
  }  
  
  handleAgentReleased({ id }) {  
    if (this.state.holder === id) {  
      this.state.holder = null;  
      this.state.fencingToken = null;  
    }  
    this.emitState();  
  }  
  
  handleAgentCollision() {  
    this.state.collisionCount++;  
    this.emitState();  
  }  
  
  handleAgentWaiting({ id }) {  
    if (!this.state.waitingAgents.includes(id)) {  
      this.state.waitingAgents.push(id);  
      this.emitState();  
    }  
  }  
  
  emitState() {  
    this.emit('state', { ...this.state });  
  }  
}  
  
module.exports = new ATCService();