// src/contexts/ATCProvider.tsx
import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useATCSystem } from '@/hooks/system/useATCSystem';
import { useATCStream } from '@/hooks/system/useATCStream'; 
import { atcApi } from '@/contexts/atcApi';
import { useAudio } from '@/hooks/system/useAudio';
import { Agent, ATCState } from '@/contexts/atcTypes';

export interface ATCContextType {
  state: ATCState;
  agents: Agent[];
  setState: React.Dispatch<React.SetStateAction<ATCState>>;
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  updateAgentConfig: (agentId: string, config: any) => void;
  isAdminMuted: boolean;
  setIsAdminMuted: React.Dispatch<React.SetStateAction<boolean>>;
  toggleAdminMute: () => void;
  toggleGlobalStop: () => void;
  togglePause: (agentId: string, paused: boolean) => void;
  togglePriority: (agentId: string, priority: boolean) => void;
  transferLock: (agentId: string) => void;
  terminateAgent: (agentId: string) => void;
  markAction: (agentId: string, field: string, value: any, isDelete?: boolean) => void;
  setTrafficIntensity: (val: number) => void;
  triggerOverride: () => Promise<any>;
  releaseLock: () => Promise<any>;
  playAlert: () => void;
  playClick: () => void;
  addLog: (message: string, type: any, agentId?: string) => void;
  updatePriorityOrder: (newOrder: string[]) => void;
  renameAgent: (oldId: string, newId: string) => Promise<void>;
  submitRename: (oldId: string, newId: string) => Promise<void>;
}

export const ATCContext = createContext<ATCContextType | null>(null);

export const ATCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, setState, agents, setAgents, addLog } = useATCSystem();
  const { markAction } = useATCStream(setState, setAgents);

  const [isAdminMuted, setIsAdminMuted] = useState(false);
  const { playAlert, playSuccess, playClick } = useAudio(isAdminMuted);

  useEffect(() => {
    atcApi.scaleAgents(state.trafficIntensity).catch(err => {
      addLog(`[SYSTEM] API_CONNECT_FAIL: ${err.message}`, 'critical');
    });
  }, []);

  const setTrafficIntensity = useCallback((val: number) => {
    const minRequired = state.priorityAgents?.length || 1;
    const finalValue = Math.max(minRequired, Math.floor(val));
    
    if (finalValue !== state.trafficIntensity) {
        playClick();
        const prevIntensity = state.trafficIntensity;
        setState(prev => ({ ...prev, trafficIntensity: finalValue }));
        
        atcApi.scaleAgents(finalValue)
          .then(res => {
              if (res.agents) {
                  setAgents(res.agents);
                  setState(prev => ({ ...prev, trafficIntensity: res.agents.length }));
              }
          })
          .catch(err => {
              playAlert();
              addLog(`[SYSTEM] SCALE_FAILED: ${err.message}`, 'error');
              setState(prev => ({ ...prev, trafficIntensity: prevIntensity }));
          });
    }
  }, [state.trafficIntensity, state.priorityAgents, setState, setAgents, playClick, playAlert, addLog]);

  const togglePause = useCallback((agentId: string, paused: boolean) => {
    playClick();
    const nextStatus = paused ? 'paused' : 'active';
    // isPaused 필드와 status 필드를 동시에 고려하기 위해 status 업데이트
    markAction(agentId, 'status', nextStatus);
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: nextStatus as any, isPaused: paused } : a));
    
    atcApi.togglePause(agentId, paused).catch(err => {
        playAlert();
        addLog(`[${agentId}] PAUSE_FAILED: ${err.message}`, 'error');
        markAction(agentId, 'status', null);
    });
    addLog(`[${paused ? '⏸️ SUSPENDED' : '▶️ RESUMED'}]`, 'info', agentId);
  }, [setAgents, addLog, markAction, playClick, playAlert]);

  const togglePriority = useCallback((agentId: string, priority: boolean) => {
    priority ? playSuccess() : playClick();
    markAction(agentId, 'priority', priority);
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, priority } : a));
    
    addLog(`[${priority ? '⭐ PRIORITY_SET' : '⭐ PRIORITY_REMOVED'}]`, priority ? 'success' : 'info', agentId);
    atcApi.togglePriority(agentId, priority).catch(err => {
        playAlert();
        addLog(`[${agentId}] PRIORITY_FAILED: ${err.message}`, 'error');
        markAction(agentId, 'priority', !priority);
    });
  }, [setAgents, markAction, addLog, playClick, playSuccess, playAlert]);

  const terminateAgent = useCallback((agentId: string) => {
    if (agents.length <= 1) {
        playAlert();
        addLog(`[SYSTEM] TERMINATION DENIED: MINIMUM 1 AGENT REQUIRED`, 'error');
        return;
    }
    playClick();
    markAction(agentId, '', null, true);
    
    const prevAgents = [...agents];
    setAgents(prev => prev.filter(a => a.id !== agentId));
    addLog(`[${agentId}] 💀 TERMINATING`, 'error');
    
    atcApi.terminateAgent(agentId)
      .then(() => {
          setState(prev => ({ ...prev, trafficIntensity: agents.length - 1 }));
      })
      .catch(err => {
          playAlert();
          addLog(`[${agentId}] TERMINATE_FAILED: ${err.message}`, 'error');
          setAgents(prevAgents);
      });
  }, [agents, setAgents, setState, addLog, markAction, playClick, playAlert]);

  const transferLock = useCallback((agentId: string) => {
    playAlert();
    markAction(agentId, 'forcedCandidate', agentId);
    setState(prev => ({ ...prev, forcedCandidate: agentId }));
    addLog(`[⚡ FORCE_TRANSFER_INITIATED]`, 'critical', agentId);
    
    atcApi.transferLock(agentId).catch(err => {
        addLog(`[${agentId}] TRANSFER_FAILED: ${err.message}`, 'error');
        setState(prev => ({ ...prev, forcedCandidate: null }));
    });
  }, [setState, addLog, markAction, playAlert]);
  
  const toggleGlobalStop = useCallback(() => {
    playAlert();
    const nextStop = !state.globalStop;
    markAction('', 'globalStop', nextStop);
    setState(prev => ({ ...prev, globalStop: nextStop }));
    addLog(`[SYSTEM] ${nextStop ? '🚫 GLOBAL_STOP_ENGAGED' : '▶️ SYSTEM_RELEASED'}`, 'system');
    
    atcApi.toggleGlobalStop(nextStop).catch(err => {
        addLog(`[SYSTEM] GLOBAL_STOP_FAILED: ${err.message}`, 'error');
        setState(prev => ({ ...prev, globalStop: !nextStop }));
    });
  }, [state.globalStop, setState, markAction, addLog, playAlert]);

  const triggerOverride = useCallback(async () => {
    playAlert();
    markAction('', 'overrideSignal', true);
    setState(prev => ({ ...prev, overrideSignal: true, holder: 'Human-Operator' }));
    addLog("🚨 [SYSTEM] EMERGENCY OVERRIDE", "critical");
    
    return atcApi.triggerOverride().catch(err => {
        addLog(`[SYSTEM] OVERRIDE_FAILED: ${err.message}`, 'error');
        setState(prev => ({ ...prev, overrideSignal: false, holder: null }));
    });
  }, [playAlert, markAction, setState, addLog]);

  const releaseLock = useCallback(async () => {
    playSuccess();
    markAction('', 'overrideSignal', false);
    setState(prev => ({ ...prev, overrideSignal: false, holder: null }));
    addLog("✅ [SYSTEM] OVERRIDE RELEASED", "info");
    
    return atcApi.releaseLock().catch(err => {
        addLog(`[SYSTEM] RELEASE_FAILED: ${err.message}`, 'error');
        setState(prev => ({ ...prev, overrideSignal: true, holder: 'Human-Operator' }));
    });
  }, [playSuccess, markAction, setState, addLog]);

  const updateAgentConfig = useCallback((agentId: string, config: any) => {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, ...config } : a));
      addLog(`[${agentId}] ⚙️ CONFIG_UPDATED`, 'success', agentId);
      
      atcApi.updateConfig(agentId, config).catch(err => 
          addLog(`[${agentId}] CONFIG_FAILED: ${err.message}`, 'error')
      );
  }, [setAgents, addLog]);

  const value = useMemo(() => ({
    state, agents, setState, setAgents, updateAgentConfig,
    isAdminMuted, setIsAdminMuted, toggleAdminMute: () => setIsAdminMuted(prev => !prev),
    toggleGlobalStop, togglePause, togglePriority, transferLock, terminateAgent, markAction,
    setTrafficIntensity, triggerOverride, releaseLock, playAlert, playClick, addLog,
    updatePriorityOrder: (newOrder: string[]) => {
        markAction('', 'priorityAgents', newOrder);
        setState(prev => ({ ...prev, priorityAgents: newOrder }));
        atcApi.updatePriorityOrder(newOrder).catch(err => addLog(`[SYSTEM] ORDER_FAILED: ${err.message}`, 'error'));
    },
    renameAgent: async (oldId: string, newId: string) => {
        if (!newId || oldId === newId) return;
        markAction(oldId, 'rename', newId);
        addLog(`[${oldId}] 📝 Renaming to: ${newId}`, 'info');
        try {
            await atcApi.renameAgent(oldId, newId);
            playSuccess();
        } catch (err: any) {
            playAlert();
            addLog(`[${oldId}] RENAME_FAILED: ${err.message}`, 'error');
            markAction(oldId, 'rename', null);
            throw err;
        }
    },
    submitRename: async (oldId: string, newId: string) => {
        if (!newId || oldId === newId) return;
        markAction(oldId, 'rename', newId);
        try {
            await atcApi.renameAgent(oldId, newId);
            playSuccess();
        } catch (err: any) {
            playAlert();
            markAction(oldId, 'rename', null);
        }
    }
  }), [state, agents, isAdminMuted, toggleGlobalStop, togglePause, togglePriority, transferLock, terminateAgent, markAction, addLog, setTrafficIntensity, triggerOverride, releaseLock, playAlert, playClick, playSuccess]);

  return (
    <ATCContext.Provider value={value}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3b82f655; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3b82f6aa; }
      `}</style>
      {children}
    </ATCContext.Provider>
  );
};