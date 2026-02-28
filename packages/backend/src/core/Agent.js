// src/core/Agent.js
const { v4: uuidv4 } = require('uuid');
const hazelcastManager = require('./HazelcastManager');
const CONSTANTS = require('../config/constants');
const ProviderFactory = require('./providers/ProviderFactory');
const PhysicsEngine = require('./PhysicsEngine');

class Agent {  
  constructor(id, eventBus, config = {}, sharedClient = null) {  
    this.uuid = uuidv4(); 
    this.id = id;
    
    this.eventBus = eventBus;  
    this.config = config; 
    this.client = sharedClient || hazelcastManager.getClient();
    this.isRunning = false;  
    this.provider = null;
    this.currentLock = null;
    this.currentFence = null;
    this.ownsClient = false;
    this.errorCount = 0;

    const idMatch = id.match(/\d+/);
    this.seed = idMatch ? parseInt(idMatch[0]) : Math.floor(Math.random() * 1000);

    this.startTime = Date.now(); 
    this.pausedDuration = 0;
    this.pauseStartedAt = null;
    this.lastUpdateTime = Date.now();

    this.state = {
        status: CONSTANTS.STATUS_IDLE,
        resource: CONSTANTS.RESOURCE_NONE,
        activity: 'INITIALIZING'
    };
  }  

  log(msg, type = 'info') {
    if (this.eventBus && typeof this.eventBus.addLog === 'function') {
        this.eventBus.addLog(this.uuid, msg, type);
    }
  }

  async start() {  
    if (this.isRunning) return;  
    this.isRunning = true;  
  
    try {  
      this.provider = ProviderFactory.create(this.config.provider || 'mock', this.config);
      await this.provider.init().catch(e => console.warn(`[${this.id}] Provider init: ${e.message}`));

      if (!this.client) {
          await hazelcastManager.init();
          this.client = hazelcastManager.getClient();
      }

      this.statusMap = await this.client.getMap(CONSTANTS.MAP_AGENT_STATUS);
      this.commandsMap = await this.client.getMap(CONSTANTS.MAP_AGENT_COMMANDS);

      this.log(`Agent Online: ${this.id}`, 'system');

      this.startTime = Date.now();
      await this.updateStatus(CONSTANTS.STATUS_IDLE, CONSTANTS.RESOURCE_NONE, "READY");

      this.posUpdateTimer = setInterval(() => {
          if (this.isRunning) {
              this.updateStatus(this.state.status, this.state.resource, this.state.activity);
          }
      }, 50);

      this.loop();  
    } catch (err) {  
      console.error(`❌ Agent ${this.id} (${this.uuid}) failed to start:`, err);  
      this.isRunning = false;  
    }  
  }  
  
  async loop() {   
      if (!this.client) return;
      const cpSubsystem = this.client.getCPSubsystem();
    
      while (this.isRunning) {   
        try {
          if (!this.isRunning) break;

          const command = await this.commandsMap.get(this.uuid);
          const isPausedCmd = command && command.cmd === CONSTANTS.CMD_PAUSE;
          const isGlobalStopped = !!this.eventBus.state.globalStop;

          if (isPausedCmd || isGlobalStopped) {
              if (!this.pauseStartedAt) {
                  this.pauseStartedAt = Date.now();
              }

              await this.updateStatus(CONSTANTS.STATUS_PAUSED, CONSTANTS.RESOURCE_NONE, isGlobalStopped ? "GLOBAL_HALT" : "SUSPENDED");
              
              if (this.currentLock && this.currentFence) {
                  try { 
                      await this.currentLock.unlock(this.currentFence); 
                  } catch (e) {}
                  this.currentLock = null;
                  this.currentFence = null;
                  this.emitReleased(this.uuid);
              }
              await new Promise(r => setTimeout(r, 200)); 
              continue; 
          }

          if (this.pauseStartedAt) {
              const pauseEndedAt = Date.now();
              this.pausedDuration += (pauseEndedAt - this.pauseStartedAt);
              this.pauseStartedAt = null; 
              this.state.status = CONSTANTS.STATUS_IDLE;
          }

          const isTarget = this.eventBus.state.forcedCandidate === this.uuid;
          const canAcquire = await this.eventBus.canAgentAcquire(this.uuid);
          
          if (!isTarget && !canAcquire) {
              this.eventBus.emit('agent-waiting', { id: this.uuid });
              await this.updateStatus(CONSTANTS.STATUS_WAITING, CONSTANTS.RESOURCE_NONE, "WAITING");
              await new Promise(r => setTimeout(r, 500));
              continue;
          }

          const pList = this.eventBus.state.priorityAgents || [];
          const rank = pList.indexOf(this.uuid);
          let delay = isTarget ? 0 : (rank !== -1 ? rank * CONSTANTS.PRIORITY_RANK_DELAY : (pList.length * CONSTANTS.NORMAL_BASE_DELAY + Math.random() * 200));

          if (!isTarget && this.eventBus.state.forcedCandidate) {
              delay += 1000;
          }
          await new Promise(r => setTimeout(r, delay));

          const currentResourceId = this.eventBus.state.resourceId;
          const lock = await cpSubsystem.getLock(currentResourceId);
          const waitLimit = isTarget ? CONSTANTS.LOCK_TRY_WAIT_TARGET : CONSTANTS.LOCK_TRY_WAIT_NORMAL;
          
          const acquiredFence = await lock.tryLock(waitLimit);   
            
          if (acquiredFence !== null && acquiredFence !== undefined) {
            this.errorCount = 0;
            this.currentLock = lock;
            this.currentFence = acquiredFence;

            this.log(`🔒 Lock Acquired`, isTarget ? 'success' : 'info');
            this.emitAcquired(this.uuid, acquiredFence.toString(), 0);   
            await this.updateStatus(CONSTANTS.STATUS_ACTIVE, currentResourceId, "PROCESSING");
    
            await this.executeTask(isTarget);

            if (this.isRunning && this.eventBus.state.resourceId === currentResourceId) {
                try { 
                    await lock.unlock(this.currentFence); 
                } catch (e) {}
            }

            this.currentLock = null;
            this.currentFence = null;
            this.emitReleased(this.uuid);
            await this.updateStatus(CONSTANTS.STATUS_IDLE, CONSTANTS.RESOURCE_NONE, "IDLE");
            await new Promise(r => setTimeout(r, 500));   
          } else {
            this.eventBus.emit('agent-waiting', { id: this.uuid });
            await new Promise(r => setTimeout(r, 200));
          }
        } catch (err) {
            await this.handleError(err);
        }   
      }   
  }

  async updateStatus(status, resource, activity) {
      if (this.statusMap && this.isRunning) {
          try {
              const now = Date.now();
              this.state.status = status || this.state.status;
              this.state.resource = resource || this.state.resource;
              this.state.activity = activity || this.state.activity;

              let totalPauseTime = this.pausedDuration;
              if (this.pauseStartedAt) {
                  totalPauseTime += (now - this.pauseStartedAt);
              }

              const activeTime = (now - this.startTime) - totalPauseTime;
              this.lastUpdateTime = now;

              const position = PhysicsEngine.getOrbitPosition(this.uuid, this.seed, activeTime);

              await this.statusMap.put(this.uuid, {
                  uuid: this.uuid,
                  id: this.uuid,
                  displayName: this.id,
                  status: this.state.status,
                  resource: this.state.resource,
                  activity: this.state.activity,
                  model: this.config.model || 'Mock',
                  position: position, 
                  lastUpdated: now
              });
          } catch (e) {}
      }
  }
  
  async handleError(err) {
      this.errorCount++;
      this.log(`⚠️ Runtime Error (${this.errorCount}): ${err.message}`, 'warn');
      await new Promise(r => setTimeout(r, 1000));
  }

  async executeTask(isTarget) {
    await new Promise(r => setTimeout(r, 1000)); 
    if (isTarget) {
      this.eventBus.state.forcedCandidate = null;
      this.eventBus.lockDirector.refreshResourceId();
      this.eventBus.emitState();
    }
  }

  async stop() {  
    this.isRunning = false;  
    if (this.posUpdateTimer) clearInterval(this.posUpdateTimer);
    try {
        if (this.statusMap) await this.statusMap.remove(this.uuid);
        if (this.currentLock && this.currentFence) {
            await this.currentLock.unlock(this.currentFence).catch(() => {});
        }
    } catch (e) {}
  }  

  emitAcquired(holderUuid, token, latency) { 
      this.eventBus.emit('agent-acquired', { id: holderUuid, fence: token, latency }); 
  }  
  emitReleased(holderUuid) { 
      this.eventBus.emit('agent-released', { id: holderUuid }); 
  }  
}  
  
module.exports = Agent;