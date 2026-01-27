const { EventEmitter } = require('events');  
const hazelcastManager = require('../core/HazelcastManager');  
const Agent = require('../core/Agent');  
const CONSTANTS = require('../config/constants');

class ATCService extends EventEmitter {  
  constructor() {  
    super();  
    this.agents = new Map();  
    this.agentConfigs = new Map(); 
    this.state = {  
      resourceId: `traffic-control-lock-${Date.now()}`,  
      holder: null,  
      waitingAgents: [],  
      collisionCount: 0,  
      overrideSignal: false,  
      fencingToken: null,  
      latency: 0,
      activeAgentCount: 0, 
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
      this.sharedClient = hazelcastManager.getClient();
      // Start with initial pool
      await this.updateAgentPool(2);
    } catch (err) {  
      console.error('Failed to initialize ATC Service:', err);  
    }  
  }  

  registerAgentConfig(id, config) {
      console.log(`📋 Registering config for ${id}: ${config.provider}/${config.model}`);
      this.agentConfigs.set(id, config);
      if (this.agents.has(id)) {
          const agent = this.agents.get(id);
          agent.updateConfig(config);
      }
  }
  
  // Renamed from updateAgentPool to better reflect "System Congestion" control logic if needed,
  // but for now keeping it as pool scaler.
  async updateAgentPool(targetCount) {
    if (targetCount > 10) targetCount = 10; // Hard Limit
    if (this.updateTimeout) clearTimeout(this.updateTimeout);
    this.updateTimeout = setTimeout(() => {
       this._executeScaling(targetCount);
    }, 300);
  }

  async _executeScaling(targetCount) {
    if (this.scalingInProgress) return;
    this.scalingInProgress = true;
    
    try {
        console.log(`⚖️ Scaling System Load to ${targetCount}...`);
        
        // 1. Separate Custom vs Auto Agents
        const allAgents = Array.from(this.agents.values());
        const customAgents = allAgents.filter(a => !/^Agent-\d+$/.test(a.id));
        const autoAgents = allAgents.filter(a => /^Agent-\d+$/.test(a.id));
        
        // Sort auto agents by N to ensure stability
        autoAgents.sort((a, b) => {
            const numA = parseInt(a.id.split('-')[1]);
            const numB = parseInt(b.id.split('-')[1]);
            return numA - numB;
        });

        // 2. Calculate how many Auto Agents we need
        // Target is Total Load. So Auto = Target - Custom
        let neededAuto = targetCount - customAgents.length;
        if (neededAuto < 0) neededAuto = 0; // Never kill custom agents via slider

        console.log(`   - Custom Agents: ${customAgents.length}`);
        console.log(`   - Auto Agents Current: ${autoAgents.length} / Target: ${neededAuto}`);

        // 3. Scale Down (Remove excess Auto Agents)
        if (autoAgents.length > neededAuto) {
            const toRemove = autoAgents.slice(neededAuto); // Remove from end (highest numbers)
            for (const agent of toRemove) {
                await this.terminateAgent(agent.id);
            }
        }

        // 4. Scale Up (Add new Auto Agents)
        if (autoAgents.length < neededAuto) {
            const toAdd = neededAuto - autoAgents.length;
            let added = 0;
            let candidateNum = 1;
            
            while (added < toAdd) {
                const candidateId = `Agent-${candidateNum}`;
                if (!this.agents.has(candidateId)) {
                    const config = this.agentConfigs.get(candidateId) || { provider: 'mock', model: 'simulation-v1' };
                    // Inject Shared Client
                    const agent = new Agent(candidateId, this, config, this.sharedClient);
                    this.agents.set(candidateId, agent);
                    agent.start();
                    added++;
                }
                candidateNum++;
            }
        }
        
        this.state.activeAgentCount = this.agents.size;
        this.emitState();
    } finally {
        this.scalingInProgress = false;
    }
  }  

  async terminateAgent(id) {
      const agent = this.agents.get(id);
      if (agent) {
          console.log(`🔻 Terminating Agent: ${id}`);
          try { await agent.stop(); } catch (e) {}
          this.agents.delete(id);
          this.state.activeAgentCount = this.agents.size;
          this.emitState();
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
      await new Promise(r => setTimeout(r, CONSTANTS.HUMAN_OVERRIDE_DELAY + 200));
      const acquiredFence = await lock.tryLock(3000);  
        
      if (acquiredFence) {  
        console.log(`🚨 [Admin] Override Successful (Fence: ${acquiredFence})`);  
        this.state.holder = 'Human (Admin)';  
        this.state.fencingToken = acquiredFence;  
        this.state.overrideSignal = true;  
        this.state.waitingAgents = [];  
        this.emitState();  
        return { success: true, message: 'Override Successful' };  
      } else {  
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
      try {
        if (await lock.isLocked()) {
          if (this.state.fencingToken) {
              await lock.unlock(this.state.fencingToken);
          } else {
              await lock.unlock(); 
          }
          console.log('🚨 [Human] Released Lock.');
        } else {
             console.log('[Human] Lock was already released.');
        }
      } catch (unlockErr) {  
        console.warn('Human Release notice:', unlockErr.message);  
      } finally {
        this.state.holder = null;  
        this.state.fencingToken = null;
        this.state.overrideSignal = false; 
        this.emitState();  
      }
    } catch (err) {  
      console.error('Critical Release Error:', err);  
    }  
  }  
  
  async toggleGlobalStop(enable) {
      this.state.globalStop = enable;
      this.emitState();
  }

  async pauseAgent(agentId, pause) {
      const client = hazelcastManager.getClient();
      if (client) {
          const map = await client.getMap(CONSTANTS.MAP_AGENT_COMMANDS);
          if (pause) {
              await map.put(agentId, { cmd: CONSTANTS.CMD_PAUSE });
          } else {
              await map.remove(agentId);
          }
      }
  }

  async renameAgent(oldId, newId) {
      if (!this.agents.has(oldId)) return false;
      
      const agent = this.agents.get(oldId);
      agent.id = newId; // Update internal ID
      
      this.agents.delete(oldId);
      this.agents.set(newId, agent);
      
      // Update config map key if needed
      if (this.agentConfigs.has(oldId)) {
          const config = this.agentConfigs.get(oldId);
          this.agentConfigs.delete(oldId);
          this.agentConfigs.set(newId, config);
      }
      
      console.log(`🏷️ Renamed Agent: ${oldId} -> ${newId}`);
      this.emitState();
      return true;
  }

  async getAgentStatus() {
      const client = hazelcastManager.getClient();
      if (client) {
          const map = await client.getMap(CONSTANTS.MAP_AGENT_STATUS);
          const entrySet = await map.entrySet();
          const statusList = [];
          
          // Only return status for currently active agents in memory to avoid stale data
          // or filter based on timestamp
          const now = Date.now();
          for (const entry of entrySet) {
             // If agent is managed by this service instance
             // For distributed, we'd trust the map, but for this single-node demo:
             if (this.agents.has(entry[1].id)) {
                 statusList.push(entry[1]);
             } else if (now - entry[1].lastUpdated < 5000) {
                 // Keep recently active distributed agents
                 statusList.push(entry[1]);
             }
          }
          return statusList.sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true}));
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
