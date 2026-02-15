import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useATCSystem } from '../hooks/useATCSystem';
import { useATCStream } from '../hooks/useATCStream'; 
import { atcApi } from './atcApi';
import { useAudio } from '../hooks/useAudio';

export const ATCContext = createContext<any>(null);

export const ATCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, setState, agents, setAgents, addLog } = useATCSystem();
  const { markAction } = useATCStream(setState, setAgents);

  const [isDark, setIsDark] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'detached' | 'docked'>('detached');
  const [areTooltipsEnabled, setAreTooltipsEnabled] = useState(true);
  const [isAdminMuted, setIsAdminMuted] = useState(false);

  const { playAlert, playSuccess, playClick } = useAudio(isAdminMuted);

  // 초기 로드 시 에이전트 수 동기화
  useEffect(() => {
    atcApi.scaleAgents(3).catch(() => {});
  }, []);

  // 트래픽 강도 조절 (슬라이더 연동)
  const setTrafficIntensity = useCallback((val: number) => {
      const minRequired = state.priorityAgents?.length || 1;
      const finalValue = Math.max(minRequired, Math.floor(val));
      
      if (finalValue !== state.trafficIntensity) {
          playClick();
          setState(prev => ({ ...prev, trafficIntensity: finalValue }));
          atcApi.scaleAgents(finalValue).catch(() => {});
      }
  }, [state.trafficIntensity, state.priorityAgents, setState, playClick]);

  // 에이전트 일시정지/재개
  const togglePause = useCallback((agentId: string, paused: boolean) => {
    playClick();
    const nextStatus = paused ? 'paused' : 'active';
    markAction(agentId, 'status', nextStatus);
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: nextStatus as any } : a));
    
    atcApi.togglePause(encodeURIComponent(agentId), paused).catch(() => {});
    // 🟢 세 번째 인자로 agentId를 확실히 전달
    addLog(`[${paused ? '⏸️ SUSPENDED' : '▶️ RESUMED'}]`, 'info', agentId);
  }, [setAgents, addLog, markAction, playClick]);

  // 에이전트 우선순위 설정
  const togglePriority = useCallback((agentId: string, priority: boolean) => {
    priority ? playSuccess() : playClick();
    markAction(agentId, 'priority', priority);
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, priority } : a));
    
    setState(prev => { /* 기존 로직 유지 */ return { ...prev }; });

    // 🟢 세 번째 인자로 agentId를 확실히 전달
    addLog(`[${priority ? '⭐ PRIORITY_SET' : '⭐ PRIORITY_REMOVED'}]`, priority ? 'success' : 'info', agentId);
    atcApi.togglePriority(encodeURIComponent(agentId), priority).catch(() => {});
  }, [setAgents, setState, markAction, addLog, playClick, playSuccess]);

  // 에이전트 삭제 (최소 1명 방어 로직 포함)
  const terminateAgent = useCallback((agentId: string) => {
    // 🟢 방어 로직: 에이전트가 1명뿐일 때는 삭제 불가
    if (agents.length <= 1) {
        playAlert();
        addLog(`[SYSTEM] TERMINATION DENIED: MINIMUM 1 AGENT REQUIRED`, 'error');
        return;
    }

    playClick();
    markAction(agentId, '', null, true); // 캐시 삭제

    // 🟢 슬라이더 동기화: 삭제 후 에이전트 수에 맞춰 트래픽 강도 하향 조정
    const nextCount = agents.length - 1;
    setState(prev => ({ ...prev, trafficIntensity: nextCount }));
    atcApi.scaleAgents(nextCount).catch(() => {});

    setAgents(prev => prev.filter(a => a.id !== agentId));
    addLog(`[${agentId}] 💀 TERMINATING`, 'error');
    atcApi.terminateAgent(encodeURIComponent(agentId)).catch(() => {});
  }, [agents.length, setAgents, setState, addLog, markAction, playClick, playAlert]);

  // 강제 잠금 전환
  const transferLock = useCallback((agentId: string) => {
    playAlert();
    markAction(agentId, 'forcedCandidate', agentId);
    setState(prev => ({ ...prev, forcedCandidate: agentId }));
    // 🟢 세 번째 인자로 agentId를 확실히 전달
    addLog(`[⚡ FORCE_TRANSFER_INITIATED]`, 'critical', agentId);
    atcApi.transferLock(encodeURIComponent(agentId)).catch(() => {});
  }, [setState, addLog, markAction, playAlert]);
  
  // 시스템 전체 정지
  const toggleGlobalStop = useCallback(() => {
    playAlert();
    const nextStop = !state.globalStop;
    markAction('', 'globalStop', nextStop);
    setState(prev => ({ ...prev, globalStop: nextStop }));
    addLog(`[SYSTEM] ${nextStop ? '🚫 GLOBAL_STOP_ENGAGED' : '▶️ SYSTEM_RELEASED'}`, 'system');
    atcApi.toggleGlobalStop(nextStop).catch(() => {});
  }, [state.globalStop, setState, markAction, addLog, playAlert]);

  // 긴급 오버라이드
  const triggerOverride = useCallback(async () => {
    playAlert();
    markAction('', 'overrideSignal', true);
    setState(prev => ({ ...prev, overrideSignal: true, holder: 'Human-Operator' }));
    addLog("🚨 [SYSTEM] EMERGENCY OVERRIDE", "critical");
    return atcApi.triggerOverride();
  }, [playAlert, markAction, setState, addLog]);

  // 오버라이드 해제
  const releaseLock = useCallback(async () => {
    playSuccess();
    markAction('', 'overrideSignal', false);
    setState(prev => ({ ...prev, overrideSignal: false, holder: null }));
    addLog("✅ [SYSTEM] OVERRIDE RELEASED", "info");
    return atcApi.releaseLock();
  }, [playSuccess, markAction, setState, addLog]);

  const updateAgentConfig = useCallback((agentId: string, config: any) => {
      setAgents(prev => prev.map(a => 
          a.id === agentId ? { ...a, ...config } : a
      ));
      addLog(`[${agentId}] ⚙️ CONFIG_UPDATED`, 'success', agentId);
  }, [setAgents, addLog]);

  const value = useMemo(() => ({
    state, agents, setState, setAgents, isDark, setIsDark, areTooltipsEnabled, setAreTooltipsEnabled, updateAgentConfig,
    sidebarWidth, setSidebarWidth, selectedAgentId, setSelectedAgentId, viewMode, setViewMode,
    isAdminMuted, setIsAdminMuted, toggleAdminMute: () => setIsAdminMuted(prev => !prev),
    toggleGlobalStop, togglePause, togglePriority, transferLock, terminateAgent, markAction,
    setTrafficIntensity, triggerOverride, releaseLock, playAlert, playClick, addLog,
    updatePriorityOrder: (newOrder: string[]) => {
        markAction('', 'priorityAgents', newOrder);
        setState(prev => ({ ...prev, priorityAgents: newOrder }));
        atcApi.updatePriorityOrder(newOrder).catch(() => {});
    },
    submitRename: (oldId: string, newId: string) => {
        if (!newId || oldId === newId) return;
        // 🟢 중요: UI에서는 즉시 renameMap을 업데이트하지만, API는 원본 ID로 전송
        markAction(oldId, 'rename', newId);
        addLog(`[${oldId}] 📝 Renaming to: ${newId}`, 'info');
        atcApi.renameAgent(encodeURIComponent(oldId), newId).catch(() => {});
    }
  }), [state, agents, isDark, areTooltipsEnabled, sidebarWidth, selectedAgentId, viewMode, isAdminMuted, toggleGlobalStop, togglePause, togglePriority, transferLock, terminateAgent, markAction, addLog, setTrafficIntensity, triggerOverride, releaseLock, playAlert, playClick]);

  return (
    <ATCContext.Provider value={value}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { border-radius: 10px; transition: background 0.2s; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-5px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-5px); } 80% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
      {children}
    </ATCContext.Provider>
  );
};