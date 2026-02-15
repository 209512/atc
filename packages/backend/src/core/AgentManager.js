const Agent = require('./Agent');
const CONSTANTS = require('../config/constants');
const hazelcastManager = require('./HazelcastManager');

class AgentManager {
    constructor(atcService) {
        this.atcService = atcService;
        this.scalingInProgress = false;
        this.updateTimeout = null;
    }

    async updateAgentPool(targetCount) {
        if (targetCount > 10) targetCount = 10;
        if (this.updateTimeout) clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            this._executeScaling(targetCount);
        }, 300);
    }

    async _executeScaling(targetCount) {
        if (this.scalingInProgress) return;
        this.scalingInProgress = true;

        try {
            const priorityIds = this.atcService.state.priorityAgents || [];
            const currentAgents = Array.from(this.atcService.agents.values());
            const currentCount = currentAgents.length;

            if (currentCount > targetCount) {
                const removable = currentAgents
                    .filter(a => !priorityIds.includes(a.id))
                    .sort((a, b) => {
                        const numA = parseInt(a.id.split('-')[1]) || 0;
                        const numB = parseInt(b.id.split('-')[1]) || 0;
                        return numB - numA;
                    });

                const toRemove = removable.slice(0, currentCount - targetCount);
                await Promise.all(toRemove.map(a => this.terminateAgent(a.id)));
            } 
            else if (currentCount < targetCount) {
                const tasks = [];
                let needed = targetCount - currentCount;
                let candidateNum = 1;

                while (tasks.length < needed && candidateNum <= 50) {
                    const id = `Agent-${candidateNum}`;
                    if (!this.atcService.agents.has(id)) {
                        tasks.push(this._spawnAgent(id));
                    }
                    candidateNum++;
                }
                await Promise.all(tasks);
            }
        } finally { 
            this.scalingInProgress = false; 
            this.atcService.state.activeAgentCount = this.atcService.agents.size;
            this.atcService.emitState();
        }
    }

    async _spawnAgent(id, config = null) {
        const finalConfig = config || { provider: 'mock', model: 'simulation-v1' };
        const agent = new Agent(id, this.atcService, finalConfig, this.atcService.sharedClient);
        this.atcService.agents.set(id, agent);
        this.atcService.agentConfigs.set(id, finalConfig);
        await agent.start();
    }

    async terminateAgent(id) {
        const agent = this.atcService.agents.get(id);
        if (agent) {
            this.atcService.clearAgentLogs(id);
            this.atcService.agents.delete(id);
            this.atcService.agentConfigs.delete(id);
            await agent.stop();
            
            this.atcService.state.priorityAgents = (this.atcService.state.priorityAgents || []).filter(aid => aid !== id);
            this.atcService.state.activeAgentCount = this.atcService.agents.size;
            await this.pauseAgent(id, false);
        }
    }

    async renameAgent(oldId, newId) {
        if (!this.atcService.agents.has(oldId)) return false;
        
        const oldAgent = this.atcService.agents.get(oldId);
        const config = this.atcService.agentConfigs.get(oldId) || oldAgent.config;
        const wasPaused = await this.atcService.isAgentPaused(oldId);
        const wasPriority = this.atcService.state.priorityAgents.includes(oldId);

        if (wasPaused) {
            await this.pauseAgent(newId, true);
        }

        if (wasPriority) {
            this.atcService.state.priorityAgents = this.atcService.state.priorityAgents.map(id => id === oldId ? newId : id);
        }

        await oldAgent.stop(); 
        this.atcService.agents.delete(oldId);
        this.atcService.agentConfigs.delete(oldId);
        this.atcService.clearAgentLogs(oldId);

        await this._spawnAgent(newId, config);

        if (this.atcService.state.holder === oldId) {
            this.atcService.state.holder = newId;
        }

        this.atcService.emitState();
        return true;
    }

    async pauseAgent(agentId, pause) {
        const client = hazelcastManager.getClient();
        if (client) {
            try {
                const map = await client.getMap(CONSTANTS.MAP_AGENT_COMMANDS);
                if (pause) {
                    await map.put(agentId, { cmd: CONSTANTS.CMD_PAUSE });
                } else {
                    await map.remove(agentId);
                }
            } catch (err) {
                console.error(`[AgentManager] Failed to pauseAgent for ${agentId}:`, err);
            }
        }
    }
}

module.exports = AgentManager;