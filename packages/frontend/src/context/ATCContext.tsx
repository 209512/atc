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
}

export interface Agent {
    id: string;
    status: string;
    resource?: string;
    activity?: string;
    model?: string;
    lastActive?: number;
    priority?: string;
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
    terminateAgent: (agentId: string) => Promise<void>;
    startRenaming: (agent: Agent) => void;
    submitRename: (oldId: string, newName: string) => Promise<boolean>;
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  // Track paused agents locally to override server state until confirmed
  const pausedAgentsRef = useRef<Set<string>>(new Set());

  // Sound Effect Helper
  const playSound = useCallback((type: 'admin' | 'agent') => {
    // Check global stop or specific mute
    if (type === 'admin' && isAdminMuted) return;
    if (type === 'agent' && isAgentMuted) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume context if suspended (browser autoplay policy)
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
    
    if (type === 'admin') { // Override Sound (Siren)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.linearRampToValueAtTime(440, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'agent') { // Lock Acquired (Ping)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }, [isAdminMuted, isAgentMuted]);

  // Resume AudioContext on user interaction
  useEffect(() => {
    const handleUserGesture = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('🔊 AudioContext Resumed by User Gesture');
        });
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

    eventSource.onopen = () => {
      console.log('✅ Connected to ATC Controller (SSE)');
      setIsConnected(true);
    };

    eventSource.onerror = (err) => {
      console.warn('❌ Disconnected from ATC Controller (SSE)', err);
      setIsConnected(false);
    };

    eventSource.onmessage = (event) => {
      try {
        const newState = JSON.parse(event.data);
        setState(prev => {
          // Sound Triggers based on state change
          if (newState.overrideSignal && !prev.overrideSignal) playSound('admin');
          if (newState.holder && newState.holder !== prev.holder && !newState.holder.includes('Human')) {
               playSound('agent');
          }
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
                // Merge Logic: Override server status with local pause state
                const mergedAgents = data.map((agent: Agent) => {
                    if (pausedAgentsRef.current.has(agent.id)) {
                        return { ...agent, status: 'paused' };
                    }
                    return agent;
                });
                setAgents(mergedAgents);
            })
            .catch(err => console.error("Agent Poll Error:", err));
    }, 1000);

    return () => {
      eventSource.close();
      clearInterval(pollInterval);
    };
  }, [playSound]);

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
      // Optimistic update
      // Update local ref immediately
      if (!isPaused) { // We are pausing (current state is NOT paused)
          pausedAgentsRef.current.add(agentId);
      } else {
          pausedAgentsRef.current.delete(agentId);
      }

      setAgents(prev => prev.map(a => 
          a.id === agentId ? { ...a, status: isPaused ? 'idle' : 'paused' } : a
      ));

      try {
          await fetch(`http://localhost:3000/api/agents/${agentId}/pause`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ pause: !isPaused }) // If currently paused, we want to unpause (false). Logic checks out.
          });
      } catch (e) { 
          // Revert on error
          if (!isPaused) pausedAgentsRef.current.delete(agentId);
          else pausedAgentsRef.current.add(agentId);
          console.error(e); 
      }
  }, []);

  const terminateAgent = useCallback(async (agentId: string) => {
      try {
          await fetch(`http://localhost:3000/api/agents/${agentId}`, { method: 'DELETE' });
      } catch (e) { console.error(e); }
  }, []);
  
  const startRenaming = useCallback((agent: Agent) => {
      // Handled locally in component usually
  }, []);

  const submitRename = useCallback(async (oldId: string, newName: string) => {
      try {
          await fetch(`http://localhost:3000/api/agents/${oldId}/rename`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ newId: newName })
          });
          return true;
      } catch (e) {
          console.error(e);
          return false;
      }
  }, []);
  
  const toggleGlobalStop = useCallback(async () => {
      const newState = !state.globalStop;
      try {
          await fetch('http://localhost:3000/api/stop', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ enable: newState })
          });
      } catch (e) { console.error(e); }
  }, [state.globalStop]);

  const value: ATCContextType = {
    state,
    agents,
    setAgents,
    isConnected,
    triggerOverride,
    releaseLock,
    setTrafficIntensity,
    togglePause,
    terminateAgent,
    startRenaming,
    submitRename,
    toggleGlobalStop,
    // UI State
    sidebarWidth, setSidebarWidth,
    viewMode, setViewMode,
    selectedAgentId, setSelectedAgentId,
    isDark, setIsDark,
    // Audio State
    isAdminMuted, setIsAdminMuted,
    isAgentMuted, setIsAgentMuted,
    // Settings State
    settings, updateSettings
  };

  return (
    <ATCContext.Provider value={value}>
      {children}
    </ATCContext.Provider>
  );
};

export const useATC = () => {
  const context = useContext(ATCContext);
  if (!context) {
    throw new Error('useATC must be used within an ATCProvider');
  }
  return context;
};
