import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Terminal, GripHorizontal, Volume2, VolumeX, ArrowUpFromLine, Lock, PlayCircle } from 'lucide-react';
import clsx from 'clsx';
import useSound from 'use-sound';

// Note: You would normally import real sound files here.
// For this demo, we assume these files exist or use empty strings/placeholders.
// Ideally, add real mp3 files to public/sounds/
const SOUNDS = {
    LOCK: '/sounds/beep.mp3', 
    ERROR: '/sounds/buzz.mp3',
    ALERT: '/sounds/siren.mp3'
};

export const TerminalLog = ({ state }) => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL | CRITICAL | WARN | INFO
  const [isMuted, setIsMuted] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [height, setHeight] = useState(250);
  const [width, setWidth] = useState(600);
  
  const lastStateRef = useRef(state);
  const scrollRef = useRef(null);
  const nodeRef = useRef(null);

  // Audio Context (Mock implementation if files missing)
  const playSound = (type) => {
      if (isMuted) return;
      try {
          const audio = new Audio();
          if (type === 'lock') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'; // Short beep
          if (type === 'error') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3'; // Buzz
          if (type === 'alert') audio.src = 'https://assets.mixkit.co/active_storage/sfx/995/995-preview.mp3'; // Alarm
          
          audio.volume = 0.2;
          audio.play().catch(e => {}); // Ignore play errors
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

      // Lock Logic
      if (prev.holder !== state.holder) {
          if (state.holder) {
             const isHuman = state.holder.includes('Human');
             newLogs.push({ 
                 time: now, 
                 type: isHuman ? 'critical' : 'success', 
                 msg: isHuman ? `ADMIN OVERRIDE ACTIVE` : `Access Granted: ${state.holder}` 
             });
             playSound(isHuman ? 'alert' : 'lock');
          } else if (prev.holder) {
             newLogs.push({ time: now, type: 'info', msg: `Lock Released` });
          }
      }

      // Override Logic
      if (prev.overrideSignal !== state.overrideSignal) {
          if (state.overrideSignal) {
              newLogs.push({ time: now, type: 'critical', msg: `!!! EMERGENCY PROTOCOL INITIATED !!!` });
              playSound('alert');
          } else {
              newLogs.push({ time: now, type: 'warn', msg: `Override Signal Cleared - Resuming Auto-Pilot` });
          }
      }

      // Collision Logic
      if (state.collisionCount > prev.collisionCount) {
          newLogs.push({ time: now, type: 'warn', msg: `Collision Avoidance Triggered! Total: ${state.collisionCount}` });
          playSound('error');
      }
      
      // Agent Count Logic (Scale)
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
      if (filter === 'CRITICAL') return log.type === 'critical' || log.msg.includes('Override') || log.msg.includes('Emergency');
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

  return (
      <Draggable nodeRef={nodeRef} handle=".handle" bounds="body">
          <div ref={nodeRef} className="fixed bottom-10 left-10 z-40 flex flex-col items-start font-mono">
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
                className="bg-[#0d1117]/95 rounded-xl border border-gray-800 text-xs overflow-hidden flex flex-col backdrop-blur-md shadow-2xl relative transition-all duration-75"
                style={{ width, height }}
            >
                {/* Terminal Header */}
                <div className="handle flex items-center gap-2 text-gray-500 p-2 border-b border-gray-800 cursor-move bg-gray-900/80 hover:bg-gray-800 transition-colors select-none sticky top-0 z-10">
                    <Terminal className="w-4 h-4 text-atc-blue" />
                    <span className="tracking-widest font-bold text-gray-300">SYSTEM_LOG</span>
                    
                    <div className="ml-auto flex items-center gap-2">
                         <button 
                            onClick={() => setAutoScroll(!autoScroll)}
                            className={clsx("p-1 hover:text-gray-300 transition-colors flex items-center gap-1", autoScroll ? "text-green-500" : "text-gray-600")}
                            title="Auto-Scroll"
                        >
                            <ArrowUpFromLine className="w-3 h-3" />
                        </button>

                        <button 
                            onClick={() => setIsMuted(!isMuted)}
                            className={clsx("p-1 hover:text-gray-300 transition-colors", isMuted ? "text-red-500" : "text-cyan-400")}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                        <div className="h-4 w-px bg-gray-700 mx-1" />
                        
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
                                           "bg-gray-700 text-white")
                                        : "hover:bg-gray-800 text-gray-500"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Log Content */}
                <div className="flex-1 overflow-y-auto space-y-1 p-4 custom-scrollbar bg-black/40" ref={scrollRef}>
                    {filteredLogs.map((log, i) => (
                        <div key={i} className="flex gap-3 hover:bg-white/5 px-1 rounded transition-colors group">
                            <span className="text-gray-600 select-none group-hover:text-gray-500 font-mono">[{log.time}]</span>
                            <span className={clsx(
                                "break-all font-mono",
                                log.type === 'critical' ? 'text-red-500 font-bold animate-pulse' :
                                log.type === 'warn' ? 'text-amber-400' :
                                log.type === 'success' ? 'text-green-400 font-bold' :
                                log.type === 'info' ? 'text-cyan-400' :
                                'text-gray-300'
                            )}>
                                {log.msg}
                            </span>
                        </div>
                    ))}
                    {filteredLogs.length === 0 && <span className="text-gray-700 italic px-1 font-mono">Awaiting Data...</span>}
                </div>
            </div>
          </div>
      </Draggable>
  );
};
