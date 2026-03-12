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
  updateAgentConfig: (uuid: string, config: any) => void;
  isAdminMuted: boolean;
  setIsAdminMuted: React.Dispatch<React.SetStateAction<boolean>>;
  toggleAdminMute: () => void;
  toggleGlobalStop: () => void;
  togglePause: (uuid: string) => void;
  togglePriority: (uuid: string) => void;
  transferLock: (uuid: string) => void;
  terminateAgent: (uuid: string) => void;
  markAction: (uuid: string, field: string, value: any, isDelete?: boolean) => void;
  setTrafficIntensity: (val: number) => void;
  triggerOverride: () => Promise<any>;
  releaseLock: () => Promise<any>;
  playAlert: () => void;
  playClick: () => void;
  addLog: (message: string, type: any, agentId?: string) => void;
  updatePriorityOrder: (newOrder: string[]) => void;
  renameAgent: (uuid: string, newName: string) => Promise<void>;
  submitRename: (uuid: string, newName: string) => Promise<void>;
}

export const ATCContext = createContext<ATCContextType | null>(null);

export const ATCProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, setState, agents, setAgents, addLog } = useATCSystem();
  const { markAction } = useATCStream(setState, setAgents);

  const [isAdminMuted, setIsAdminMuted] = useState(false);
  const { playAlert, playSuccess, playClick } = useAudio(isAdminMuted);

  useEffect(() => {
    if (state.activeAgentCount === 0 && state.trafficIntensity > 0) {
      atcApi.scaleAgents(state.trafficIntensity).catch(() => {});
    }
  }, []);

  const setTrafficIntensity = useCallback((val: number) => {
    const minRequired = state.priorityAgents?.length || 1;
    const finalValue = Math.max(minRequired, Math.floor(val));
    
    if (finalValue !== state.trafficIntensity) {
        playClick();
        atcApi.scaleAgents(finalValue)
          .then(() => {
              setState(prev => ({ ...prev, trafficIntensity: finalValue }));
          })
          .catch(() => {
              playAlert();
          });
    }
  }, [state.trafficIntensity, state.priorityAgents, setState, playClick, playAlert]);

  const togglePause = useCallback((uuid: string) => {
    playClick();
    const target = agents.find(a => String(a.uuid || a.id) === String(uuid));
    if (!target) return;

    const nextPaused = !target.isPaused;
    markAction(uuid, 'isPaused', nextPaused);
    
    atcApi.togglePause(uuid, nextPaused)
      .catch(err => {
          playAlert();
          markAction(uuid, 'isPaused', !nextPaused); 
      });
  }, [agents, markAction, playClick, playAlert]);

  const togglePriority = useCallback((uuid: string) => {
    const target = agents.find(a => String(a.uuid || a.id) === String(uuid));
    if (!target) return;

    const nextPriority = !target.priority;
    nextPriority ? playSuccess() : playClick();
    markAction(uuid, 'priority', nextPriority);
    
    atcApi.togglePriority(uuid, nextPriority)
      .catch(err => {
          playAlert();
          markAction(uuid, 'priority', !nextPriority); 
      });
  }, [agents, markAction, playClick, playSuccess, playAlert]);
  
  const terminateAgent = useCallback((uuid: string) => {
    if (agents.length <= 1) {
        playAlert();
        return;
    }
    playClick();
    markAction(uuid, '', null, true);
    
    atcApi.terminateAgent(uuid)
      .then(() => {
          setState(prev => ({ ...prev, trafficIntensity: Math.max(0, agents.length - 1) }));
      })
      .catch(() => {
          playAlert();
          markAction(uuid, '', null, false);
      });
  }, [agents.length, setState, markAction, playClick, playAlert]);

  const transferLock = useCallback((uuid: string) => {
    playAlert();
    markAction('', 'forcedCandidate', uuid);
    markAction('', 'holder', null); 
    
    atcApi.transferLock(uuid)
      .catch(() => {
          markAction('', 'forcedCandidate', null);
      });
  }, [markAction, playAlert]);
  
  const toggleGlobalStop = useCallback(() => {
    playAlert();
    const nextStop = !state.globalStop;
    markAction('', 'globalStop', nextStop);
    
    atcApi.toggleGlobalStop(nextStop)
      .catch(() => {
          markAction('', 'globalStop', !nextStop);
      });
  }, [state.globalStop, markAction, playAlert]);

  const triggerOverride = useCallback(async () => {
    playAlert();
    markAction('', 'overrideSignal', true);
    markAction('', 'holder', 'Human-Operator');
    
    return atcApi.triggerOverride()
      .catch(() => {
          markAction('', 'overrideSignal', false);
          markAction('', 'holder', null);
      });
  }, [playAlert, markAction]);

  const releaseLock = useCallback(async () => {
    playSuccess();
    markAction('', 'overrideSignal', false);
    markAction('', 'holder', null);
    
    return atcApi.releaseLock()
      .catch(() => {
          markAction('', 'overrideSignal', true);
          markAction('', 'holder', 'Human-Operator');
      });
  }, [playSuccess, markAction]);

  const updateAgentConfig = useCallback((uuid: string, config: any) => {
      setAgents(prev => prev.map(a => String(a.uuid || a.id) === String(uuid) ? { ...a, ...config } : a));
      atcApi.updateConfig(uuid, config).catch(() => {});
  }, [setAgents]);

  const handleRename = useCallback(async (uuid: string, newName: string) => {
    if (!newName) return;
    markAction(uuid, 'displayName', newName); 
    try {
        await atcApi.renameAgent(uuid, newName);
        playSuccess();
    } catch (err: any) {
        playAlert();
        markAction(uuid, 'displayName', null);
    }
  }, [markAction, playSuccess, playAlert]);

  const value = useMemo(() => ({
    state, agents, setState, setAgents, updateAgentConfig,
    isAdminMuted, setIsAdminMuted, toggleAdminMute: () => setIsAdminMuted(prev => !prev),
    toggleGlobalStop, togglePause, togglePriority, transferLock, terminateAgent, markAction,
    setTrafficIntensity, triggerOverride, releaseLock, playAlert, playClick, addLog,
    updatePriorityOrder: (newOrder: string[]) => {
        markAction('', 'priorityAgents', newOrder);
        atcApi.updatePriorityOrder(newOrder).catch(() => {});
    },
    renameAgent: handleRename,
    submitRename: handleRename
  }), [state, agents, setState, setAgents, updateAgentConfig, isAdminMuted, toggleGlobalStop, togglePause, togglePriority, transferLock, terminateAgent, markAction, addLog, setTrafficIntensity, triggerOverride, releaseLock, playAlert, playClick, handleRename]);

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