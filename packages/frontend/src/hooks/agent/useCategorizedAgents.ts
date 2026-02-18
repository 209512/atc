// src/hooks/agent/useCategorizedAgents.ts
import { useMemo } from 'react';
import { useATC } from '@/hooks/system/useATC';
import { Agent } from '@/contexts/atcTypes';

export const useCategorizedAgents = () => {
    const { agents = [], state } = useATC();

    return useMemo(() => {
        const holderId = state.holder;
        const priorityIds = state.priorityAgents || [];

        // 1. Master: 락 보유자
        const masterAgent = agents.find((a: Agent) => a.id === holderId) || null;

        // 2. Priority Agents: 우선순위 목록에 있는 에이전트들
        const priorityAgents = priorityIds
            .map((id: string) => agents.find((a: Agent) => a.id === id))
            .filter((a): a is Agent => !!a);

        // 3. Normal Agents: 우선순위가 아닌 모든 에이전트
        const normalAgents = agents.filter((a: Agent) => !priorityIds.includes(a.id));

        return {
            priorityAgents,
            normalAgents,
            masterAgent,
            priorityIds
        };
    }, [agents, state.priorityAgents, state.holder]);
};