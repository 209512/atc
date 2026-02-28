// src/core/PolicyManager.js
class PolicyManager {
    constructor(atcService) {
        this.atcService = atcService;
    }

    // 🛡️ [Gatekeeper] : 에이전트의 락 획득 권한 여부를 판단
    async canAgentAcquire(agentId) {
        const state = this.atcService.state;
        
        if (state.globalStop) return false;
        
        const isPaused = await this.atcService.isAgentPaused(agentId);
        if (isPaused) return false;

        if (state.overrideSignal) {
            return agentId === 'Human (Admin)'; 
        }

        if (state.forcedCandidate === agentId || state.holder === agentId) {
            return true;
        }

        if (state.priorityAgents && state.priorityAgents.length > 0) {
            const activePriorityAgents = [];
            for (const pid of state.priorityAgents) {
                const pPaused = await this.atcService.isAgentPaused(pid);
                const exists = this.atcService.agents.has(pid);
                if (!pPaused && exists) {
                    activePriorityAgents.push(pid);
                }
            }

            if (activePriorityAgents.length > 0) {
                return activePriorityAgents.includes(agentId);
            }
        }

        return true;
    }

    async togglePriority(id, enable) {
        const current = new Set(this.atcService.state.priorityAgents || []);
        if (enable) current.add(id);
        else current.delete(id);
        
        this.atcService.state.priorityAgents = Array.from(current);
        
        const type = enable ? 'success' : 'warn';
        this.atcService.addLog(id, `⭐ Priority ${enable ? 'Granted' : 'Revoked'}`, type);

        this.atcService.lockDirector.refreshResourceId();
        this.atcService.emitState();
    }

    async updatePriorityOrder(newOrder) {
        console.log(`📑 Updating Priority Order: ${newOrder.join(' -> ')}`);
        this.atcService.state.priorityAgents = newOrder;

        newOrder.forEach((id, index) => {
            this.atcService.addLog(id, `📑 Priority Rank Updated: No.${index + 1}`, 'info');
        });

        this.atcService.lockDirector.refreshResourceId();
        this.atcService.emitState();
    }
}

module.exports = PolicyManager;