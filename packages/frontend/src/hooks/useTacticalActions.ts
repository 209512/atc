import { useState, useCallback } from 'react';
import { useATC } from './useATC';
import { useAudio } from './useAudio'; 
import { Agent } from '../contexts/atcTypes'; 

export const useTacticalActions = () => {
    const { 
        agents, setAgents, setState, state, isAdminMuted, toggleGlobalStop: apiToggleGlobalStop, isDark, togglePause, 
        submitRename, terminateAgent: apiTerminate, sidebarWidth, togglePriority: apiTogglePriority, 
        transferLock, updatePriorityOrder, areTooltipsEnabled, addLog, markAction
    } = useATC();
    const { playClick, playSuccess, playWarning, playAlert } = useAudio(isAdminMuted);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');

    const activeAgentCount = agents.filter((a: Agent) => a.status === 'active').length;
    const globalStop = state.globalStop;

    const handleStartRename = (agentId: string) => {
        playClick();
        setRenamingId(agentId);
        const target = agents.find((a: Agent) => a.id === agentId);
        setNewName(target?.displayId || agentId);
    };

    const handleCancelRename = () => {
        playClick();
        setRenamingId(null);
        setNewName('');
    };

    const handleConfirmRename = useCallback(async (id: string) => {
        const trimmedName = newName.trim();
        
        const invalidPattern = /[^a-zA-Z0-9-_\.]/;
        if (invalidPattern.test(trimmedName)) {
            alert("이름에는 영문, 숫자, 하이픈(-), 언더바(_), 점(.)만 사용 가능합니다.");
            return;
        }

        const targetAgent = agents.find((a: Agent) => String(a.id) === String(id));
        if (!trimmedName || trimmedName === (targetAgent?.displayId || id)) return handleCancelRename();
        
        playClick();
        markAction(id, 'rename', trimmedName);
        setAgents((prev: Agent[]) => prev.map((a: Agent) => 
            String(a.id) === String(id) ? { ...a, displayId: trimmedName } : a
        ));

        handleCancelRename();
        await submitRename(id, trimmedName);
    }, [newName, agents, setAgents, submitRename, markAction, playClick, handleCancelRename]);
        
    const togglePriority = useCallback(async (id: string, enable: boolean) => {
        playClick();
        markAction(id, 'priority', enable);
        setAgents((prev: Agent[]) => prev.map(a => a.id === id ? { ...a, priority: enable } : a));
        await apiTogglePriority(id, enable);
    }, [apiTogglePriority, markAction, playClick, setAgents]);

    const onTogglePause = useCallback((agentId: string, currentPaused: boolean) => {
        const nextPaused = !currentPaused;
        const nextStatus = nextPaused ? 'paused' : 'active';
        
        nextPaused ? playWarning() : playClick();
        markAction(agentId, 'status', nextStatus);

        setAgents((prev: Agent[]) => prev.map(a => 
            a.id === agentId ? { ...a, status: nextStatus as any } : a
        ));

        togglePause(agentId, nextPaused);
    }, [togglePause, setAgents, markAction, playClick, playWarning]);

    const handleTerminate = useCallback(async (id: string) => {
        apiTerminate(id);
    }, [apiTerminate]);

    const onTransferLock = useCallback((id: string) => {
        playClick();
        transferLock(id);
    }, [transferLock, playClick]);

    const handleToggleGlobalStop = useCallback(() => {
        playClick();
        apiToggleGlobalStop();
    }, [playClick, apiToggleGlobalStop]);

    return {
        agents, state, isDark, sidebarWidth, areTooltipsEnabled,
        renamingId, newName, setNewName, globalStop, activeAgentCount,
        handleStartRename, handleCancelRename, handleConfirmRename,
        toggleGlobalStop: handleToggleGlobalStop, onTogglePause, 
        terminateAgent: handleTerminate, togglePriority, onTransferLock, submitRename
    };
};