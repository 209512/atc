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
            resourceId: `traffic-control-lock-${Date.now()}`,
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

        // 매니저 초기화
        this.agentManager = new AgentManager(this);
        this.lockDirector = new LockDirector(this);
        this.policyManager = new PolicyManager(this);

        // 이벤트 리스너 등록
        this.on('agent-acquired', this.handleAgentAcquired.bind(this));
        this.on('agent-released', this.handleAgentReleased.bind(this));
        this.on('agent-collision', this.handleAgentCollision.bind(this));
        this.on('agent-waiting', this.handleAgentWaiting.bind(this));
        this.on('priority-collision', this.handlePriorityCollision.bind(this));
    }

    async init() {
        try {
            await hazelcastManager.init();
            this.sharedClient = hazelcastManager.getClient();
            await this.agentManager.updateAgentPool(2);
        } catch (err) {
            console.error('Failed to initialize ATC Service:', err);
        }
    }

    addLog(agentId, message, type = 'info') {
        const colors = { 
            info: '\x1b[36m', success: '\x1b[32m', warn: '\x1b[33m', 
            critical: '\x1b[31m', system: '\x1b[35m', lock: '\x1b[32;1m' 
        };
        console.log(`${colors[type] || ''}[${agentId}]\x1b[0m ${message}`);

        const logEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            agentId: String(agentId),
            message,
            timestamp: Date.now(),
            type
        };
        this.state.logs.push(logEntry);
        
        if (this.state.logs.length > 200) {
            this.state.logs = this.state.logs.slice(-200);
        }
        this.emitState();
    }

    clearAgentLogs(agentId) {
        const targetId = String(agentId);
        this.state.logs = this.state.logs.filter(log => String(log.agentId) !== targetId);
        this.emitState();
    }

    // --- 위임 로직 ---
    canAgentAcquire(agentId) { return this.policyManager.canAgentAcquire(agentId); }
    async togglePriority(id, enable) { return this.policyManager.togglePriority(id, enable); }
    async updatePriorityOrder(newOrder) { return this.policyManager.updatePriorityOrder(newOrder); }

    async updateAgentPool(count) { return this.agentManager.updateAgentPool(count); }
    
    async terminateAgent(id) { 
        const result = await this.agentManager.terminateAgent(id);
        this.clearAgentLogs(id);
        this.state.activeAgentCount = this.agents.size;
        this.emitState();
        return result;
    }

    async startSimulation(count = 2) { await this.updateAgentPool(count); }
    async renameAgent(oldId, newId) { return this.agentManager.renameAgent(oldId, newId); }
    async pauseAgent(agentId, pause) { return this.agentManager.pauseAgent(agentId, pause); }
    
    async transferLock(id) { return this.lockDirector.transferLock(id); }
    async humanOverride() { return this.lockDirector.humanOverride(); }
    async releaseHumanLock() { return this.lockDirector.releaseHumanLock(); }

    // --- 자체 상태 및 환경 로직 ---
    registerAgentConfig(id, config) {
        console.log(`📋 Registering config for ${id}: ${config.provider}/${config.model}`);
        this.agentConfigs.set(id, config);

        const agent = this.agents.get(id);
        if (agent) {
            if (typeof agent.updateConfig === 'function') {
                agent.updateConfig(config);
            } else {
                agent.model = config.model || agent.model;
                agent.config = { ...agent.config, ...config };
            }
        }
        this.emitState();
    }

    async toggleGlobalStop(enable) {
        this.state.globalStop = enable;
        this.addLog('SYSTEM', `Global stop ${enable ? 'Enabled' : 'Disabled'}`, 'system');
        this.emitState();
    }

    async isAgentPaused(agentId) {
        const client = hazelcastManager.getClient();
        if (!client) return false;
        try {
            const map = await client.getMap(CONSTANTS.MAP_AGENT_COMMANDS);
            const cmd = await map.get(agentId);
            return cmd && cmd.cmd === CONSTANTS.CMD_PAUSE;
        } catch (e) { return false; }
    }

    async getAgentStatus() {
        const client = hazelcastManager.getClient();
        if (!client) return [];
        const map = await client.getMap(CONSTANTS.MAP_AGENT_STATUS);
        const entrySet = await map.entrySet();
        const statusList = [];
        const now = Date.now();

        for (const entry of entrySet) {
            const info = entry[1];
            if (this.agents.has(info.id)) {
                info.priority = this.state.priorityAgents.includes(info.id);
                info.isPaused = await this.isAgentPaused(info.id);
                statusList.push(info);
            } else if (now - info.lastUpdated < 5000) {
                statusList.push(info);
            }
        }
        return statusList.sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true}));
    }

    // --- 이벤트 핸들러 ---
    handleAgentAcquired({ id, fence, latency }) {
        if (this.state.forcedCandidate === id) {
            if (this.lockDirector.transferTimeoutRef) {
                clearTimeout(this.lockDirector.transferTimeoutRef);
                this.lockDirector.transferTimeoutRef = null;
            }
            console.log(`✨ [Service] SUCCESS: ${id} grabbed the transferred lock.`);
            this.addLog(id, `✨ Success: Received Transferred Lock`, 'success');
            this.emit('transfer-success', { id });
            this.state.forcedCandidate = null;
        }

        this.addLog(id, `🔒 Access Granted (Fence: ${fence})`, 'lock');
        this.state.holder = id;
        this.state.fencingToken = fence;
        this.state.latency = latency;
        this.state.timestamp = Date.now();
        this.state.waitingAgents = this.state.waitingAgents.filter(aid => aid !== id);
        this.emitState();
    }

    handleAgentReleased({ id }) {
        this.addLog(id, `🔓 Lock Released`, 'info');
        if (this.state.holder === id) {
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
        this.addLog('POLICY', `🚨 Priority contention occurred!`, 'critical');
        this.emitState();
    }

    handleAgentWaiting({ id }) {
        if (!this.state.waitingAgents.includes(id)) {
            this.addLog(id, `⏳ Waiting in queue...`, 'info');
            this.state.waitingAgents.push(id);
            this.emitState();
        }
    }

    emitState() {
        this.emit('state', { ...this.state });
    }
}

module.exports = new ATCService();