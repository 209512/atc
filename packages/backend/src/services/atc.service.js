const { Client } = require('hazelcast-client');
const { EventEmitter } = require('events');
require('dotenv').config({ path: '../../.env' });

class ATCService extends EventEmitter {
  constructor() {
    super();
    this.adminClient = null;
    this.agentClients = [];
    this.isRunning = false;
    this.mockMode = false; // Add mock mode flag
    this.state = {
      resourceId: 'atc-lock',
      holder: null,
      collisionCount: 0,
      overrideSignal: false,
      fencingToken: null,
      latency: 0,
      timestamp: Date.now()
    };
  }

  // Common config for local connection
  getCommonConfig(name) {
    return {
      clusterName: 'dev',
      instanceName: name,
      network: {
        clusterMembers: ['127.0.0.1:5701'],
        connectionTimeout: 2000 // Fast fail
      },
      connectionStrategy: {
        connectionRetry: {
          clusterConnectTimeoutMillis: 2000, // 2 seconds total timeout
          maxBackoffMillis: 1000,
          initialBackoffMillis: 500,
          multiplier: 1,
          jitter: 0
        }
      }
    };
  }

  async init() {
    try {
      const config = this.getCommonConfig('ATC-Admin');
      console.log('Initializing Admin Client...');
      
      this.adminClient = await Client.newHazelcastClient(config);
      this.cpSubsystem = this.adminClient.getCPSubsystem();
      
      // 로그에서 확인된 v5.3 Node.js 표준 메서드명 사용
      this.sessionService = this.cpSubsystem.getCPSessionManager();
      
      this.map = await this.adminClient.getMap('atc-metadata');

      console.log('✅ Admin Client Connected and CP Subsystem Ready.');
      this.emitState();
    } catch (err) {
      console.error('❌ Failed to init ATC:', err.message);
      console.warn('⚠️ Switching to MOCK MODE due to connection failure.');
      this.mockMode = true;
      this.emitState();
    }
  }

  async startSimulation(agentCount = 2) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`🚀 Starting Simulation with ${agentCount} agents...`);

    if (this.mockMode) {
        this.startMockSimulation(agentCount);
        return;
    }

    for (let i = 0; i < agentCount; i++) {
      const agentId = `Agent-${i + 1}`;
      await this.spawnAgent(agentId);
    }
  }

  // Mock Simulation Logic
  startMockSimulation(agentCount) {
      for (let i = 0; i < agentCount; i++) {
          const agentId = `Agent-${i + 1}`;
          this.mockAgentLoop(agentId);
      }
  }

  async mockAgentLoop(agentId) {
      console.log(`▶️ [Mock] ${agentId} loop started.`);
      while (this.isRunning) {
          await new Promise(r => setTimeout(r, Math.random() * 2000 + 500));
          
          if (this.state.overrideSignal) continue; // Pause if human override is active

          // Try to acquire lock (Mock)
          if (this.state.holder === null) {
              const start = Date.now();
              // Simulate race condition check
              if (this.state.holder === null) {
                  this.state.holder = agentId;
                  this.state.fencingToken = Math.floor(Math.random() * 10000).toString();
                  this.state.latency = Date.now() - start;
                  this.state.timestamp = Date.now();
                  this.emitState();

                  console.log(`🔒 [Mock] ${agentId} Acquired lock.`);

                  // Hold time
                  await new Promise(r => setTimeout(r, 2000));

                  // Release if still holding
                  if (this.state.holder === agentId) {
                      this.state.holder = null;
                      this.state.fencingToken = null;
                      console.log(`🔓 [Mock] ${agentId} Released lock.`);
                      this.emitState();
                  }
              } else {
                  this.state.collisionCount++;
                  this.emitState();
              }
          } else {
              this.state.collisionCount++;
              this.emitState();
          }
      }
  }

  async spawnAgent(agentId) {
    const config = this.getCommonConfig(agentId);
    try {
      console.log(`Spawning ${agentId}...`);
      const client = await Client.newHazelcastClient(config);
      this.agentClients.push(client);
      this.agentLoop(client, agentId);
    } catch (err) {
      console.error(`Failed to spawn ${agentId}:`, err);
    }
  }

  async agentLoop(client, agentId) {
    console.log(`▶️ [${agentId}] 루프 진입 성공!`);
    const cp = client.getCPSubsystem();
    const lock = await cp.getLock('atc-lock');
    const map = await client.getMap('atc-metadata');

    while (this.isRunning) {
      try {
        await new Promise(r => setTimeout(r, Math.random() * 2000 + 500));
        const start = Date.now();

        // Try to acquire lock
        const acquired = await lock.tryLock();

        if (acquired) {
          try {
            const latency = Date.now() - start;
            let token = 'N/A';
            if (typeof lock.getFence === 'function') {
                token = lock.getFence();
            } else if (typeof lock.getFencingToken === 'function') {
                token = lock.getFencingToken();
            } else if (acquired && typeof acquired === 'object' && acquired.fence) {
                // If tryLock returns an object with fence
                token = acquired.fence;
            } else {
                 // Fallback: Use tryLock return value if it's not just a boolean true
                 if (acquired !== true) token = acquired;
            }

            this.state.holder = agentId;
            this.state.fencingToken = token.toString();
            this.state.latency = latency;
            this.state.timestamp = Date.now();
            this.emitState();

            // Write metadata for Admin identification
            await map.put('current-holder', { agentId, timestamp: Date.now() });
            console.log(`🔒 [${agentId}] Acquired lock. Token: ${token}`);

            await new Promise(r => setTimeout(r, 2000)); // Hold time
          } finally {
            if (await lock.isLockedByCurrentThread()) {
               await lock.unlock();
               console.log(`🔓 [${agentId}] Released lock.`);
               this.state.holder = null;
               this.state.fencingToken = null;
               this.emitState();
               await map.remove('current-holder');
            }
          }
        } else {
          this.state.collisionCount++;
          this.emitState();
        }
      } catch (err) {
        if (err.name === 'LockOwnershipLostException' || (err.message && err.message.includes('Session'))) {
           console.warn(`⚠️ [${agentId}] Lock/Session lost (possibly overridden): ${err.message}`);
           break; 
        }
        console.error(`Error in loop for ${agentId}:`, err.message);
      }
    }
  }

  async humanOverride() {
    if (this.mockMode) {
        console.log('🚨 [Mock] Initiating Override...');
        this.state.overrideSignal = true;
        this.emitState();
        
        // Mock Force Unlock
        if (this.state.holder && this.state.holder !== 'Human') {
            console.log(`[Mock] Force closing session for ${this.state.holder}`);
            this.state.holder = null; // Force release
        }

        this.state.holder = 'Human';
        this.state.fencingToken = 'MOCK-ADMIN-TOKEN';
        this.state.overrideSignal = false;
        this.emitState();
        return { success: true, message: 'Mock Override Successful' };
    }

    if (!this.adminClient) return { success: false, message: 'Initializing...' };

    console.log('🚨 [Human] Initiating Override...');
    this.state.overrideSignal = true;
    this.emitState();

    const lock = await this.cpSubsystem.getLock('atc-lock');
    const groupId = lock.getGroupId();
    
    try {
      // 1. Force close CP sessions (Linearizability guarantee)
      const sessions = await this.sessionService.getAllSessions(groupId);
      for (const sess of sessions) {
        await this.sessionService.forceCloseSession(groupId, sess.id);
      }

      // 2. Acquire immediately as Admin
      await lock.lock();
      this.state.holder = 'Human';
      this.state.fencingToken = lock.getFence().toString();
      this.state.overrideSignal = false;
      this.emitState();
      
      return { success: true, message: 'Human Override Successful' };
    } catch (e) {
      console.error("Override error:", e);
      this.state.overrideSignal = false;
      this.emitState();
      return { success: false, message: e.message };
    }
  }
  
  async releaseHumanLock() {
     if (this.mockMode) {
         console.log('[Mock] Released lock.');
         this.state.holder = null;
         this.emitState();
         return;
     }

     const lock = await this.cpSubsystem.getLock('atc-lock');
     lock.unlock().then(() => {
         this.state.holder = null;
         this.emitState();
     }).catch(e => console.error(e));
  }

  emitState() {
    this.emit('state', { ...this.state });
  }
}

module.exports = new ATCService();
