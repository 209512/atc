import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Terminal, GripHorizontal, Volume2, VolumeX, ArrowUpFromLine, Lock, PlayCircle } from 'lucide-react';
import clsx from 'clsx';

// Note: You would normally import real sound files here.
// For this demo, we assume these files exist or use empty strings/placeholders.
// Ideally, add real mp3 files to public/sounds/
const SOUNDS = {
    LOCK: '/sounds/beep.mp3', 
    ERROR: '/sounds/buzz.mp3',
    ALERT: '/sounds/siren.mp3'
};

export const TerminalLog = ({ state, isDark, isAdminMuted, isAgentMuted, sidebarWidth = 450 }) => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL | CRITICAL | WARN | INFO
  const [isLocalMuted, setIsLocalMuted] = useState(false); // Local mute toggle
  const [autoScroll, setAutoScroll] = useState(true);
  const [height, setHeight] = useState(250);
  const [width, setWidth] = useState(600);
  
  const lastStateRef = useRef(state);
  const scrollRef = useRef(null);
  const nodeRef = useRef(null);

  // Audio Preloading
  const audioRefs = useRef({});

  useEffect(() => {
    const loadAudio = (key, src) => {
        const audio = new Audio(src);
        audio.volume = 0.2;
        audioRefs.current[key] = audio;
    };

    loadAudio('lock', 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    loadAudio('error', 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3');
    loadAudio('alert', 'https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3');
  }, []);

  // Immediate Mute Effect & Resume Logic
  useEffect(() => {
      const stopSound = (key) => {
          const audio = audioRefs.current[key];
          if (audio) {
              audio.pause();
              audio.currentTime = 0;
          }
      };

      const resumeSound = (key) => {
          const audio = audioRefs.current[key];
          if (audio && audio.paused) {
              audio.currentTime = 0;
              audio.play().catch(e => {});
          }
      };

      if (isLocalMuted) {
          Object.keys(audioRefs.current).forEach(stopSound);
      } else {
          // ADMIN Channel Logic
          if (isAdminMuted) {
              stopSound('alert');
              stopSound('error');
          } else {
              // Check if we need to resume Admin sounds (e.g. active override/alarm)
              const isHuman = state.holder?.includes('Human');
              const isOverride = state.overrideSignal;
              if (isHuman || isOverride) {
                  resumeSound('alert');
              }
          }

          // AGENT Channel Logic
          if (isAgentMuted) {
              stopSound('lock');
          }
      }
  }, [isAdminMuted, isAgentMuted, isLocalMuted, state.holder, state.overrideSignal]);

  // Audio Context (Mock implementation if files missing)
  const playSound = (type, category) => {
      // Audio Gate Logic
      if (category === 'ADMIN' && (isAdminMuted || isLocalMuted)) return;
      if (category === 'AGENT' && (isAgentMuted || isLocalMuted)) return;

      try {
          const audio = audioRefs.current[type];
          if (audio) {
              audio.currentTime = 0; // Reset to start
              audio.play().catch(e => {}); 
          }
      } catch (e) {}
  };

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, filter, autoScroll]);

  useEffect(() => {
      const prev = lastStateRef.current;
      const now = new Date().toLocaleTimeString('en-US', { hour12: false });
      const newLogs = [];

      // Lock Logic (ADMIN / AGENT mixed)
      if (prev.holder !== state.holder) {
          if (state.holder) {
             const isHuman = state.holder.includes('Human');
             const logType = isHuman ? 'critical' : 'success';
             const logMsg = isHuman ? `[EMERGENCY OVERRIDE] ADMIN TOOK CONTROL` : `Access Granted: ${state.holder}`;
             
             newLogs.push({ 
                 time: now, 
                 type: logType, 
                 msg: logMsg 
             });
             
             // Sound Category Decision
             const category = isHuman ? 'ADMIN' : 'AGENT';
             playSound(isHuman ? 'alert' : 'lock', category);
          } else if (prev.holder) {
             newLogs.push({ time: now, type: 'info', msg: `Lock Released: Resource Free` });
          }
      }

      // Override Logic (ADMIN)
      if (prev.overrideSignal !== state.overrideSignal) {
          if (state.overrideSignal) {
              newLogs.push({ time: now, type: 'critical', msg: `[EMERGENCY OVERRIDE] PROTOCOL INITIATED` });
              playSound('alert', 'ADMIN');
          } else {
              newLogs.push({ time: now, type: 'warn', msg: `Override Signal Cleared - Resuming Auto-Pilot` });
          }
      }

      // Collision Logic (ADMIN/SYSTEM Warning)
      if (state.collisionCount > prev.collisionCount) {
          newLogs.push({ time: now, type: 'warn', msg: `Collision Avoidance Triggered! Total: ${state.collisionCount}` });
          playSound('error', 'ADMIN');
      }
      
      // Agent Count Logic (AGENT Info)
      if (state.activeAgentCount !== prev.activeAgentCount) {
           newLogs.push({ time: now, type: 'info', msg: `System Scale Adjusted: ${state.activeAgentCount} Agents Active` });
      }

      // Initial log
      if (logs.length === 0 && state.activeAgentCount > 0) {
          newLogs.push({ time: now, type: 'info', msg: `ATC Core Online. Monitoring ${state.activeAgentCount} Agents.` });
      }

      if (newLogs.length > 0) {
          setLogs(prevLogs => [...prevLogs, ...newLogs].slice(-100));
      }

      lastStateRef.current = state;
  }, [state]);

  const filteredLogs = logs.filter(log => {
      if (filter === 'ALL') return true;
      if (filter === 'CRITICAL') return log.type === 'critical' || log.msg.includes('OVERRIDE');
      if (filter === 'WARN') return log.type === 'warn' || log.msg.includes('Collision') || log.msg.includes('Paused');
      if (filter === 'INFO') return log.type === 'info' || log.type === 'success';
      return true;
  });

  const startResizing = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const startY = e.clientY;
      const startX = e.clientX;
      const startHeight = height;
      const startWidth = width;

      const onMouseMove = (moveEvent) => {
          const newHeight = startHeight + (startY - moveEvent.clientY);
          const newWidth = startWidth + (moveEvent.clientX - startX);
          
          if (newHeight > 150 && newHeight < 800) {
              setHeight(newHeight);
          }
          if (newWidth > 400 && newWidth < 1200) {
              setWidth(newWidth);
          }
      };

      const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
  };

  // Sync Master Mute State (If either channel is muted by local override, or respecting props)
  // Currently local mute kills everything.
  // Props kill specific channels.
  const isGlobalMuted = isLocalMuted || (isAdminMuted && isAgentMuted); 

  return (
      <Draggable nodeRef={nodeRef} handle=".handle" bounds="body">
          <div 
            ref={nodeRef} 
            className="fixed bottom-10 z-40 flex flex-col items-start font-mono min-w-0 overflow-hidden transition-all duration-300"
            style={{ right: sidebarWidth + 20 }}
          >
            {/* Resize Handles */}
            <div 
                className="w-full h-4 bg-transparent hover:bg-blue-500/20 cursor-n-resize absolute -top-4 z-[70] flex justify-center group"
                onMouseDown={startResizing}
            >
                <div className="w-10 h-1 bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity mt-1.5" />
            </div>
             <div 
                className="w-4 h-full bg-transparent hover:bg-blue-500/20 cursor-e-resize absolute -right-4 z-[70] flex flex-col justify-center items-center group"
                onMouseDown={startResizing}
            >
                <div className="h-10 w-1 bg-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ml-1.5" />
            </div>
             <div 
                className="w-6 h-6 bg-transparent hover:bg-blue-500/20 cursor-ne-resize absolute -top-4 -right-4 z-[80] rounded-full"
                onMouseDown={startResizing}
            />

            <div 
                className={clsx("rounded-xl border text-xs overflow-hidden flex flex-col backdrop-blur-md shadow-2xl relative transition-all duration-500", 
                    isDark ? "bg-[#0d1117]/95 border-gray-800" : "bg-white/90 border-slate-400 shadow-xl"
                )}
                style={{ width, height }}
            >
                {/* Terminal Header */}
                <div className={clsx("handle flex items-center gap-2 p-2 border-b cursor-move transition-colors select-none sticky top-0 z-10", 
                    isDark ? "bg-gray-900/80 hover:bg-gray-800 border-gray-800 text-gray-500" : "bg-slate-100/80 hover:bg-slate-100 border-slate-200 text-slate-500"
                )}>
                    <Terminal className={clsx("w-4 h-4", isDark ? "text-atc-blue" : "text-blue-600")} />
                    <span className={clsx("tracking-widest font-bold", isDark ? "text-gray-300" : "text-slate-700")}>SYSTEM_LOG</span>
                    
                    <div className="ml-auto flex items-center gap-2">
                         <button 
                            onClick={() => setAutoScroll(!autoScroll)}
                            className={clsx("p-1 transition-colors flex items-center gap-1", 
                                autoScroll ? "text-green-500" : (isDark ? "text-gray-600 hover:text-gray-300" : "text-slate-400 hover:text-slate-600")
                            )}
                            title="Auto-Scroll"
                        >
                            <ArrowUpFromLine className="w-3 h-3" />
                        </button>

                        <button 
                            onClick={() => setIsLocalMuted(!isLocalMuted)}
                            // Local mute is independent master switch for this panel only
                            className={clsx("p-1 transition-colors", 
                                isLocalMuted ? "text-red-500" : (isDark ? "text-cyan-400 hover:text-gray-300" : "text-cyan-600 hover:text-slate-600")
                            )}
                            title={isLocalMuted ? "Unmute Local" : "Mute Local"}
                        >
                            {isLocalMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                        <div className={clsx("h-4 w-px mx-1", isDark ? "bg-gray-700" : "bg-slate-300")} />
                        
                        {['ALL', 'CRITICAL', 'WARN', 'INFO'].map(f => (
                            <button 
                                key={f}
                                onClick={() => setFilter(f)}
                                className={clsx(
                                    "px-2 py-0.5 rounded text-[9px] font-bold transition-all border border-transparent", 
                                    filter === f 
                                        ? (f === 'CRITICAL' ? "bg-red-500/10 text-red-400 border-red-500/30" : 
                                           f === 'WARN' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                                           f === 'INFO' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" :
                                           (isDark ? "bg-gray-700 text-white" : "bg-slate-200 text-slate-800"))
                                        : (isDark ? "hover:bg-gray-800 text-gray-500" : "hover:bg-slate-100 text-slate-400")
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Log Content */}
                <div className={clsx("flex-1 overflow-y-auto space-y-1 p-4 custom-scrollbar", isDark ? "bg-black/40" : "bg-slate-100/50")} ref={scrollRef}>
                    <div className="flex flex-col-reverse">
                    {filteredLogs.map((log, i) => (
                        <div key={i} className={clsx("flex gap-3 px-1 rounded transition-colors group py-0.5 border-b last:border-0", 
                            isDark ? "hover:bg-white/5 border-white/5" : "hover:bg-black/5 border-black/5"
                        )}>
                            <span className={clsx("select-none font-mono text-[10px] w-16 opacity-60", isDark ? "text-gray-600 group-hover:text-gray-500" : "text-slate-400 group-hover:text-slate-500")}>[{log.time}]</span>
                            <span className={clsx(
                                "break-all whitespace-pre-wrap font-mono text-[11px]",
                                log.type === 'critical' ? 'text-red-500 font-bold animate-pulse' :
                                log.type === 'warn' ? 'text-amber-400' :
                                log.type === 'success' ? 'text-green-400 font-bold' :
                                log.type === 'info' ? 'text-cyan-400' :
                                (isDark ? 'text-gray-300' : 'text-slate-700')
                            )}>
                                {log.msg}
                            </span>
                        </div>
                    ))}
                    </div>
                    {filteredLogs.length === 0 && <span className={clsx("italic px-1 font-mono text-[10px]", isDark ? "text-gray-700" : "text-slate-400")}>Awaiting Data Stream...</span>}
                </div>
            </div>
          </div>
      </Draggable>
  );
};
