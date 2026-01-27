import React, { useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import clsx from 'clsx';
import { useATC } from '../context/ATCContext';
import { Volume2, VolumeX, ArrowDownCircle, ChevronDown } from 'lucide-react'; // Added Icons
import { Tooltip } from './Tooltip';

export const TerminalLog = () => {
  const { state, isDark, isAdminMuted, isAgentMuted, sidebarWidth } = useATC();
  
  interface Log {
      id: string;
      timestamp: string;
      type: string;
      message: string;
  }

  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState('ALL'); // ALL | CRITICAL | WARN | INFO
  const [autoScroll, setAutoScroll] = useState(true); // Restored Auto-scroll
  const [isMuted, setIsMuted] = useState(false); // Restored Local Mute
  const [isCollapsed, setIsCollapsed] = useState(false); // New Collapse State

  const nodeRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null); // Added scroll container ref

  // Sound Refs (Using AudioContext from Context is better, but local logic here for specific log sounds if needed)
  // For now, we rely on global sounds, but this component was doing its own thing? 
  // No, the original only displayed logs.

  useEffect(() => {
      // Logic to add logs based on state changes
      if (state.overrideSignal) {
          addLog('critical', '⚠️ EMERGENCY OVERRIDE INITIATED BY ADMIN');
      }
      if (state.holder && !state.holder.includes('Human')) {
          addLog('info', `🔒 Lock Acquired by ${state.holder} (Latency: ${state.latency}ms)`);
      }
      if (state.collisionCount > 0 && Math.random() > 0.7) {
           // Sample collisions to avoid spam
           addLog('warn', `💥 Collision Detected in Sector ${Math.floor(Math.random()*9)}`);
      }
  }, [state.overrideSignal, state.holder, state.collisionCount]);

  const addLog = (type: string, message: string) => {
      setLogs(prev => [...prev.slice(-49), { 
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
          timestamp: new Date().toLocaleTimeString(), 
          type, 
          message 
      }]);
  };

  useEffect(() => {
      if (autoScroll) {
          endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(l => filter === 'ALL' || l.type === filter.toLowerCase());

  return (
      <Draggable nodeRef={nodeRef} handle=".handle" bounds="body">
            <div 
                ref={nodeRef} 
                className="fixed bottom-10 z-40 flex flex-col items-start font-mono min-w-0 overflow-visible"
                style={{ right: sidebarWidth + 20 }}
            >
                {/* Resize Handles */}
                <div className={clsx(
                    "w-[400px] rounded-lg border shadow-xl backdrop-blur-md flex flex-col text-xs transition-none overflow-visible z-[10000]",
                    isDark ? "bg-[#0d1117]/90 border-gray-800 text-gray-300" : "bg-slate-50/80 border-slate-200/40 text-slate-800",
                    isCollapsed ? "h-10" : "h-[200px]"
                )}>
                    {/* Header */}
                    <div className={clsx("flex justify-between items-center p-2 border-b handle cursor-move h-10 shrink-0 rounded-t-lg overflow-visible",
                        isDark ? "bg-gray-800/20 border-gray-800" : "bg-white/40 border-slate-200/40"
                    )}>
                        <span className="font-bold flex items-center gap-2 font-mono tracking-[0.2em] uppercase text-xs">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            <Tooltip content="System Event Log" position="bottom-right">
                                TERMINAL_OUT
                            </Tooltip>
                        </span>
                        <div className="flex items-center gap-2">
                             {/* Restored Controls */}
                             {!isCollapsed && (
                                 <>
                                    <Tooltip content="Toggle Auto-scroll" position="bottom">
                                        <button 
                                            onClick={() => setAutoScroll(!autoScroll)}
                                            className={clsx("p-1 rounded transition-none", autoScroll ? "text-green-500" : "text-gray-500")}
                                        >
                                            <ArrowDownCircle size={12} />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content={isMuted ? "Unmute Logs" : "Mute Logs"} position="bottom">
                                        <button 
                                            onClick={() => setIsMuted(!isMuted)}
                                            className={clsx("p-1 rounded transition-none", isMuted ? "text-red-500" : "text-gray-500")}
                                        >
                                            {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                        </button>
                                    </Tooltip>
                                    <div className="w-px h-3 bg-white/10 mx-1" />
                                    
                                    {['ALL', 'CRITICAL', 'INFO'].map(f => (
                                        <button 
                                            key={f}
                                            onClick={() => setFilter(f)}
                                            className={clsx("px-1.5 py-0.5 rounded text-[9px] transition-none", filter === f ? "bg-blue-500 text-white" : "hover:bg-white/10")}
                                        >
                                            {f}
                                        </button>
                                    ))}
                                 </>
                             )}
                             
                             {/* Collapse Toggle (Moved to Right) */}
                             <button 
                                 onClick={() => setIsCollapsed(!isCollapsed)}
                                 className={clsx("p-1 rounded hover:bg-white/10 transition-none", isCollapsed && "rotate-180")}
                             >
                                 <ChevronDown size={14} />
                             </button>
                        </div>
                    </div>

                    {/* Logs */}
                    {!isCollapsed && (
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 font-mono rounded-b-lg">
                            {filteredLogs.map(log => (
                                <div key={log.id} className="flex gap-2 leading-tight">
                                    <span className="opacity-50 select-none">[{log.timestamp}]</span>
                                    <span className={clsx(
                                        "break-all whitespace-pre-wrap font-mono text-[11px]",
                                        log.type === 'critical' ? 'text-red-500 font-bold animate-pulse' : 
                                        log.type === 'warn' ? 'text-yellow-500' :
                                        'opacity-90'
                                    )}>
                                        {log.type === 'critical' && '>> '}
                                        {log.message}
                                    </span>
                                </div>
                            ))}
                            <div ref={endRef} />
                        </div>
                    )}
                </div>
            </div>
      </Draggable>
  );
};
