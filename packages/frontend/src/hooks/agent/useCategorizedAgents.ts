// src/hooks/agent/useCategorizedAgents.ts
import { useMemo } from 'react';
import { useATC } from '@/hooks/system/useATC';
import { Agent } from '@/contexts/atcTypes';

export const useCategorizedAgents = () => {
    const { agents = [], state } = useATC();

    return useMemo(() => {
        const holderId = state.holder;
        const priorityIds = state.priorityAgents || [];

        const naturalSort = (a: Agent, b: Agent) => 
            a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });

        const masterAgent = agents.find((a: Agent) => a.id === holderId) || null;

        const priorityAgents = priorityIds
            .map((id: string) => agents.find((a: Agent) => a.id === id))
            .filter((a): a is Agent => !!a);

        const normalAgents = agents
            .filter((a: Agent) => !priorityIds.includes(a.id))
            .sort(naturalSort);

        return {
            priorityAgents,
            normalAgents,
            masterAgent,
            priorityIds
        };
    }, [agents, state.priorityAgents, state.holder]);
};