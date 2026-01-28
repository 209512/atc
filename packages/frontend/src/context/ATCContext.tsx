import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';

// --- Types ---
export interface ATCState {
    activeAgentCount: number;
    resourceId: string;
    holder: string | null;
    waitingAgents: string[];
    collisionCount: number;
    overrideSignal: boolean;
    fencingToken: string | null;
    latency: number;
    timestamp: number;
    globalStop: boolean;
    priorityCollisionTrigger?: number;
}

export interface Agent {
    id: string;
    status: string;
    resource?: string;
    activity?: string;
    model?: string;
    lastActive?: number;
    priority?: boolean;
}

interface ATCContextType {
    state: ATCState;
    agents: Agent[];
    setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
    isConnected: boolean;
    triggerOverride: () => Promise<any>;
    releaseLock: () => Promise<void>;
    setTrafficIntensity: (count: number) => Promise<void>;
    togglePause: (agentId: string, isPaused: boolean) => Promise<void>;
    togglePriority: (agentId: string, enable: boolean) => Promise<void>;
    transferLock: (agentId: string) => Promise<void>;
    terminateAgent: (agentId: string) => Promise<void>;
    startRenaming: (agent: Agent) => void;
    submitRename: (oldId: string, newName: string) => Promise<boolean>;
    lastRename: { from: string; to: string } | null;
    toggleGlobalStop: () => Promise<void>;
    
    // UI State
    sidebarWidth: number;
    setSidebarWidth: React.Dispatch<React.SetStateAction<number>>;
    viewMode: string;
    setViewMode: React.Dispatch<React.SetStateAction<string>>;
    selectedAgentId: string | null;
    setSelectedAgentId: React.Dispatch<React.SetStateAction<string | null>>;
    isDark: boolean;
    setIsDark: React.Dispatch<React.SetStateAction<boolean>>;
    areTooltipsEnabled: boolean;
    setAreTooltipsEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    
    // Audio State
    isAdminMuted: boolean;
    setIsAdminMuted: React.Dispatch<React.SetStateAction<boolean>>;
    isAgentMuted: boolean;
    setIsAgentMuted: React.Dispatch<React.SetStateAction<boolean>>;

    // Settings State
    settings: {
        model: string;
        apiKey: string;
        extraParams: string;
    };
    updateSettings: (newSettings: Partial<{ model: string; apiKey: string; extraParams: string }>) => void;
}

const ATCContext = createContext<ATCContextType | null>(null);

export const ATCProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ATCState>({
    activeAgentCount: 0,
    resourceId: 'Initializing...',
    holder: null,
    waitingAgents: [],
    collisionCount: 0,
    overrideSignal: false,
    fencingToken: null,
    latency: 0,
    timestamp: Date.now(),
    globalStop: false
  });

  const [agents, setAgents] = useState<Agent[]>([]); 
  const [isConnected, setIsConnected] = useState(false);
  
  // Audio State
  const [isAdminMuted, setIsAdminMuted] = useState(false);
  const [isAgentMuted, setIsAgentMuted] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState({
      model: 'gpt-4',
      apiKey: '',
      extraParams: ''
  });

  const updateSettings = useCallback((newSettings: Partial<typeof settings>) => {
      setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);
  
  // Sidebar State
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const [viewMode, setViewMode] = useState('attached'); 
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [areTooltipsEnabled, setAreTooltipsEnabled] = useState(true);
  const [lastRename, setLastRename] = useState<{ from: string; to: string } | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pausedAgentsRef = useRef<Set<string>>(new Set());
  // Track terminated agents to filter them out from polling/SSE
  const terminatedAgentsRef = useRef<Set<string>>(new Set());

  // Sound Effect Helper
  const playSound = useCallback((type: 'admin' | 'agent' | 'priority_alarm') => {
    if (type === 'admin' && isAdminMuted) return;
    if (type === 'agent' && isAgentMuted) return;
    if (type === 'priority_alarm' && isAdminMuted) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    
    if (type === 'admin') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(440, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'priority_alarm') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.1);
        osc.frequency.linearRampToValueAtTime(600, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
    } else if (type === 'agent') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }, [isAdminMuted, isAgentMuted]);

  useEffect(() => {
    const handleUserGesture = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };
    window.addEventListener('click', handleUserGesture);
    window.addEventListener('keydown', handleUserGesture);
    return () => {
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };
  }, []);

  // SSE Connection
  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3000/api/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);

    eventSource.onmessage = (event) => {
      try {
        const incomingData = JSON.parse(event.data);
        
        // --- Enhance SSE Filtering: Use latest Ref within setState updater ---
        setState(prev => {
            const isTerminated = (id: string | null) => id ? terminatedAgentsRef.current.has(id) : false;

            const filteredHolder = isTerminated(incomingData.holder) ? null : incomingData.holder;
            const filteredWaiting = (incomingData.waitingAgents || []).filter((id: string) => !isTerminated(id));

            const newState = { 
                ...incomingData, 
                holder: filteredHolder, 
                waitingAgents: filteredWaiting 
            };

            if (newState.overrideSignal && !prev.overrideSignal) playSound('admin');
            if (newState.priorityCollisionTrigger && newState.priorityCollisionTrigger !== prev.priorityCollisionTrigger) playSound('priority_alarm');
            if (newState.holder && newState.holder !== prev.holder && !newState.holder.includes('Human')) playSound('agent');
            
            return newState;
        });
      } catch (err) {
        console.error('SSE Parse Error:', err);
      }
    };
    
    // Periodic Agent Status Polling
    const pollInterval = setInterval(() => {
        fetch('http://localhost:3000/api/agents/status')
            .then(res => res.json())
            .then(data => {
                setAgents(prev => {
                    let filteredData = data.filter((a: Agent) => !terminatedAgentsRef.current.has(a.id));
                    
                    if (lastRename) {
                        filteredData = filteredData.filter((a: Agent) => a.id !== lastRename.from);
                    }

                    const incomingMap = new Map(filteredData.map((a: Agent) => [a.id, a]));
                    
                    if (lastRename && !incomingMap.has(lastRename.to)) {
                        const existingInState = prev.find(a => a.id === lastRename.to);
                        if (existingInState) {
                            incomingMap.set(lastRename.to, existingInState);
                        }
                    }

                    const finalAgents = Array.from(incomingMap.values()).map((agent: unknown) => {
                        const typedAgent = agent as Agent;
                        if (pausedAgentsRef.current.has(typedAgent.id)) {
                            return { ...typedAgent, status: 'paused' };
                        }
                        return typedAgent;
                    });

                    return finalAgents.sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true}));
                });
            })
            .catch(err => console.error("Agent Poll Error:", err));
    }, 1000);

    return () => {
      eventSource.close();
      clearInterval(pollInterval);
    };
  }, [playSound, lastRename]);

  // Actions
  const triggerOverride = useCallback(async () => {
    try {
      playSound('admin');
      const res = await fetch('http://localhost:3000/api/override', { method: 'POST' });
      return await res.json();
    } catch (err) {
      console.error(err);
      return { success: false, message: "Network Error" };
    }
  }, [playSound]);

  const releaseLock = useCallback(async () => {
    try {
      await fetch('http://localhost:3000/api/release', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
  }, []);

  const setTrafficIntensity = useCallback(async (count: number) => {
    try {
        await fetch('http://localhost:3000/api/agents/scale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count })
        });
    } catch (err) {
        console.error(err);
    }
  }, []);

  const togglePause = useCallback(async (agentId: string, isPaused: boolean) => {
      if (!isPaused) pausedAgentsRef.current.add(agentId);
      else pausedAgentsRef.current.delete(agentId);

      setAgents(prev => prev.map(a => 
          a.id === agentId ? { ...a, status: isPaused ? 'idle' : 'paused' } : a
      ));

      try {
          await fetch(`http://localhost:3000/api/agents/${agentId}/pause`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pause: !isPaused })
          });
      } catch (e) { 
          if (!isPaused) pausedAgentsRef.current.delete(agentId);
          else pausedAgentsRef.current.add(agentId);
          console.error(e); 
      }
  }, []);

  const togglePriority = useCallback(async (agentId: string, enable: boolean) => {
      setAgents(prev => prev.map(a => 
          a.id === agentId ? { ...a, priority: enable } : a
      ));
      try {
          await fetch(`http://localhost:3000/api/agents/${agentId}/priority`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ enable })
          });
      } catch (e) { console.error(e); }
  }, []);

  const transferLock = useCallback(async (agentId: string) => {
      try {
          await fetch(`http://localhost:3000/api/agents/${agentId}/transfer-lock`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
          });
      } catch (e) { console.error(e); }
  }, []);

  const terminateAgent = useCallback(async (agentId: string) => {
      // 1. Add to blocklist
      terminatedAgentsRef.current.add(agentId);

      // 2. Optimistic update for agent list and global state
      setAgents(prev => prev.filter(a => a.id !== agentId));
      setState(prev => ({
          ...prev,
          holder: prev.holder === agentId ? null : prev.holder,
          waitingAgents: prev.waitingAgents.filter(id => id !== agentId),
          activeAgentCount: Math.max(0, prev.activeAgentCount - 1)
      }));

      if (selectedAgentId === agentId) {
          setSelectedAgentId(null);
      }

      try {
          const res = await fetch(`http://localhost:3000/api/agents/${agentId}`, { method: 'DELETE' });
          if (!res.ok) throw new Error("Agent Termination Failed");
          
          // Ensure server sync by unblocking after sufficient time (5s)
          setTimeout(() => {
              terminatedAgentsRef.current.delete(agentId);
          }, 5000);
      } catch (e) { 
          console.error("Terminate Error:", e);
          terminatedAgentsRef.current.delete(agentId);
      }
  }, [selectedAgentId]);
  
  const startRenaming = useCallback((agent: Agent) => {}, []);

  const submitRename = useCallback(async (oldId: string, newName: string) => {
      setLastRename({ from: oldId, to: newName });

      setAgents(prev => prev.map(a => 
          a.id === oldId ? { ...a, id: newName } : a
      ));

      setState(prev => {
          const newState = { ...prev };
          if (newState.holder === oldId) newState.holder = newName;
          newState.waitingAgents = newState.waitingAgents.map(id => id === oldId ? newName : id);
          return newState;
      });

      if (pausedAgentsRef.current.has(oldId)) {
          pausedAgentsRef.current.delete(oldId);
          pausedAgentsRef.current.add(newName);
      }
      if (selectedAgentId === oldId) setSelectedAgentId(newName);

      try {
          const res = await fetch(`http://localhost:3000/api/agents/${oldId}/rename`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ newId: newName })
          });
          if (!res.ok) throw new Error("Rename Failed");
          return true;
      } catch (e) {
          console.error(e);
          setLastRename(null);
          setAgents(prev => prev.map(a => a.id === newName ? { ...a, id: oldId } : a));
          if (pausedAgentsRef.current.has(newName)) {
             pausedAgentsRef.current.delete(newName);
             pausedAgentsRef.current.add(oldId);
          }
          return false;
      }
  }, [selectedAgentId]);
  
  const toggleGlobalStop = useCallback(async () => {
      const newState = !state.globalStop;
      if (!newState) {
           const agentsToResume = Array.from(pausedAgentsRef.current);
           agentsToResume.forEach(id => togglePause(id, true));
           pausedAgentsRef.current.clear();
      }
      try {
          await fetch('http://localhost:3000/api/stop', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ enable: newState })
          });
      } catch (e) { console.error(e); }
  }, [state.globalStop, togglePause]);

  const value: ATCContextType = {
    state, agents, setAgents, isConnected, triggerOverride, releaseLock, setTrafficIntensity,
    togglePause, togglePriority, transferLock, terminateAgent, startRenaming, submitRename,
    lastRename, toggleGlobalStop,
    sidebarWidth, setSidebarWidth, viewMode, setViewMode,
    selectedAgentId, setSelectedAgentId, isDark, setIsDark, areTooltipsEnabled, setAreTooltipsEnabled,
    isAdminMuted, setIsAdminMuted, isAgentMuted, setIsAgentMuted, settings, updateSettings
  };

  return <ATCContext.Provider value={value}>{children}</ATCContext.Provider>;
};

export const useATC = () => {
  const context = useContext(ATCContext);
  if (!context) throw new Error('useATC must be used within an ATCProvider');
  return context;
};