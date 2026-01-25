const { Client } = require('hazelcast-client');  
const getHazelcastConfig = require('../config/hazelcast.config');  
  
class Agent {  
  constructor(id, eventBus) {  
    this.id = id;  
    this.eventBus = eventBus;  
    this.client = null;  
    this.isRunning = false;  
  }  
  
  async start() {  
    if (this.isRunning) return;  
    this.isRunning = true;  
  
    try {  
      console.log(`🤖 Spawning Agent: ${this.id}`);  
      const config = getHazelcastConfig(this.id);  
      this.client = await Client.newHazelcastClient(config);  
      this.stateMap = await this.client.getMap('agent_states'); // Initialize state map
      this.statusMap = await this.client.getMap('agent_status_map');
      this.commandsMap = await this.client.getMap('agent_commands');
      this.loop();  
    } catch (err) {  
      console.error(`❌ Agent ${this.id} failed to start:`, err);  
      this.isRunning = false;  
    }  
  }  
  
  async loop() {   
    console.log(`▶️ Agent ${this.id} entering traffic control loop.`);
    const cpSubsystem = this.client.getCPSubsystem();
    const lock = await cpSubsystem.getLock('traffic-control-lock');   
  
    while (this.isRunning) {   
      try {   
        if (!this.client.lifecycleService.isRunning()) break;

        // 1. Check Global Stop
        if (this.eventBus.state.globalStop) {
             await this.updateStatus("GLOBAL STOP", "None", "System Halted");
             await new Promise(r => setTimeout(r, 1000));
             continue;
        }

        // 2. Check Targeted Pause
        if (this.commandsMap) {
            const cmd = await this.commandsMap.get(this.id);
            if (cmd && cmd.cmd === "PAUSE") {
                await this.updateStatus("PAUSED", "None", "Admin Paused");
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
        }

        // 3. Check Override Signal (Yield)
        if (this.eventBus.state.overrideSignal) {
          await this.updateStatus("WAITING", "None", "Yielding to Human");
          await this.performBackgroundTasks("Yielding to Human");
          await new Promise(r => setTimeout(r, 7000)); // Deep yield
          continue;
        }

        await this.updateStatus("WAITING", "traffic-control-lock", "Queued for Lock");
        this.emitWaiting(this.id);   
        
        // [Refactor] Use lease time: tryLock(wait=5000, lease=10000)
        const acquired = await lock.tryLock(5000, 10000);   
          
        if (acquired) {   
          // Smart Recovery Check
          if (this.stateMap) {
             const savedContext = await this.stateMap.get('global_task_context');
             if (savedContext) {
                console.log(`🤖 [${this.id}] Found interrupted task. Resuming from [${savedContext}]...`);
                await this.stateMap.remove('global_task_context');
             }
          }

          console.log(`🔒 [${this.id}] Access Granted`);   
          // [수정] UI에 토큰 대신 ACTIVE 상태 전달
          this.emitAcquired(this.id, "ACTIVE", 0);   
          await this.updateStatus("ACTIVE", "traffic-control-lock", "Optimizing signal timing...");
  
          // Simulate Work with Interrupt Check
          const yielded = await this.simulateWorkOrYield(lock);
          if (yielded) {
             await this.performBackgroundTasks("Handing over to Human");
             await new Promise(r => setTimeout(r, 7000));
             continue;
          }
  
          try {  
            // [분석 반영] 인자 없이 unlock() 호출하여 타입 에러 원천 차단
            // SDK warning "Fencing token should be of type Long" fix: pass no args or handle inside lib
            await lock.unlock();   
            console.log(`🔓 [${this.id}] Access Released.`);   
          } catch (unlockErr) {  
            // SDK 버그로 인한 메시지 출력 시에도 루프는 유지
            console.warn(`⚠️ [${this.id}] Unlock notice: ${unlockErr.message}`);  
          } finally {
            this.emitReleased(this.id);
            await this.updateStatus("IDLE", "None", "Monitoring");
          }
            
          await new Promise(r => setTimeout(r, 500));   
        } else {   
          // Productive Idle
          await this.updateStatus("IDLE", "None", "Performing background analysis...");
          await this.performBackgroundTasks("No lock acquired");
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
              await this.statusMap.put(this.id, {
                  id: this.id,
                  status,
                  resource,
                  activity,
                  lastUpdated: Date.now()
              });
          } catch (e) {
              // ignore map errors
          }
      }
  }  

  async performBackgroundTasks(reason) {
     // Throttle logs
     const now = Date.now();
     if (!this.lastTaskTime || now - this.lastTaskTime > 4000) {
        console.log(`📊 [${this.id}] ${reason}. Performing background analysis...`);
        this.lastTaskTime = now;
     }
     // Simulate CPU work
     await new Promise(r => setTimeout(r, 200));
  }

  async simulateWorkOrYield(lock) {
     for (let i = 0; i < 4; i++) { // 4 * 500ms = 2s
        if (this.eventBus.state.overrideSignal) {
            console.log(`⚠️ [${this.id}] Override detected! Saving context and yielding...`);
            if (this.stateMap) {
                await this.stateMap.put('global_task_context', `Task-by-${this.id}-Step-${i}`);
            }
            try {
                await lock.unlock();
            } catch (e) {
                console.warn(`Force unlock failed: ${e.message}`);
            }
            this.emitReleased(this.id);
            return true; // Yielded
        }
        await new Promise(r => setTimeout(r, 500));
     }
     return false; // Completed
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
    if (this.client) {
      try {  
        await this.client.shutdown();
      } catch (e) {
        // Ignore shutdown errors
      }  
    }  
  }  
}  
  
module.exports = Agent;