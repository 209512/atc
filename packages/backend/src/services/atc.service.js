// src/services/atc.service.js
const { EventEmitter } = require('events');
const hazelcastManager = require('../core/HazelcastManager');
const AgentManager = require('../core/AgentManager');
const LockDirector = require('../core/LockDirector');
const PolicyManager = require('../core/PolicyManager');
const CONSTANTS = require('../config/constants');

class ATCService extends EventEmitter {
    constructor() {
        super();
        this.agents = new Map();
        this.agentConfigs = new Map();

        this.state = {
            resourceId: `${CONSTANTS.LOCK_NAME}-${Date.now()}`,
            holder: null,
            waitingAgents: [],
            logs: [],
            collisionCount: 0,
            overrideSignal: false,
            fencingToken: null,
            latency: 0,
            activeAgentCount: 0,
            timestamp: Date.now(),
            globalStop: false,
            priorityAgents: [],
            forcedCandidate: null
        };

        this.agentManager = new AgentManager(this);
        this.lockDirector = new LockDirector(this);
        this.policyManager = new PolicyManager(this);

        this._setupEventListeners();
    }

    async init() {
        try {
            console.log('🚀 [ATC-Service] Starting initialization...');
            await hazelcastManager.init();
            this.sharedClient = hazelcastManager.getClient();
            
            await this.agentManager.updateAgentPool(2);
            console.log('✅ [ATC-Service] Successfully initialized.');
        } catch (err) {
            console.error('❌ [ATC-Service] Initialization failed:', err);
        }
        setInterval(() => {
            if (this.agents.size > 0) {
                this.emitState(); 
            }
        }, 100);
    }

    _setupEventListeners() {
        this.on('agent-acquired', this.handleAgentAcquired.bind(this));
        this.on('agent-released', this.handleAgentReleased.bind(this));
        this.on('agent-collision', this.handleAgentCollision.bind(this));
        this.on('agent-waiting', this.handleAgentWaiting.bind(this));
        this.on('priority-collision', this.handlePriorityCollision.bind(this));
    }

    addLog(agentId, message, type = 'info') {
        const colors = { 
            info: '\x1b[36m', success: '\x1b[32m', warn: '\x1b[33m', 
            critical: '\x1b[31m', system: '\x1b[35m', lock: '\x1b[32;1m', policy: '\x1b[34m' 
        };

        const agent = this.agents.get(agentId);
        const displayName = agent ? agent.id : (['SYSTEM', 'POLICY', 'NETWORK', 'ADMIN'].includes(agentId) ? agentId : agentId);
        console.log(`${colors[type] || ''}[${displayName}]\x1b[0m ${message}`);

        const logEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            agentId: String(agentId),
            agentName: displayName,
            message,
            timestamp: Date.now(),
            type
        };

        this.state.logs = [...(this.state.logs || []), logEntry].slice(-200);
        
        this.emitState();
    }

    clearAgentLogs(agentId) {
        const targetId = String(agentId);
        this.state.logs = this.state.logs.filter(log => String(log.agentId) !== targetId);
        this.emitState();
    }

    canAgentAcquire(uuid) { return this.policyManager.canAgentAcquire(uuid); }
    async togglePriority(uuid, enable) { return this.policyManager.togglePriority(uuid, enable); }
    async updatePriorityOrder(newOrder) { return this.policyManager.updatePriorityOrder(newOrder); }

    async updateAgentPool(count) { return this.agentManager.updateAgentPool(count); }
    async startSimulation(count = 2) { await this.updateAgentPool(count); }
    async renameAgent(uuid, newName) { return this.agentManager.renameAgent(uuid, newName); }
    async pauseAgent(uuid, pause) { return this.agentManager.pauseAgent(uuid, pause); }
    
    async terminateAgent(uuid) { 
        const result = await this.agentManager.terminateAgent(uuid);
        this.clearAgentLogs(uuid);
        this.state.activeAgentCount = this.agents.size;
        this.emitState();
        return result;
    }

    async transferLock(uuid) { return this.lockDirector.transferLock(uuid); }
    async humanOverride() { return this.lockDirector.humanOverride(); }
    async releaseHumanLock() { return this.lockDirector.releaseHumanLock(); }

    registerAgentConfig(uuid, config) {
        console.log(`📋 Registering config for ${uuid}: ${config.provider}/${config.model}`);
        this.agentConfigs.set(uuid, config);

        const agent = this.agents.get(uuid);
        if (agent) {
            agent.config = { ...agent.config, ...config };
            if (config.model) agent.model = config.model;
        }
        this.emitState();
    }

    async toggleGlobalStop(enable) {
        this.state.globalStop = enable;
        this.addLog('SYSTEM', `Global stop ${enable ? 'Enabled' : 'Disabled'}`, 'system');
        this.emitState();
    }

    async isAgentPaused(uuid) {
        if (!this.sharedClient) return false;
        try {
            const map = await this.sharedClient.getMap(CONSTANTS.MAP_AGENT_COMMANDS);
            const cmd = await map.get(uuid);
            return cmd && cmd.cmd === CONSTANTS.CMD_PAUSE;
        } catch (e) { 
            return false; 
        }
    }

    async getAgentStatus() {
        if (!this.sharedClient) return [];
        try {
            const map = await this.sharedClient.getMap(CONSTANTS.MAP_AGENT_STATUS);
            const entrySet = await map.entrySet();
            const statusList = [];
            const now = Date.now();

            for (const [uuid, info] of entrySet) {
                if (this.agents.has(uuid) || (now - info.lastUpdated < 5000)) {
                    info.id = info.uuid; 

                    const agentObj = this.agents.get(uuid);
                    info.displayName = agentObj ? agentObj.id : (info.displayName || info.id);
                    
                    info.priority = (this.state.priorityAgents || []).includes(uuid);
                    info.isPaused = await this.isAgentPaused(uuid);
                    statusList.push(info);
                }
            }
            return statusList.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', undefined, {numeric: true}));
        } catch (e) {
            console.error('Failed to get agent status:', e);
            return [];
        }
    }

    handleAgentAcquired({ id, fence, latency }) {
        const uuid = id; 
        if (this.state.forcedCandidate === uuid) {
            if (this.lockDirector.transferTimeoutRef) {
                clearTimeout(this.lockDirector.transferTimeoutRef);
                this.lockDirector.transferTimeoutRef = null;
            }
            this.addLog(uuid, `✨ Success: Received Transferred Lock`, 'success');
            this.emit('transfer-success', { id: uuid });
            this.state.forcedCandidate = null;
        }

        this.addLog(uuid, `🔒 Access Granted (Fence: ${fence})`, 'lock');
        this.state.holder = uuid;
        this.state.fencingToken = fence;
        this.state.latency = latency;
        this.state.timestamp = Date.now();
        this.state.waitingAgents = (this.state.waitingAgents || []).filter(uid => uid !== uuid);
        this.emitState();
    }

    handleAgentReleased({ id }) {
        const uuid = id;
        this.addLog(uuid, `🔓 Lock Released`, 'info');
        if (this.state.holder === uuid) {
            this.state.holder = null;
            this.state.fencingToken = null;
        }
        this.emitState();
    }

    handleAgentCollision() {
        this.state.collisionCount++;
        this.addLog('NETWORK', `⚠️ Collision detected!`, 'warn');
        this.emitState();
    }

    handlePriorityCollision() {
        this.state.collisionCount++;
        this.state.priorityCollisionTrigger = Date.now();
        this.addLog('POLICY', `🚨 Priority Contention`, 'policy');
        this.emitState();
    }

    handleAgentWaiting({ id }) {
        const uuid = id;
        const currentHolder = this.state.holder;
        const pList = this.state.priorityAgents || [];

        if (currentHolder && currentHolder !== uuid) {
            const holderAgent = this.agents.get(currentHolder);
            const holderName = holderAgent ? holderAgent.id : (currentHolder === 'Human (Admin)' ? 'ADMIN' : currentHolder);

            if (pList.includes(currentHolder) && !pList.includes(uuid)) {
                this.addLog(uuid, `🚫 BLOCKED_BY: [${holderName}]`, 'policy');
                this.handlePriorityCollision();
            } 
            else {
                if (!(this.state.waitingAgents || []).includes(uuid)) {
                   this.addLog(uuid, `⚔️ WAIT_FOR: [${holderName}]`, 'warn');
                }
            }
        }

        if (!(this.state.waitingAgents || []).includes(uuid)) {
            this.addLog(uuid, `⏳ Waiting in queue...`, 'info');
            if (!this.state.waitingAgents) this.state.waitingAgents = [];
            this.state.waitingAgents.push(uuid);
            this.emitState();
        }
    }

    emitState() {
        this.emit('state', { ...this.state });
    }
}

module.exports = new ATCService();