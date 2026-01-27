const { Client } = require('hazelcast-client');  
const getHazelcastConfig = require('../config/hazelcast.config');  
const CONSTANTS = require('../config/constants');
const ProviderFactory = require('./providers/ProviderFactory');

class Agent {  
  constructor(id, eventBus, config = {}, sharedClient = null) {  
    this.id = id;  
    this.eventBus = eventBus;  
    this.config = config; // { provider: 'openai', apiKey: '...', model: '...', systemPrompt: '...' }
    this.client = sharedClient; // Shared Client Injection
    this.isRunning = false;  
    this.provider = null;
  }  
  
  updateConfig(newConfig) {
    console.log(`🤖 [${this.id}] Configuration updated:`, JSON.stringify(newConfig, (k,v) => k==='apiKey'?'***':v));
    this.config = { ...this.config, ...newConfig };
    // Re-initialize provider if type/key changed
    if (this.config.provider || this.config.apiKey) {
        this.provider = ProviderFactory.create(this.config.provider || 'mock', this.config);
        this.provider.init().catch(err => console.error(`Provider Init Error for ${this.id}:`, err));
    }
  }

  async start() {  
    if (this.isRunning) return;  
    this.isRunning = true;  
  
    try {  
      console.log(`🤖 Spawning Agent: ${this.id}`);  
      
      // Initialize LLM Provider
      this.provider = ProviderFactory.create(this.config.provider || 'mock', this.config);
      await this.provider.init().catch(e => console.warn(`Provider init warning: ${e.message}`));

      if (!this.client) {
          // Fallback if no shared client (should not happen in optimized mode)
          const config = getHazelcastConfig(this.id);  
          this.client = await Client.newHazelcastClient(config);  
          this.ownsClient = true;
      }

      this.stateMap = await this.client.getMap(CONSTANTS.MAP_AGENT_STATES); 
      this.statusMap = await this.client.getMap(CONSTANTS.MAP_AGENT_STATUS);
      this.commandsMap = await this.client.getMap(CONSTANTS.MAP_AGENT_COMMANDS);
      this.loop();  
    } catch (err) {  
      console.error(`❌ Agent ${this.id} failed to start:`, err);  
      this.isRunning = false;  
    }  
  }  
  
  async loop() {   
    console.log(`▶️ Agent ${this.id} entering traffic control loop.`);
    const cpSubsystem = this.client.getCPSubsystem();
    const lock = await cpSubsystem.getLock(CONSTANTS.LOCK_NAME);   
  
    while (this.isRunning) {   
      try {   
        if (!this.client.lifecycleService.isRunning()) break;

        // 1. Check Global Stop
        if (this.eventBus.state.globalStop) {
             await this.updateStatus(CONSTANTS.STATUS_GLOBAL_STOP, CONSTANTS.RESOURCE_NONE, "System Halted");
             await new Promise(r => setTimeout(r, CONSTANTS.AGENT_LOOP_DELAY));
             continue;
        }

        // 2. Check Targeted Pause
        if (this.commandsMap) {
            const cmd = await this.commandsMap.get(this.id);
            if (cmd && cmd.cmd === CONSTANTS.CMD_PAUSE) {
                await this.updateStatus(CONSTANTS.STATUS_PAUSED, CONSTANTS.RESOURCE_NONE, "Admin Paused");
                await new Promise(r => setTimeout(r, CONSTANTS.AGENT_LOOP_DELAY));
                continue;
            }
        }

        // 3. Check Override Signal (Yield)
        if (this.eventBus.state.overrideSignal) {
          await this.updateStatus(CONSTANTS.STATUS_WAITING, CONSTANTS.RESOURCE_NONE, "Yielding to Human");
          await this.performBackgroundTasks("Yielding to Human");
          await new Promise(r => setTimeout(r, CONSTANTS.AGENT_YIELD_DELAY)); 
          continue;
        }

        // [New] Pre-Lock Admin Check: Double check before attempting lock
        if (this.eventBus.state.overrideSignal) {
             await new Promise(r => setTimeout(r, 1000));
             continue;
        }

        await this.updateStatus(CONSTANTS.STATUS_WAITING, CONSTANTS.LOCK_NAME, "Queued for Lock");
        this.emitWaiting(this.id);   
        
        // [New] Throttled Resume: Stagger lock attempts
        const throttleDelay = Math.floor(Math.random() * 500); // 0-500ms jitter
        await new Promise(r => setTimeout(r, throttleDelay));

        // [OPTIMIZATION] Check if lock is held by ANYONE locally via EventBus before hitting network
        // This prevents re-entrancy if sharing client and reduces network chatter
        if (this.eventBus.state.holder) {
            // Someone holds it. Since we share client, tryLock might succeed (reentrant)
            // so we MUST NOT attempt if we know it's held by another agent ID.
            if (this.eventBus.state.holder !== this.id) {
                this.emitCollision();
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
        }

        // [Fixed] Capture fencing token (Long) from tryLock
        const acquiredFence = await lock.tryLock(5000, 10000);   
          
        if (acquiredFence) {   
          // Recovery
          if (this.stateMap) {
             const savedContext = await this.stateMap.get('global_task_context');
             if (savedContext) {
                console.log(`🤖 [${this.id}] Found interrupted task. Resuming...`);
                await this.stateMap.remove('global_task_context');
             }
          }

          console.log(`🔒 [${this.id}] Access Granted (Fence: ${acquiredFence})`);   
          
          // [CRITICAL] Immediate Override Check after acquiring lock
          if (this.eventBus.state.overrideSignal) {
             console.log(`⚠️ [${this.id}] Override detected immediately after lock! Yielding...`);
             await this.yieldLock(lock, acquiredFence, 'Immediate Yield');
             continue;
          }

          this.emitAcquired(this.id, CONSTANTS.STATUS_ACTIVE, 0);   
          await this.updateStatus(CONSTANTS.STATUS_ACTIVE, CONSTANTS.LOCK_NAME, "Processing Task...");
  
          // Execute Intelligent Task
          const yielded = await this.executeTaskOrYield(lock, acquiredFence);

          if (yielded) {
             await this.performBackgroundTasks("Handing over to Human");
             await new Promise(r => setTimeout(r, CONSTANTS.AGENT_YIELD_DELAY));
             continue;
          }
  
          try {  
            // [Fixed] Pass fencing token to unlock
            await lock.unlock(acquiredFence);   
            console.log(`🔓 [${this.id}] Access Released.`);   
          } catch (unlockErr) {  
            console.warn(`⚠️ [${this.id}] Unlock notice: ${unlockErr.message}`);  
          } finally {
            this.emitReleased(this.id);
            await this.updateStatus(CONSTANTS.STATUS_IDLE, CONSTANTS.RESOURCE_NONE, "Monitoring");
          }
            
          await new Promise(r => setTimeout(r, 500));   
        } else {   
          // Productive Idle
          await this.updateStatus(CONSTANTS.STATUS_IDLE, CONSTANTS.RESOURCE_NONE, "Idle / Analysis");
          this.emitCollision();   
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));   
        }   
      } catch (err) {   
        if (err.message && err.message.includes('ClientNotActive')) {
            break;
        }
        console.warn(`♻️ [${this.id}] Loop error: ${err.message}`);   
        this.emitReleased(this.id);   
        await new Promise(r => setTimeout(r, 2000));   
      }   
    }   
  }

  async updateStatus(status, resource, activity) {
      if (this.statusMap) {
          try {
              // Use provider name if model is not set, to confirm hot-swap
              const displayModel = this.config.model || this.config.provider || 'Mock';
              await this.statusMap.put(this.id, {
                  id: this.id,
                  status,
                  resource,
                  activity,
                  model: displayModel,
                  lastUpdated: Date.now()
              });
          } catch (e) {}
      }
  }  

  async performBackgroundTasks(reason) {
     const now = Date.now();
     if (!this.lastTaskTime || now - this.lastTaskTime > 4000) {
        this.lastTaskTime = now;
     }
     await new Promise(r => setTimeout(r, 200));
  }

  async executeTaskOrYield(lock, fence) {
     // 1. Check for override
     if (this.eventBus.state.overrideSignal) {
         return await this.yieldLock(lock, fence, 'Pre-computation yield');
     }

     // 2. Perform LLM Call
     const taskPrompt = `Current time is ${new Date().toISOString()}. Analyze traffic patterns and suggest optimal routing.`;
     console.log(`🧠 [${this.id}] Generating response using ${this.config.provider || 'Mock'}...`);
     
     const response = await this.provider.generateResponse(taskPrompt, this.config.systemPrompt);
     
     console.log(`📝 [${this.id}] Output: ${response.substring(0, 50)}...`);
     
     // 3. Simulate processing time
     await new Promise(r => setTimeout(r, 1000));

     // 4. Check for override again
     if (this.eventBus.state.overrideSignal) {
        return await this.yieldLock(lock, fence, 'Post-computation yield');
     }

     return false; // Completed successfully
  }

  async yieldLock(lock, fence, context) {
      console.log(`⚠️ [${this.id}] Override! Yielding (${context})...`);
      if (this.stateMap) {
          await this.stateMap.put('global_task_context', `Interrupted: ${this.id} at ${context}`);
      }
      try { await lock.unlock(fence); } catch (e) { console.warn(`Force unlock failed: ${e.message}`); }
      this.emitReleased(this.id);
      return true;
  }
  
  emitAcquired(holder, token, latency) {  
    this.eventBus.emit('agent-acquired', { id: holder, fence: token, latency });  
  }  
  
  emitReleased(holder) {  
    this.eventBus.emit('agent-released', { id: holder });  
  }  
  
  emitCollision() {  
    this.eventBus.emit('agent-collision');  
  }  
    
  emitWaiting(id) {  
    this.eventBus.emit('agent-waiting', { id });  
  }  
  
  async stop() {  
    this.isRunning = false;  
    if (this.client && this.ownsClient) {
      try { await this.client.shutdown(); } catch (e) {}  
    }  
  }  
}  
  
module.exports = Agent;
