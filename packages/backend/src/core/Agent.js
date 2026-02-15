const { Client } = require('hazelcast-client');  
const getHazelcastConfig = require('../config/hazelcast.config');  
const CONSTANTS = require('../config/constants');
const ProviderFactory = require('./providers/ProviderFactory');

class Agent {  
  constructor(id, eventBus, config = {}, sharedClient = null) {  
    this.id = id;  
    this.eventBus = eventBus;  
    this.config = config; 
    this.client = sharedClient; 
    this.isRunning = false;  
    this.provider = null;
    this.currentLock = null;
    this.currentFence = null;
    this.ownsClient = false;
  }  

  log(msg, type = 'info') {
    if (this.eventBus && typeof this.eventBus.addLog === 'function') {
        this.eventBus.addLog(this.id, msg, type);
    }
  }

  async start() {  
    if (this.isRunning) return;  
    this.isRunning = true;  
  
    try {  
      this.provider = ProviderFactory.create(this.config.provider || 'mock', this.config);
      await this.provider.init().catch(e => console.warn(`[${this.id}] Provider init: ${e.message}`));

      if (!this.client) {
          const config = getHazelcastConfig(this.id);  
          this.client = await Client.newHazelcastClient(config);  
          this.ownsClient = true;
      }

      this.statusMap = await this.client.getMap(CONSTANTS.MAP_AGENT_STATUS);
      this.commandsMap = await this.client.getMap(CONSTANTS.MAP_AGENT_COMMANDS);

      const initialCommand = await this.commandsMap.get(this.id);
      const startStatus = (initialCommand && initialCommand.cmd === CONSTANTS.CMD_PAUSE) 
          ? CONSTANTS.STATUS_PAUSED 
          : CONSTANTS.STATUS_IDLE;

      this.log(`Agent Online: ${this.id}`, 'system');
      await this.updateStatus(startStatus, CONSTANTS.RESOURCE_NONE, startStatus === CONSTANTS.STATUS_PAUSED ? "SUSPENDED" : "READY");

      this.loop();  
    } catch (err) {  
      console.error(`❌ Agent ${this.id} failed to start:`, err);  
      this.isRunning = false;  
    }  
  }  
  
  async loop() {   
      const cpSubsystem = this.client.getCPSubsystem();
    
      while (this.isRunning) {   
        try {
          if (!this.isRunning) break;

          const command = await this.commandsMap.get(this.id);
          if (command && command.cmd === CONSTANTS.CMD_PAUSE) {
              await this.updateStatus(CONSTANTS.STATUS_PAUSED, CONSTANTS.RESOURCE_NONE, "SUSPENDED");
              if (this.currentLock && this.currentFence) {
                  try { await this.currentLock.unlock(this.currentFence); } catch (e) {}
                  this.currentLock = null;
                  this.currentFence = null;
                  this.emitReleased(this.id);
              }
              await new Promise(r => setTimeout(r, 1000));
              continue; 
          }
          
          if (!this.isRunning) break;

          const isTarget = this.eventBus.state.forcedCandidate === this.id;
          const canAcquire = await this.eventBus.canAgentAcquire(this.id);
          if (!isTarget && !canAcquire) {
              await this.updateStatus(CONSTANTS.STATUS_WAITING, CONSTANTS.RESOURCE_NONE, "WAITING");
              await new Promise(r => setTimeout(r, 1000));
              continue;
          }

          if (!this.isRunning) break;

          const pList = this.eventBus.state.priorityAgents || [];
          const rank = pList.indexOf(this.id);
          const delay = isTarget ? 0 : (rank !== -1 ? rank * 200 : (pList.length * 500 + Math.random() * 500));
          await new Promise(r => setTimeout(r, delay));

          if (!this.isRunning) break;

          const finalCheck = await this.commandsMap.get(this.id);
          if (finalCheck && finalCheck.cmd === CONSTANTS.CMD_PAUSE) continue;

          const currentResourceId = this.eventBus.state.resourceId;
          const lock = await cpSubsystem.getLock(currentResourceId);
          const waitLimit = isTarget ? 1000 : 200;
          
          const acquiredFence = await lock.tryLock(waitLimit);   
            
          if (acquiredFence !== null && acquiredFence !== undefined) {
            if (!this.isRunning) {
                try { await lock.unlock(acquiredFence); } catch (e) {}
                break;
            }

            this.currentLock = lock;
            this.currentFence = acquiredFence;

            this.log(`🔒 Lock Acquired (Fence: ${acquiredFence})`, isTarget ? 'success' : 'info');
            this.emitAcquired(this.id, acquiredFence.toString(), 0);   
            await this.updateStatus(CONSTANTS.STATUS_ACTIVE, currentResourceId, "PROCESSING");
    
            await this.executeTask(isTarget);

            if (this.isRunning) {
                try { await lock.unlock(acquiredFence); } catch (e) {}
            }

            this.currentLock = null;
            this.currentFence = null;
            this.emitReleased(this.id);
            await this.updateStatus(CONSTANTS.STATUS_IDLE, CONSTANTS.RESOURCE_NONE, "IDLE");
            await new Promise(r => setTimeout(r, 800));   
          } else {
            await new Promise(r => setTimeout(r, 500));
          }
        } catch (err) {   
          await new Promise(r => setTimeout(r, 1000));   
        }   
      }   
  }

  async updateStatus(status, resource, activity) {
      if (this.statusMap && this.isRunning) {
          try {
              await this.statusMap.put(this.id, {
                  id: this.id, 
                  status: status || 'idle',
                  resource: resource || 'none',
                  activity: activity || 'INITIALIZING',
                  model: this.config.model || 'Mock',
                  lastUpdated: Date.now()
              });
          } catch (e) {
              console.error(`Status update failed for ${this.id}`, e);
          }
      }
  }

  async executeTask(isTarget) {
    this.log(`🧠 Task Started... (${isTarget ? 'FORCE' : 'NORMAL'})`);
    await new Promise(r => setTimeout(r, 1200)); 
    
    if (isTarget) {
      this.log(`✨ Transfer Success & Resetting Resource`, 'success');
      this.eventBus.state.forcedCandidate = null;
      this.eventBus.state.resourceId = `lock-${Date.now()}`;
      this.eventBus.emitState();
    }
  }

  async stop() {  
    this.isRunning = false;  
    try {
        if (this.statusMap) await this.statusMap.remove(this.id);
        if (this.currentLock && this.currentFence) {
            await this.currentLock.unlock(this.currentFence);
        }
    } catch (e) {}

    if (this.client && this.ownsClient) {
      try { await this.client.shutdown(); } catch (e) {}  
    }  
  }  

  emitAcquired(holder, token, latency) { this.eventBus.emit('agent-acquired', { id: holder, fence: token, latency }); }  
  emitReleased(holder) { this.eventBus.emit('agent-released', { id: holder }); }  
}  
  
module.exports = Agent;