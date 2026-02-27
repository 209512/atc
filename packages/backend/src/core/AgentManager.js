// src/core/AgentManager.js
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
        if (targetCount > CONSTANTS.MAX_AGENT_COUNT) targetCount = CONSTANTS.MAX_AGENT_COUNT;
        
        if (this.updateTimeout) clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            this._executeScaling(targetCount);
        }, CONSTANTS.UPDATE_POOL_DELAY);
    }

    async _executeScaling(targetCount) {
        if (this.scalingInProgress) return;
        this.scalingInProgress = true;

        try {
            const priorityUuids = this.atcService.state.priorityAgents || [];
            const currentAgents = Array.from(this.atcService.agents.values());
            const currentCount = currentAgents.length;

            if (currentCount > targetCount) {
                const removable = currentAgents
                    .filter(a => !priorityUuids.includes(a.uuid))
                    .sort((a, b) => {
                        const numA = parseInt(a.id.match(/\d+/)?.[0]) || 0;
                        const numB = parseInt(b.id.match(/\d+/)?.[0]) || 0;
                        return numB - numA;
                    });

                const toRemove = removable.slice(0, currentCount - targetCount);
                await Promise.all(toRemove.map(a => this.terminateAgent(a.uuid)));
            } 
            else if (currentCount < targetCount) {
                const tasks = [];
                let needed = targetCount - currentCount;
                let candidateNum = 1;

                const currentNames = currentAgents.map(a => a.id);
                while (tasks.length < needed && candidateNum <= CONSTANTS.MAX_CANDIDATE_NUMBER) {
                    const name = `Agent-${candidateNum}`;
                    if (!currentNames.includes(name)) {
                        tasks.push(this._spawnAgent(name));
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

    async _spawnAgent(name, config = null) {
        const finalConfig = config || { provider: 'mock', model: 'simulation-v1' };
        const agent = new Agent(name, this.atcService, finalConfig, this.atcService.sharedClient);

        this.atcService.agents.set(agent.uuid, agent);
        this.atcService.agentConfigs.set(agent.uuid, finalConfig);
        
        await agent.start();
    }

    async terminateAgent(uuid) {
        const agent = this.atcService.agents.get(uuid);
        if (agent) {
            this.atcService.clearAgentLogs(uuid);
            this.atcService.agents.delete(uuid);
            this.atcService.agentConfigs.delete(uuid);

            this.atcService.state.priorityAgents = (this.atcService.state.priorityAgents || []).filter(uid => uid !== uuid);
            
            await agent.stop();
            
            this.atcService.state.activeAgentCount = this.atcService.agents.size;
            await this.pauseAgent(uuid, false);
        }
    }

    async renameAgent(uuid, newName) {
        const agent = this.atcService.agents.get(uuid);
        if (!agent) {
            console.error(`[AgentManager] Rename failed: Agent not found for UUID ${uuid}`);
            return false;
        }

        try {
            const oldName = agent.id;
            this.atcService.addLog(uuid, `📝 CALLSIGN CHANGED: ${oldName} -> [${newName}]`, 'system');

            const client = hazelcastManager.getClient();
            const statusMap = await client.getMap(CONSTANTS.MAP_AGENT_STATUS);
            const currentStatus = await statusMap.get(uuid);

            if (currentStatus) {
                await statusMap.put(uuid, { ...currentStatus, id: uuid, displayName: newName });
            }

            agent.id = newName;

            this.atcService.emitState();
            return true;
        } catch (err) {
            console.error(`[AgentManager] Rename failed for UUID ${uuid}:`, err);
            return false;
        }
    }

    async pauseAgent(uuid, pause) {
        const client = hazelcastManager.getClient();
        if (client) {
            try {
                const map = await client.getMap(CONSTANTS.MAP_AGENT_COMMANDS);
                if (pause) {
                    await map.put(uuid, { cmd: CONSTANTS.CMD_PAUSE });
                } else {
                    await map.remove(uuid);
                }
            } catch (err) {
                console.error(`[AgentManager] Failed to pauseAgent for UUID ${uuid}:`, err);
            }
        }
    }
}

module.exports = AgentManager;