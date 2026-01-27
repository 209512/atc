import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play, Activity, Sun, Moon, Fingerprint, Shield, ChevronDown, ChevronUp, Square, Volume2, VolumeX, Settings, Radar as RadarIcon, Mic, MicOff, Radio, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { API_URL } from '../hooks/useATC';
import { Radar } from './Radar';
import { CustomTooltip } from './sidebar/CustomTooltip';
import { MetricBox } from './sidebar/MetricBox';
import { AgentRow } from './sidebar/AgentRow';
import { AgentSettings } from './sidebar/AgentSettings';
import { AgentTacticalPanel } from './AgentTacticalPanel';

// --- Sortable Item Wrapper ---
function SortableAgentRow({ agent, isDark, togglePause, isHuman, isHolder, isSelected, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: agent.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  // Auto-scroll into view when selected
  const rowRef = useRef(null);
  useEffect(() => {
      if (isSelected && rowRef.current) {
          rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }, [isSelected]);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} onClick={onClick}>
       <div ref={rowRef}>
           <AgentRow 
                agent={agent} 
                isDark={isDark} 
                onTogglePause={() => togglePause(agent.id, agent.status)}
                disabled={isHuman} 
                isHolder={isHolder}
                className={clsx(isSelected && (isDark ? "ring-2 ring-blue-500 bg-blue-500/10" : "ring-2 ring-blue-500 bg-blue-50"))}
            />
       </div>
    </div>
  );
}

export const Sidebar = ({ 
    state, 
    triggerOverride, 
    releaseLock, 
    setTrafficIntensity, 
    isDark, 
    setIsDark,
    agents,
    setAgents,
    viewMode,
    setViewMode,
    selectedAgentId,
    setSelectedAgentId,
    isAdminMuted, // Prop from App.tsx
    setIsAdminMuted, // Prop from App.tsx
    isAgentMuted, // Prop from App.tsx
    setIsAgentMuted, // Prop from App.tsx
    width,
    setWidth
}) => {
  const resizerRef = useRef(null);

  const [globalStop, setGlobalStop] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const [sliderValue, setSliderValue] = useState(2);
  const [isOverrideLoading, setIsOverrideLoading] = useState(false);
  const [isAgentListOpen, setIsAgentListOpen] = useState(true);
  const [uptime, setUptime] = useState(0);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Tactical Panel State
  const [renamingId, setRenamingId] = useState(null);
  const [newName, setNewName] = useState('');
  
  // Radar Toggle (Local visibility in Sidebar)
  const [showRadar, setShowRadar] = useState(true);

  // Sidebar Resizing
  const [isResizing, setIsResizing] = useState(false);

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (state.activeAgentCount !== undefined) setSliderValue(state.activeAgentCount);
  }, [state.activeAgentCount]);

  useEffect(() => {
      const start = Date.now();
      const timer = setInterval(() => setUptime(Math.floor((Date.now() - start) / 1000)), 1000);
      return () => clearInterval(timer);
  }, []);

  // Resizing Logic
  useEffect(() => {
    const handleMouseMove = (e) => {
        if (!isResizing) return;
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 300 && newWidth < 800) {
            setWidth(newWidth);
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
  
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      setAgents((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
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
            {/* Integrated Sidebar (Right) */}
            <aside 
                className={clsx(
                    "h-full border-l flex flex-col transition-all duration-500 shadow-2xl backdrop-blur-md z-50 pointer-events-auto relative shrink-0 overflow-hidden",
                    isDark ? "bg-[#0d1117]/90 border-gray-800 text-gray-300" : "bg-slate-50/80 border-slate-200/40 text-slate-800"
                )}
                style={{ opacity: opacity / 100, width }}
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
                    "p-4 border-b flex justify-between items-center transition-colors duration-500 min-w-0",
                    isHuman ? "bg-red-500/10 border-red-500/30" : (isDark ? "border-gray-800" : "border-slate-200/40")
                )}>
                    <div className="flex items-center gap-2">
                        <div className={clsx("w-3 h-3 rounded-full animate-pulse", isHuman ? "bg-red-500" : "bg-atc-blue")} />
                        <span className={clsx("font-mono font-bold tracking-widest text-sm", isHuman ? "text-red-500" : (isDark ? "text-atc-blue" : "text-blue-600"))}>
                            {isHuman ? "ADMIN CONTROL" : "SYSTEM ONLINE"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Radar Detach (Maximize) */}
                        {viewMode === 'standard' && (
                             <CustomTooltip text="Detach Radar" position="bottom">
                                <button 
                                    onClick={() => setViewMode('detached')} 
                                    className={clsx("p-2 rounded-full transition-colors relative z-[60]", 
                                        isDark ? "hover:bg-gray-500/20 text-gray-400" : "hover:bg-slate-200 text-slate-400"
                                    )}
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                            </CustomTooltip>
                        )}

                        {/* Radar Toggle (Only visible if standard mode) */}
                         {viewMode === 'standard' && (
                            <CustomTooltip text="Toggle Radar" position="bottom">
                                <button 
                                    onClick={() => setShowRadar(!showRadar)} 
                                    className={clsx("p-2 rounded-full transition-colors relative z-[60]", 
                                        showRadar 
                                            ? (isDark ? "bg-atc-blue/20 text-atc-blue" : "bg-blue-100 text-blue-600")
                                            : (isDark ? "hover:bg-gray-500/20 text-gray-500" : "hover:bg-slate-200 text-slate-400")
                                    )}
                                >
                                    <RadarIcon className="w-4 h-4" />
                                </button>
                            </CustomTooltip>
                        )}
                        
                        <div className={clsx("w-px h-4 mx-1", isDark ? "bg-gray-500/20" : "bg-slate-300")} />

                        <CustomTooltip text="Settings" position="bottom">
                            <button onClick={() => setIsSettingsOpen(true)} className={clsx("p-2 rounded-full transition-colors relative z-[60]", isDark ? "hover:bg-gray-500/20" : "hover:bg-slate-200 text-slate-500")}>
                                <Settings className="w-4 h-4" />
                            </button>
                        </CustomTooltip>
                        <CustomTooltip text="Theme" position="bottom">
                            <button onClick={() => setIsDark(!isDark)} className={clsx("p-2 rounded-full transition-colors relative z-[60]", isDark ? "hover:bg-gray-500/20" : "hover:bg-slate-200 text-slate-500")}>
                                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>
                        </CustomTooltip>
                    </div>
                </div>

                {/* Control Panel (Audio + Emergency) */}
                <div className={clsx(
                    "p-2.5 border-b z-20 relative shrink-0 grid grid-cols-[auto_1fr] gap-2.5 h-20 items-center min-w-0",
                    isDark ? "border-gray-800 bg-gray-900/50" : "border-slate-200 bg-slate-50/50"
                )}>
                    
                    {/* Left Col: Audio Controls (28px + 4px + 28px = Total 60px) */}
                    <div className="flex flex-col gap-1">
                         <CustomTooltip text="System/Admin Sounds" position="right">
                            <button 
                                onClick={() => setIsAdminMuted(!isAdminMuted)} 
                                className={clsx(
                                    "flex items-center justify-center gap-1 px-2 w-14 h-[28px] rounded text-[9px] font-bold transition-colors border", 
                                    isAdminMuted 
                                        ? "bg-red-500/10 text-red-500 border-red-500/30" 
                                        : (isDark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-white border-slate-300 text-slate-500")
                                )}
                            >
                                {isAdminMuted ? <MicOff className="w-2.5 h-2.5" /> : <Mic className="w-2.5 h-2.5" />}
                                <span>SYS</span>
                            </button>
                         </CustomTooltip>
                         
                         <CustomTooltip text="Agent Comms Sounds" position="right">
                            <button 
                                onClick={() => setIsAgentMuted(!isAgentMuted)}
                                className={clsx(
                                    "flex items-center justify-center gap-1 px-2 w-14 h-[28px] rounded text-[9px] font-bold transition-colors border", 
                                    isAgentMuted 
                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/30" 
                                        : (isDark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-white border-slate-300 text-slate-500")
                                )}
                            >
                                {isAgentMuted ? <VolumeX className="w-2.5 h-2.5" /> : <Radio className="w-2.5 h-2.5" />}
                                <span>NET</span>
                            </button>
                         </CustomTooltip>
                    </div>

                    {/* Right Col: Emergency - Height matched to 60px */}
                    <div className="flex items-center h-full min-w-0">
                        <CustomTooltip text={isHuman ? "Yield to system" : "Force system override"} fullWidth>
                            <button
                                onClick={isHuman ? releaseLock : handleOverride}
                                disabled={!isHuman && (state.overrideSignal || isOverrideLoading)}
                                className={clsx(
                                    "w-full h-[60px] flex flex-col items-center justify-center font-bold transition-all border text-[9px] shadow-sm rounded-md uppercase leading-none",
                                    isHuman 
                                        ? "bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20" 
                                        : (isDark ? "bg-blue-900/20 text-blue-400 border-blue-800 hover:bg-blue-900/40" : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100")
                                )}
                            >
                                {isHuman ? <Shield className="w-4 h-4 mb-1" /> : <Fingerprint className="w-4 h-4 mb-1" />}
                                <div className="flex flex-col items-center gap-0.5">
                                    <span>{isHuman ? "Release" : "Emergency"}</span>
                                    <span>{isHuman ? "Lock" : "Takeover"}</span>
                                </div>
                            </button>
                        </CustomTooltip>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden w-full custom-scrollbar p-6 space-y-6">
                    
                    {/* 2. Radar (Conditional) */}
                    {viewMode === 'detached' ? (
                        // Placeholder when detached to prevent layout shift or empty space
                         <div className={clsx("w-full p-4 rounded-xl border flex items-center justify-between", isDark ? "border-gray-800 bg-gray-900/50" : "border-slate-200 bg-slate-50/50")}>
                             <div className="flex items-center gap-3">
                                <RadarIcon className="w-5 h-5 opacity-40" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold opacity-70">RADAR ACTIVE</span>
                                    <span className="text-[10px] opacity-40">Main Screen</span>
                                </div>
                             </div>
                             <button 
                                onClick={() => setViewMode('standard')}
                                className={clsx("px-3 py-1.5 text-xs font-bold rounded-lg border transition-all", 
                                    isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700" : "bg-white border-slate-300 hover:bg-slate-100"
                                )}
                             >
                                 RESTORE
                             </button>
                        </div>
                    ) : (
                        showRadar && (
                            <div className="w-full aspect-square flex justify-center items-center scale-90 -my-4">
                                <Radar 
                                    state={state} 
                                    agents={agents} 
                                    isDark={isDark} 
                                    onAgentClick={setSelectedAgentId}
                                    selectedAgentId={selectedAgentId}
                                    compact={true}
                                />
                            </div>
                        )
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
                    <div className={clsx("w-full p-2 rounded-lg border flex justify-between items-center", isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-slate-200")}>
                        <CustomTooltip text="Current access authority status" align="left">
                            <span className="text-[10px] uppercase font-bold opacity-60 cursor-help">CONTROLLER</span>
                        </CustomTooltip>
                        <CustomTooltip text={state.holder || "System Idle"} align="right">
                            <span className={clsx("font-mono font-bold truncate max-w-[200px]", isHuman ? "text-red-500" : "text-atc-purple")}>
                                {state.holder || "IDLE"}
                            </span>
                        </CustomTooltip>
                    </div>

                    {/* System Congestion (Moved here) */}
                    <div className={clsx("p-3 rounded-lg border", isDark ? "bg-gray-800/30 border-gray-700" : "bg-white border-slate-200")}>
                        <div className="flex justify-between items-center mb-2">
                            <CustomTooltip text="Adjust traffic volume" align="left">
                                <span className="text-[10px] font-bold opacity-70 cursor-help">SYSTEM CONGESTION</span>
                            </CustomTooltip>
                            <span className="text-[10px] font-mono text-atc-purple bg-atc-purple/10 px-1.5 py-0.5 rounded">LOAD: {sliderValue}</span>
                        </div>
                        <input type="range" min="0" max="10" value={sliderValue} onChange={(e) => handleScale(parseInt(e.target.value))} className="w-full accent-atc-purple cursor-pointer h-1" />
                        <div className="flex justify-between text-[9px] font-mono opacity-40 mt-1.5 px-0.5">
                            <span>0</span>
                            <span>5</span>
                            <span>10</span>
                        </div>
                    </div>

                    {/* 6. Agent List (Sortable) */}
                    <div>
                        <div className="flex items-center justify-between mb-3 cursor-pointer select-none" onClick={() => setIsAgentListOpen(!isAgentListOpen)}>
                            <h3 className="text-xs font-bold opacity-50 flex items-center gap-2">
                                <Activity className="w-3 h-3" /> ACTIVE AGENTS ({agents.length})
                            </h3>
                            <div className="flex items-center gap-3">
                                <CustomTooltip text="Stop All" position="left">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleGlobalStop(); }} 
                                        disabled={isHuman}
                                        className={clsx(
                                            "p-1.5 rounded transition-all", 
                                            globalStop ? "bg-red-500 text-white" : (isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-slate-200 text-slate-600 hover:bg-slate-300"),
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
                                    <DndContext 
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext 
                                            items={agents.map(a => a.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-2">
                                                {agents.length > 0 && agents.map(agent => (
                                                    <SortableAgentRow 
                                                        key={agent.id} 
                                                        agent={agent} 
                                                        isDark={isDark} 
                                                        togglePause={togglePause}
                                                        isHuman={isHuman} 
                                                        isHolder={state.holder === agent.id}
                                                        isSelected={selectedAgentId === agent.id}
                                                        onClick={() => setSelectedAgentId(agent.id)}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                 {/* Footer: Opacity */}
                <div className={clsx("p-4 border-t flex flex-col gap-3", isDark ? "border-gray-800 bg-gray-900" : "border-slate-200 bg-slate-50")}>
                    {/* Opacity Slider */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold opacity-50 w-12">OPACITY</span>
                        <input type="range" min="50" max="100" value={opacity} onChange={(e) => setOpacity(e.target.value)} className="flex-1 accent-gray-500 h-1" />
                    </div>
                </div>
            </aside>

    {/* Floating Tactical Panel (Independent Draggable) - Always Rendered */}
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
            sidebarWidth={width}
        />

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
