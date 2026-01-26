import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play, Activity, Sun, Moon, Fingerprint, Shield, ChevronDown, ChevronUp, Square, Volume2, VolumeX, Settings, Radar as RadarIcon, PanelLeftOpen, PanelLeftClose, Mic, MicOff, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { API_URL } from '../hooks/useATC';
import { Radar } from './Radar';
import { CustomTooltip } from './sidebar/CustomTooltip';
import { MetricBox } from './sidebar/MetricBox';
import { AgentRow } from './sidebar/AgentRow';
import { AgentSettings } from './sidebar/AgentSettings';
import { AgentTacticalPanel } from './AgentTacticalPanel';

export const Sidebar = ({ state, triggerOverride, releaseLock, setTrafficIntensity }) => {
  const nodeRef = useRef(null); 
  const resizerRef = useRef(null);

  const [agents, setAgents] = useState([]);
  const [globalStop, setGlobalStop] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [opacity, setOpacity] = useState(100);
  const [sliderValue, setSliderValue] = useState(2);
  const [isOverrideLoading, setIsOverrideLoading] = useState(false);
  const [isAgentListOpen, setIsAgentListOpen] = useState(true);
  const [uptime, setUptime] = useState(0);
  
  // Dual Mute Control
  const [isAdminMuted, setIsAdminMuted] = useState(false);
  const [isAgentMuted, setIsAgentMuted] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Tactical Panel State
  const [renamingId, setRenamingId] = useState(null);
  const [newName, setNewName] = useState('');
  
  // [Changed] Tactical Panel always active by default, but toggleable visibility if needed (User asked for "Floating Log" style)
  // We keep the state to allow user to close it if they want.
  const [showTacticalPanel, setShowTacticalPanel] = useState(true);
  
  // Radar Toggle
  const [showRadar, setShowRadar] = useState(true);

  // Sidebar Resizing
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (state.activeAgentCount !== undefined) setSliderValue(state.activeAgentCount);
  }, [state.activeAgentCount]);

  useEffect(() => {
      const start = Date.now();
      const timer = setInterval(() => setUptime(Math.floor((Date.now() - start) / 1000)), 1000);
      return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
        try {
          const res = await fetch(`${API_URL}/api/agents/status`);
          const data = await res.json();
          setAgents(data);
        } catch (e) {}
    };
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e) => {
        if (!isResizing) return;
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 300 && newWidth < 800) {
            setSidebarWidth(newWidth);
        }
    };

    const handleMouseUp = () => {
        setIsResizing(false);
        document.body.style.cursor = 'default';
    };

    if (isResizing) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
    }

    return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);


  const handleScale = (val) => { setSliderValue(val); setTrafficIntensity(val); };

  const handleOverride = async () => {
    setIsOverrideLoading(true);
    try { await triggerOverride(); } finally { setIsOverrideLoading(false); }
  };

  const toggleGlobalStop = async () => {
      const newState = !globalStop;
      setGlobalStop(newState);
      await fetch(`${API_URL}/api/stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enable: newState })
      });
  };

  const togglePause = async (id, currentStatus) => {
      const isPaused = currentStatus === 'PAUSED';
      await fetch(`${API_URL}/api/agents/${id}/pause`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pause: !isPaused })
      });
  };

  const terminateAgent = async (id) => {
      await fetch(`${API_URL}/api/agents/${id}`, { method: 'DELETE' });
  };

  const startRenaming = (agent) => {
      setRenamingId(agent.id);
      setNewName(agent.id);
  };

  const submitRename = async () => {
      if (newName && newName !== renamingId) {
          await fetch(`${API_URL}/api/agents/${renamingId}/rename`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ newId: newName })
          });
      }
      setRenamingId(null);
  };

  const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const successRate = state.collisionCount > 0 ? Math.max(0, 100 - (state.collisionCount * 2)) : 100;
  const isHuman = state.holder?.includes('Human');
  
  return (
    <>
        <div className="flex h-screen w-full overflow-hidden relative">
            
            {/* Main Empty Area (Left) */}
            <main className="flex-1 bg-transparent pointer-events-none" />

            {/* Integrated Sidebar (Right) */}
            <aside 
                className={clsx(
                    "h-full border-l flex flex-col transition-colors duration-300 shadow-2xl backdrop-blur-md z-30 pointer-events-auto relative",
                    isDark ? "bg-[#0d1117]/90 border-gray-800 text-gray-300" : "bg-white/90 border-gray-200 text-gray-800"
                )}
                style={{ opacity: opacity / 100, width: sidebarWidth }}
            >
                {/* Resizer Handle */}
                <div 
                    ref={resizerRef}
                    className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-atc-blue/50 z-50 transition-colors"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsResizing(true);
                    }}
                />

                {/* 1. Header */}
                <div className={clsx(
                    "p-4 border-b flex justify-between items-center transition-colors duration-500",
                    isHuman ? "bg-red-500/10 border-red-500/30" : (isDark ? "border-gray-800" : "border-gray-200")
                )}>
                    <div className="flex items-center gap-2">
                        <div className={clsx("w-3 h-3 rounded-full animate-pulse", isHuman ? "bg-red-500" : "bg-atc-blue")} />
                        <span className={clsx("font-mono font-bold tracking-widest text-sm", isHuman ? "text-red-500" : "text-atc-blue")}>
                            {isHuman ? "ADMIN CONTROL" : "SYSTEM ONLINE"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Radar Toggle */}
                        <CustomTooltip text="Toggle Radar" position="bottom">
                            <button 
                                onClick={() => setShowRadar(!showRadar)} 
                                className={clsx("p-2 rounded-full transition-colors relative z-[60]", showRadar ? "bg-atc-blue/20 text-atc-blue" : "hover:bg-gray-500/20 text-gray-500")}
                            >
                                <RadarIcon className="w-4 h-4" />
                            </button>
                        </CustomTooltip>
                        
                        <div className="w-px h-4 bg-gray-500/20 mx-1" />

                        <CustomTooltip text="Settings" position="bottom">
                            <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-gray-500/20 transition-colors relative z-[60]">
                                <Settings className="w-4 h-4" />
                            </button>
                        </CustomTooltip>
                        <CustomTooltip text="Theme" position="bottom">
                            <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-full hover:bg-gray-500/20 transition-colors relative z-[60]">
                                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>
                        </CustomTooltip>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden w-full custom-scrollbar p-6 space-y-6">
                    
                    {/* 2. Radar (Conditional) */}
                    {showRadar && (
                        <div className="w-full aspect-square flex justify-center items-center scale-90 -my-4">
                            <Radar state={state} agents={agents} />
                        </div>
                    )}

                    {/* 3. Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 w-full">
                        <CustomTooltip text="Average response time" fullWidth>
                            <MetricBox label="LATENCY" value={`${state.latency}ms`} isDark={isDark} showChart />
                        </CustomTooltip>
                        <CustomTooltip text="Total conflicts" fullWidth>
                            <MetricBox label="COLLISIONS" value={state.collisionCount} isDark={isDark} color="text-red-500" showChart />
                        </CustomTooltip>
                        <CustomTooltip text="Simulation duration" fullWidth>
                            <MetricBox label="UPTIME" value={formatTime(uptime)} isDark={isDark} />
                        </CustomTooltip>
                        <CustomTooltip text="Success rate" fullWidth align="right">
                            <MetricBox label="SUCCESS" value={`${successRate}%`} isDark={isDark} color="text-green-500" />
                        </CustomTooltip>
                    </div>

                    {/* Controller Status Display */}
                    <div className={clsx("w-full p-2 rounded-lg border flex justify-between items-center", isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-100 border-gray-200")}>
                        <CustomTooltip text="Current access authority status" align="left">
                            <span className="text-[10px] uppercase font-bold opacity-60 cursor-help">CONTROLLER</span>
                        </CustomTooltip>
                        <CustomTooltip text={state.holder || "System Idle"} align="right">
                            <span className={clsx("font-mono font-bold truncate max-w-[200px]", isHuman ? "text-red-500" : "text-atc-purple")}>
                                {state.holder || "IDLE"}
                            </span>
                        </CustomTooltip>
                    </div>

                    {/* 4. System Congestion & 5. Emergency Button */}
                    <div className={clsx("p-4 rounded-xl border", isDark ? "bg-gray-800/30 border-gray-700" : "bg-gray-50 border-gray-200")}>
                        <div className="flex justify-between items-center mb-4">
                            <CustomTooltip text="Adjust traffic volume" align="left">
                                <span className="text-xs font-bold opacity-70 cursor-help">SYSTEM CONGESTION</span>
                            </CustomTooltip>
                            <span className="text-xs font-mono text-atc-purple bg-atc-purple/10 px-2 py-0.5 rounded">LOAD: {sliderValue}</span>
                        </div>
                        
                        <input type="range" min="0" max="10" value={sliderValue} onChange={(e) => handleScale(parseInt(e.target.value))} className="w-full accent-atc-purple cursor-pointer mb-6" />

                        <div className="w-full">
                            {!isHuman ? (
                                <CustomTooltip text="Force system override" fullWidth>
                                    <button
                                        onClick={handleOverride}
                                        disabled={state.overrideSignal || isOverrideLoading}
                                        className={clsx(
                                            "w-full p-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-all border text-sm",
                                            state.overrideSignal || isOverrideLoading 
                                                ? "opacity-50 cursor-wait bg-red-600 border-red-500 text-white" 
                                                : "bg-atc-blue/10 text-atc-blue border-atc-blue/30 hover:bg-atc-blue/20"
                                        )}
                                    >
                                        <Fingerprint className="w-4 h-4" />
                                        <span>{state.overrideSignal ? 'OVERRIDE...' : 'EMERGENCY TAKEOVER'}</span>
                                    </button>
                                </CustomTooltip>
                            ) : (
                                <CustomTooltip text="Yield to system" fullWidth>
                                    <button onClick={releaseLock} className="w-full p-3 rounded-lg flex items-center justify-center gap-2 font-bold bg-green-500/10 text-green-500 border border-green-500/30 hover:bg-green-500/20 text-sm">
                                        <Shield className="w-4 h-4" /> RELEASE LOCK
                                    </button>
                                </CustomTooltip>
                            )}
                        </div>
                    </div>

                    {/* 6. Agent List */}
                    <div>
                        <div className="flex items-center justify-between mb-3 cursor-pointer select-none" onClick={() => setIsAgentListOpen(!isAgentListOpen)}>
                            <h3 className="text-xs font-bold opacity-50 flex items-center gap-2">
                                <Activity className="w-3 h-3" /> ACTIVE AGENTS ({state.activeAgentCount || 0})
                            </h3>
                            <div className="flex items-center gap-3">
                                <CustomTooltip text="Stop All" position="left">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleGlobalStop(); }} 
                                        disabled={isHuman}
                                        className={clsx(
                                            "p-1.5 rounded transition-all", 
                                            globalStop ? "bg-red-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600",
                                            isHuman && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        {globalStop ? <Play className="w-3 h-3 fill-current" /> : <Square className="w-3 h-3 fill-current" />}
                                    </button>
                                </CustomTooltip>
                                {isAgentListOpen ? <ChevronUp className="w-3 h-3 opacity-50" /> : <ChevronDown className="w-3 h-3 opacity-50" />}
                            </div>
                        </div>

                        <AnimatePresence>
                            {isAgentListOpen && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="space-y-2">
                                        {agents.length > 0 && (
                                            [...agents]
                                            .sort((a, b) => a.id.localeCompare(b.id, undefined, {numeric: true}))
                                            .map(agent => (
                                                <AgentRow 
                                                    key={agent.id} 
                                                    agent={agent} 
                                                    isDark={isDark} 
                                                    onTogglePause={() => togglePause(agent.id, agent.status)}
                                                    disabled={isHuman} 
                                                    isHolder={state.holder === agent.id}
                                                />
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                 {/* Footer: Opacity & Dual Mute Controls */}
                <div className={clsx("p-4 border-t flex flex-col gap-3", isDark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-gray-50")}>
                    {/* Opacity Slider */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold opacity-50 w-12">OPACITY</span>
                        <input type="range" min="50" max="100" value={opacity} onChange={(e) => setOpacity(e.target.value)} className="flex-1 accent-gray-500 h-1" />
                    </div>
                    
                    {/* Dual Audio Mixer */}
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                             <CustomTooltip text="System/Admin Sounds">
                                <button 
                                    onClick={() => setIsAdminMuted(!isAdminMuted)}
                                    className={clsx("flex items-center gap-2 p-1.5 rounded transition-colors border", 
                                        isAdminMuted ? "bg-red-500/10 text-red-500 border-red-500/30" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                                    )}
                                >
                                    {isAdminMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                                    <span className="text-[9px] font-bold">SYS</span>
                                </button>
                             </CustomTooltip>
                             
                             <CustomTooltip text="Agent Comms Sounds">
                                <button 
                                    onClick={() => setIsAgentMuted(!isAgentMuted)}
                                    className={clsx("flex items-center gap-2 p-1.5 rounded transition-colors border", 
                                        isAgentMuted ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                                    )}
                                >
                                    {isAgentMuted ? <VolumeX className="w-3 h-3" /> : <Radio className="w-3 h-3" />}
                                    <span className="text-[9px] font-bold">NET</span>
                                </button>
                             </CustomTooltip>
                        </div>
                        <div className="text-[9px] opacity-30 font-mono">AUDIO MIXER</div>
                    </div>
                </div>
            </aside>
        </div>

        {/* Floating Tactical Panel (Independent Draggable) */}
        {showTacticalPanel && (
            <AgentTacticalPanel 
                agents={agents}
                activeAgentCount={state.activeAgentCount}
                globalStop={globalStop}
                toggleGlobalStop={toggleGlobalStop}
                isDark={isDark}
                isHuman={isHuman}
                onTogglePause={togglePause}
                startRenaming={startRenaming}
                submitRename={submitRename}
                terminateAgent={terminateAgent}
                renamingId={renamingId}
                setRenamingId={setRenamingId}
                newName={newName}
                setNewName={setNewName}
            />
        )}

        {isSettingsOpen && (
            <AgentSettings 
                agents={agents} 
                onClose={() => setIsSettingsOpen(false)} 
                isDark={isDark} 
            />
        )}
    </>
  );
};
