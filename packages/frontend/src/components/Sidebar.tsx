import React, { useRef } from 'react';
import clsx from 'clsx';
import { Radar } from './Radar';
import { AgentTacticalPanel } from './AgentTacticalPanel';
import { AgentSettings } from './sidebar/AgentSettings';
import { Tooltip } from './Tooltip';
import { 
    Play, Pause, Square, Lock, Unlock, 
    Activity, ShieldAlert, Cpu, Radio,
    Volume2, VolumeX, Speaker, MicOff,
    MoreHorizontal, Settings, GripVertical, ChevronDown, X
} from 'lucide-react';
import { useATC } from '../context/ATCContext';

export const Sidebar = () => {
  const {
    state,
    triggerOverride,
    releaseLock,
    setTrafficIntensity,
    isDark,
    setIsDark,
    agents,
    viewMode,
    setViewMode,
    selectedAgentId,
    setSelectedAgentId,
    isAdminMuted,
    setIsAdminMuted,
    isAgentMuted,
    setIsAgentMuted,
    sidebarWidth,
    setSidebarWidth: setWidth,
    // New Actions
    terminateAgent,
    togglePause,
    toggleGlobalStop,
  } = useATC();

  const resizerRef = useRef<HTMLDivElement>(null);
  
  // Local UI state can remain here if it's purely for Sidebar animation/interaction
  // or moved to Context if needed globally. Keeping simple UI state local is fine.
  const [opacity, setOpacity] = React.useState(100);
  const [sliderValue, setSliderValue] = React.useState(2);
  const [isOverrideLoading, setIsOverrideLoading] = React.useState(false);
  const [isAgentListOpen, setIsAgentListOpen] = React.useState(true);
  const [uptime, setUptime] = React.useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [renamingId, setRenamingId] = React.useState(null);
  const [newName, setNewName] = React.useState('');
  const [showRadar, setShowRadar] = React.useState(true);
  const [isResizing, setIsResizing] = React.useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => setUptime(u => u + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update slider when active count changes (external update)
  React.useEffect(() => {
      if (state.activeAgentCount !== undefined) {
          setSliderValue(state.activeAgentCount);
      }
  }, [state.activeAgentCount]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseInt(e.target.value);
      setSliderValue(val);
      setTrafficIntensity(val);
  };

  const handleOverride = async () => {
    setIsOverrideLoading(true);
    await triggerOverride();
    setTimeout(() => setIsOverrideLoading(false), 500);
  };

  const formatUptime = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  };

    // Resizing Logic - Direct DOM Manipulation for 0ms Latency
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
        
        // Disable transitions on sidebar during drag
        if (sidebarRef.current) {
            sidebarRef.current.style.transition = 'none';
        }
    };

    // Ref for the sidebar element to manipulate directly
    const sidebarRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isResizing) return;
          
          // Direct DOM manipulation
          const newWidth = window.innerWidth - e.clientX;
          if (newWidth > 300 && newWidth < 800) {
              if (sidebarRef.current) {
                  sidebarRef.current.style.width = `${newWidth}px`;
                  // Also update the resizer position if it's separate, but here it's absolute right of screen - width
                  // Actually resizer is fixed right: sidebarWidth. So we need to update that too if it's not child of sidebar.
                  // Resizer is: style={{ right: sidebarWidth }}
                  if (resizerRef.current) {
                      resizerRef.current.style.right = `${newWidth}px`;
                  }
              }
          }
      };
  
      const handleMouseUp = (e: MouseEvent) => {
          if (isResizing) {
            setIsResizing(false);
            // Sync final state
            const newWidth = window.innerWidth - e.clientX;
             if (newWidth > 300 && newWidth < 800) {
                setWidth(newWidth);
             }
             // Re-enable transitions if needed (though we removed them globally for perf)
          }
      };
  
      if (isResizing) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
      } else {
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
      }
  
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
      };
    }, [isResizing, setWidth]);


  const isHuman = state.holder && state.holder.includes('Human');

  return (
      <>
        {/* Resizer Handle */}
        <div 
            ref={resizerRef}
            className="fixed top-0 bottom-0 z-[60] w-1 cursor-col-resize hover:bg-blue-500/50 transition-colors"
            style={{ right: sidebarWidth }}
            onMouseDown={handleMouseDown}
        />

            {/* Integrated Sidebar (Right) */}
            <aside 
                ref={sidebarRef}
                className={clsx(
                    "h-full border-l flex flex-col transition-none shadow-2xl backdrop-blur-md z-50 pointer-events-auto relative shrink-0 overflow-visible",
                    isDark ? "bg-[#0d1117]/90 border-gray-800 text-gray-300" : "bg-slate-50/80 border-slate-200/40 text-slate-800"
                )}
                style={{ opacity: opacity / 100, width: sidebarWidth }}
            >
                {/* 1. Header */}
                <div className={clsx(
                    "p-4 border-b flex justify-between items-center transition-colors duration-500 min-w-0",
                    isHuman ? "bg-red-500/10 border-red-500/30" : (isDark ? "border-gray-800" : "border-slate-200/40")
                )}>
                    <div className="flex items-center gap-3">
                        <div className={clsx("p-2 rounded-lg min-w-0", isHuman ? "bg-red-500 text-white animate-pulse" : (isDark ? "bg-gray-800 text-blue-400" : "bg-white text-blue-600 shadow-sm"))}>
                           {isHuman ? <ShieldAlert size={20} /> : <Activity size={20} />}
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-bold text-sm tracking-wide min-w-0">
                                <Tooltip content="Main Control Panel" position="bottom">
                                    TRAFFIC CONTROL
                                </Tooltip>
                            </h2>
                            <div className="flex items-center gap-2 text-[10px] opacity-60 font-mono min-w-0">
                                <span className={clsx("w-1.5 h-1.5 rounded-full", isHuman ? "bg-red-500" : "bg-emerald-500")}></span>
                                {isHuman ? "MANUAL OVERRIDE" : "AUTONOMOUS"}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                        <Tooltip content="Toggle Theme" position="bottom">
                            <button 
                                onClick={() => setIsDark(!isDark)}
                                className={clsx("p-2 rounded-md transition-all min-w-0", isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-slate-200 text-slate-500")}
                            >
                                {isDark ? "🌙" : "☀️"}
                            </button>
                        </Tooltip>
                        <Tooltip content="System Settings" position="bottom-left">
                            <button 
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                className={clsx("p-2 rounded-md transition-all min-w-0", isSettingsOpen ? "bg-blue-500/20 text-blue-500" : (isDark ? "hover:bg-gray-800 text-gray-400" : "hover:bg-slate-200 text-slate-500"))}
                            >
                                <Settings size={16} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Control Panel (Audio + Emergency) */}
                <div className={clsx(
                    "p-2.5 border-b z-20 relative shrink-0 grid grid-cols-[auto_1fr] gap-1 h-20 items-center min-w-0",
                    isDark ? "border-gray-800 bg-gray-900/50" : "border-slate-200 bg-slate-50/50"
                )}>
                    {/* Left Col: Audio Controls (Unified) */}
                    <div className="flex flex-col gap-1 min-w-0">
                        {/* Master Mute (System + Network) */}
                        <Tooltip content={isAdminMuted ? "Unmute All" : "Mute All"}>
                            <button 
                                onClick={() => {
                                    const newState = !isAdminMuted;
                                    setIsAdminMuted(newState);
                                    setIsAgentMuted(newState);
                                }}
                                className={clsx(
                                    "h-[60px] w-14 rounded flex flex-col items-center justify-center gap-1 transition-none border min-w-0",
                                    isAdminMuted 
                                        ? (isDark ? "bg-red-900/20 border-red-800/50 text-red-400" : "bg-red-50 border-red-200 text-red-500")
                                        : (isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300" : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600")
                                )}
                            >
                                {isAdminMuted ? <VolumeX size={16} /> : <Speaker size={16} />}
                                <span className="text-[9px] font-bold">AUDIO</span>
                            </button>
                        </Tooltip>
                    </div>

                    {/* Right Col: Emergency - Height matched to 60px */}
                    <div className="flex items-center h-full min-w-0">
                         {isHuman ? (
                             <button
                                 onClick={releaseLock}
                                 className="h-[60px] w-full rounded bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-[10px] tracking-wider shadow-lg shadow-emerald-900/20 flex flex-col items-center justify-center gap-1 transition-all min-w-0"
                             >
                                 <Unlock size={16} />
                                 <span>RELEASE LOCK</span>
                             </button>
                         ) : (
                             <Tooltip content="Force Manual Control" position="top" className="w-full h-full">
                                <button
                                    onClick={handleOverride}
                                    disabled={isOverrideLoading}
                                    className={clsx(
                                        "h-[60px] w-full rounded font-bold text-[10px] tracking-wider shadow-lg flex flex-col items-center justify-center gap-1 transition-all min-w-0",
                                        isOverrideLoading 
                                            ? "bg-gray-600 cursor-wait opacity-50"
                                            : "bg-red-500 hover:bg-red-600 text-white shadow-red-900/20 hover:scale-[1.02] active:scale-[0.98]"
                                    )}
                                >
                                    {isOverrideLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Lock size={16} />
                                            <span>EMERGENCY TAKEOVER</span>
                                        </>
                                    )}
                                </button>
                             </Tooltip>
                         )}
                    </div>
                </div>

                {/* 2. Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 min-w-0">
                    
                    {/* System Congestion (Moved inside scroll) */}
                    <div className="space-y-3 min-w-0">
                        <div className="flex justify-between items-end min-w-0">
                            <label className={clsx("text-xs font-bold uppercase tracking-wider flex items-center gap-2 min-w-0", isDark ? "text-gray-400" : "text-slate-500")}>
                                <Cpu size={14} />
                                <Tooltip content="Current System Load" position="bottom">
                                    System Congestion
                                </Tooltip>
                            </label>
                            <span className={clsx("text-xs font-mono min-w-0", isDark ? "text-blue-400" : "text-blue-600")}>
                                {state.activeAgentCount} / 10
                            </span>
                        </div>
                        <div className="relative pt-1 min-w-0">
                            <input 
                                type="range" 
                                min="0" 
                                max="10" 
                                step="1"
                                value={sliderValue}
                                onChange={handleSliderChange}
                                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                             {/* Scale Numbers */}
                            <div className={clsx("flex justify-between text-[9px] font-mono mt-1 select-none min-w-0", isDark ? "text-gray-600" : "text-slate-400")}>
                                <span>0</span>
                                <span>5</span>
                                <span>10</span>
                            </div>
                        </div>
                    </div>

                    {/* Mini Radar Preview */}
                    <div className="space-y-3 min-w-0">
                         <div className="flex justify-between items-center min-w-0">
                            <label className={clsx("text-xs font-bold uppercase tracking-wider flex items-center gap-2 min-w-0", isDark ? "text-gray-400" : "text-slate-500")}>
                                <Radio size={14} />
                                <Tooltip content="Live Sector Preview" position="bottom">
                                    Sector Scan
                                </Tooltip>
                            </label>
                             <Tooltip content={viewMode === 'attached' ? "Detach View" : "Attach View"} position="left">
                                <button 
                                    onClick={() => {
                                        if (viewMode === 'attached') setViewMode('detached');
                                        else setViewMode('attached');
                                    }}
                                    className={clsx("text-[10px] px-2 py-0.5 rounded border transition-colors min-w-0", 
                                        viewMode === 'detached' 
                                            ? (isDark ? "bg-blue-900/30 border-blue-800 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-600")
                                            : (isDark ? "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700" : "bg-white border-slate-200 text-slate-500")
                                    )}
                                >
                                    {viewMode === 'attached' ? 'DETACH VIEW' : 'ATTACH VIEW'}
                                </button>
                             </Tooltip>
                        </div>

                        {showRadar && (
                            <div className={clsx("h-48 rounded-lg overflow-hidden border relative min-w-0", isDark ? "border-gray-800 bg-black" : "border-slate-200 bg-slate-100")}>
                                <Radar compact={true} />
                                {viewMode === 'detached' && (
                                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                        <span className="text-xs font-mono text-white/70">RADAR DETACHED</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Agent List */}
                    <div className="space-y-3 min-w-0">
                         <div 
                            className="flex justify-between items-center cursor-pointer group min-w-0"
                            onClick={() => setIsAgentListOpen(!isAgentListOpen)}
                        >
                            <label className={clsx("text-xs font-bold uppercase tracking-wider flex items-center gap-2 min-w-0", isDark ? "text-gray-400" : "text-slate-500")}>
                                <Activity size={14} />
                                <Tooltip content="Connected Agents List" position="bottom">
                                    Active Links ({agents.length})
                                </Tooltip>
                            </label>
                            <div className="flex items-center gap-2">
                                {/* Global Pause Button */}
                                <Tooltip content={state.globalStop ? "Resume All Agents" : "Pause All Agents"} position="left">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            console.log('[SIDEBAR] Global Toggle Clicked');
                                            toggleGlobalStop();
                                        }}
                                        className={clsx("p-1 rounded shadow-sm flex items-center justify-center transition-none z-30", 
                                            state.globalStop 
                                                ? "bg-red-500 text-white animate-pulse border border-red-400" 
                                                : (isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700" : "bg-white hover:bg-slate-100 text-slate-500 border border-slate-300 shadow-sm")
                                        )}
                                    >
                                        {state.globalStop ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                                    </button>
                                </Tooltip>
                                <ChevronDown size={14} className={clsx("transition-transform min-w-0", !isAgentListOpen ? "rotate-180" : "", isDark ? "text-gray-600" : "text-slate-400")} />
                            </div>
                        </div>

                        {isAgentListOpen && (
                            <div className="space-y-2 min-w-0">
                                {agents.map(agent => (
                                    <div 
                                        key={agent.id}
                                        onClick={() => setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)}
                                        className={clsx(
                                            "p-3 rounded border cursor-pointer transition-all relative overflow-hidden group min-w-0",
                                            state.holder === agent.id 
                                                ? "bg-emerald-500/10 border-emerald-500/50" 
                                                : (agent.status === 'paused' 
                                                    ? "bg-red-900/80 border-red-500 text-white" // Removed grayscale, increased opacity, explicit text color
                                                    : (agent.id === selectedAgentId 
                                                        ? (isDark ? "bg-blue-900/20 border-blue-500/50" : "bg-blue-50 border-blue-300")
                                                        : (isDark ? "bg-gray-800/50 border-gray-800 hover:bg-gray-800" : "bg-white border-slate-200 hover:border-slate-300")))
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={clsx("font-mono text-xs font-bold min-w-0 flex items-center gap-1", isDark ? "text-gray-300" : "text-slate-700")}>
                                                    {agent.id}
                                                    {agent.status === 'paused' && <Pause size={8} className="text-red-500 fill-current" />}
                                                </span>
                                                {/* In-List Controls */}
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            togglePause(agent.id, agent.status === 'paused');
                                                        }}
                                                        className={clsx("p-0.5 rounded", isDark ? "hover:bg-white/10" : "hover:bg-black/5")}
                                                    >
                                                        {agent.status === 'paused' ? <Play size={10} /> : <Pause size={10} />}
                                                    </button>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            terminateAgent(agent.id);
                                                        }}
                                                        className={clsx("p-0.5 rounded", isDark ? "hover:bg-white/10 hover:text-red-400" : "hover:bg-black/5 hover:text-red-600")}
                                                        title="Terminate"
                                                    >
                                                        <Square size={10} />
                                                    </button>
                                                </div>
                                            </div>

                                            {state.holder === agent.id && (
                                                <span className="text-[10px] font-bold text-emerald-500 animate-pulse min-w-0">LOCKED</span>
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center min-w-0">
                                            <span className={clsx("text-[10px] min-w-0", isDark ? "text-gray-500" : "text-slate-500")}>
                                                {agent.activity || "Idle"}
                                            </span>
                                            <span className={clsx("text-[9px] px-1.5 py-0.5 rounded min-w-0", isDark ? "bg-gray-700 text-gray-400" : "bg-slate-100 text-slate-500")}>
                                                {agent.model}
                                            </span>
                                        </div>
                                        
                                        {/* Detail View Expansion */}
                                        {agent.id === selectedAgentId && (
                                            <div className="mt-2 pt-2 border-t border-dashed border-gray-700/50 text-[10px] font-mono space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="opacity-50">PRIORITY</span>
                                                    <span>{agent.priority || 'NORMAL'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="opacity-50">LAST ACTIVE</span>
                                                    <span>{agent.lastActive ? new Date(agent.lastActive).toLocaleTimeString() : '-'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="opacity-50">RESOURCE</span>
                                                    <span className="truncate max-w-[100px]">{agent.resource || 'N/A'}</span>
                                                </div>
                                                <div className="flex gap-2 mt-2">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            terminateAgent(agent.id);
                                                        }}
                                                        className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-1 rounded text-center"
                                                    >
                                                        TERMINATE
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Progress Bar (Simulated) */}
                                        {state.holder === agent.id && (
                                            <div className="absolute bottom-0 left-0 h-0.5 bg-emerald-500 animate-progress w-full" />
                                        )}
                                    </div>
                                ))}
                                {agents.length === 0 && (
                                    <div className={clsx("text-center py-8 text-xs italic min-w-0", isDark ? "text-gray-700" : "text-slate-400")}>
                                        No Active Agents
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Footer (Status Bar) */}
                <div className={clsx(
                    "p-3 border-t text-[10px] font-mono flex justify-between items-center min-w-0",
                    isDark ? "border-gray-800 bg-[#0d1117] text-gray-600" : "border-slate-200 bg-white text-slate-400"
                )}>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            ONLINE
                        </span>
                        <span>v2.4.0-RC</span>
                    </div>
                    <span className="min-w-0">UPTIME: {formatUptime(uptime)}</span>
                </div>
            </aside>

        {/* Floating Tactical Panel (Independent Draggable) - Always Rendered */}
        <AgentTacticalPanel />
        {isSettingsOpen && agents && <AgentSettings onClose={() => setIsSettingsOpen(false)} />}
      </>
  );
};

// Helper for isHuman
// Removed placeholder

