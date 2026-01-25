import React, { useState, useEffect } from 'react';
import { Pause, Play, Activity, Sun, Moon, Fingerprint, Shield, ChevronDown, ChevronUp, Square, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { API_URL } from '../hooks/useATC';
import { Radar } from './Radar';
import { CustomTooltip } from './sidebar/CustomTooltip';
import { MetricBox } from './sidebar/MetricBox';
import { AgentRow } from './sidebar/AgentRow';

export const Sidebar = ({ state, triggerOverride, releaseLock, setTrafficIntensity }) => {
  const [agents, setAgents] = useState([]);
  const [globalStop, setGlobalStop] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [opacity, setOpacity] = useState(100);
  const [width, setWidth] = useState(450);
  const [sliderValue, setSliderValue] = useState(2);
  const [isOverrideLoading, setIsOverrideLoading] = useState(false);
  const [isAgentListOpen, setIsAgentListOpen] = useState(true);
  const [uptime, setUptime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

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

  const startResizing = (mouseDownEvent) => {
      const startWidth = width;
      const startX = mouseDownEvent.clientX;
      const onMouseMove = (mouseMoveEvent) => {
          const newWidth = startWidth - (mouseMoveEvent.clientX - startX);
          if (newWidth > 350 && newWidth < 800) setWidth(newWidth);
      };
      const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
  };

  const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const successRate = state.collisionCount > 0 ? Math.max(0, 100 - (state.collisionCount * 2)) : 100;
  const isHuman = state.holder?.includes('Human');
  
  return (
    <aside 
        className={clsx(
            "fixed right-0 top-0 h-screen flex flex-col border-l transition-colors duration-300 shadow-2xl backdrop-blur-md z-50 overflow-hidden",
            isDark ? "bg-[#0d1117]/90 border-gray-800 text-gray-300" : "bg-white/90 border-gray-200 text-gray-800"
        )}
        style={{ opacity: opacity / 100, width: `${width}px` }}
    >
        <div className="absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-blue-500/50 transition-colors z-50" onMouseDown={startResizing} />

        {/* Header */}
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
                <CustomTooltip text="Toggle System Theme" position="bottom">
                    <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-full hover:bg-gray-500/20 transition-colors relative z-[60]">
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </CustomTooltip>
                <CustomTooltip text="Mute System Sounds" position="bottom" align="right">
                    <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className={clsx(
                            "p-2 rounded-full hover:bg-gray-500/20 transition-colors relative z-[60]",
                            isMuted ? "text-red-500" : "text-cyan-400"
                        )}
                    >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                </CustomTooltip>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full custom-scrollbar p-6 space-y-4">
            
            {/* 1. Radar Section */}
            <div className="flex flex-col items-center group relative -my-6">
                <CustomTooltip text="Real-time Traffic Radar" position="left" shiftLeft={true}>
                    <div className="scale-75 origin-top cursor-crosshair">
                        <Radar state={state} />
                    </div>
                </CustomTooltip>
            </div>

            {/* 2. Metrics Grid */}
            <div className="grid grid-cols-4 gap-2 w-full items-stretch">
                <CustomTooltip text="Average response time" fullWidth>
                    <MetricBox label="LATENCY" value={`${state.latency}ms`} isDark={isDark} />
                </CustomTooltip>
                <CustomTooltip text="Total conflicts" fullWidth>
                    <MetricBox label="COLLISIONS" value={state.collisionCount} isDark={isDark} color="text-red-500" />
                </CustomTooltip>
                <CustomTooltip text="Simulation duration" fullWidth>
                    <MetricBox label="UPTIME" value={formatTime(uptime)} isDark={isDark} />
                </CustomTooltip>
                <CustomTooltip text="Success rate" fullWidth align="right">
                    <MetricBox label="SUCCESS" value={`${successRate}%`} isDark={isDark} color="text-green-500" />
                </CustomTooltip>
            </div>

            {/* Controller Section */}
            <div className={clsx("w-full p-2 rounded-lg border flex justify-between items-center mt-2", isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-100 border-gray-200")}>
                <CustomTooltip text="Current access authority status" align="left">
                    <span className="text-[10px] uppercase font-bold opacity-60 cursor-help">CONTROLLER</span>
                </CustomTooltip>
                <CustomTooltip text={state.holder || "System Idle"} align="right">
                    <span className={clsx("font-mono font-bold truncate max-w-[200px]", isHuman ? "text-red-500" : "text-atc-purple")}>
                        {state.holder || "IDLE"}
                    </span>
                </CustomTooltip>
            </div>

            {/* 3. Controls */}
            <div className={clsx("p-4 rounded-xl border mt-4", isDark ? "bg-gray-800/30 border-gray-700" : "bg-gray-50 border-gray-200")}>
                <div className="flex justify-between items-center mb-4">
                    <CustomTooltip text="Adjust traffic volume" align="left">
                        <span className="text-xs font-bold opacity-70 cursor-help">TRAFFIC LOAD</span>
                    </CustomTooltip>
                    <span className="text-xs font-mono text-atc-purple bg-atc-purple/10 px-2 py-0.5 rounded">TARGET: {sliderValue}</span>
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

            {/* 4. Agent List */}
            <div>
                <div className="flex items-center justify-between mb-3 cursor-pointer select-none" onClick={() => setIsAgentListOpen(!isAgentListOpen)}>
                    <h3 className="text-xs font-bold opacity-50 flex items-center gap-2">
                        <Activity className="w-3 h-3" /> ACTIVE AGENTS ({state.activeAgentCount || 0})
                    </h3>
                    <div className="flex items-center gap-3">
                        <CustomTooltip text="Stop All" position="left">
                            <button onClick={(e) => { e.stopPropagation(); toggleGlobalStop(); }} className={clsx("p-1.5 rounded transition-all", globalStop ? "bg-red-500 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600")}>
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
                                    .slice(0, state.activeAgentCount || agents.length)
                                    .map(agent => (
                                        <AgentRow key={agent.id} agent={agent} isDark={isDark} onTogglePause={() => togglePause(agent.id, agent.status)} />
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>

        {/* Footer */}
        <div className={clsx("p-4 border-t flex items-center gap-4", isDark ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-gray-50")}>
            <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] font-bold opacity-50">OPACITY</span>
                <input type="range" min="50" max="100" value={opacity} onChange={(e) => setOpacity(e.target.value)} className="flex-1 accent-gray-500 h-1" />
            </div>
        </div>
    </aside>
  );
};
