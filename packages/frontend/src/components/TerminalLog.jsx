import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Terminal, GripHorizontal, Volume2, VolumeX, ArrowUpFromLine } from 'lucide-react';
import clsx from 'clsx';

export const TerminalLog = ({ state }) => {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL | CRITICAL | WARN | INFO
  const [isMuted, setIsMuted] = useState(false);
  const [height, setHeight] = useState(250);
  const [width, setWidth] = useState(600);
  
  const lastStateRef = useRef(state);
  const scrollRef = useRef(null);
  const nodeRef = useRef(null);

  const playSound = (type) => {
      if (isMuted) return;
      // Audio logic can be added here
  };

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, filter]);

  useEffect(() => {
      const prev = lastStateRef.current;
      const now = new Date().toLocaleTimeString('en-US', { hour12: false });
      const newLogs = [];

      // Lock Logic
      if (prev.holder !== state.holder) {
          if (state.holder) {
             newLogs.push({ time: now, type: 'info', msg: `Lock Acquired by ${state.holder}` });
             playSound('lock');
          } else if (prev.holder) {
             newLogs.push({ time: now, type: 'info', msg: `Lock Released` });
          }
      }

      // Override Logic
      if (prev.overrideSignal !== state.overrideSignal) {
          if (state.overrideSignal) {
              newLogs.push({ time: now, type: 'critical', msg: `EMERGENCY OVERRIDE INITIATED` });
              playSound('alert');
          } else {
              newLogs.push({ time: now, type: 'warn', msg: `Override Signal Cleared` });
          }
      }

      // Collision Logic
      if (state.collisionCount > prev.collisionCount) {
          newLogs.push({ time: now, type: 'critical', msg: `Collision Detected! Total: ${state.collisionCount}` });
          playSound('error');
      }
      
      // Agent Count Logic (Scale)
      if (state.activeAgentCount !== prev.activeAgentCount) {
           newLogs.push({ time: now, type: 'warn', msg: `Scale: Active Agents adjusted to ${state.activeAgentCount}` });
      }

      // Initial log
      if (logs.length === 0 && state.activeAgentCount > 0) {
          newLogs.push({ time: now, type: 'info', msg: `System initialized with ${state.activeAgentCount} agents` });
      }

      if (newLogs.length > 0) {
          setLogs(prevLogs => [...prevLogs, ...newLogs].slice(-100));
      }

      lastStateRef.current = state;
  }, [state, isMuted]);

  const filteredLogs = logs.filter(log => {
      if (filter === 'ALL') return true;
      if (filter === 'CRITICAL') return log.type === 'critical' || log.msg.includes('Collision') || log.msg.includes('Override') || log.msg.includes('Emergency');
      if (filter === 'WARN') return log.type === 'warn' || log.msg.includes('Paused') || log.msg.includes('Resumed') || log.msg.includes('Scale');
      if (filter === 'INFO') return log.type === 'info' || log.type === 'system';
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
          <div ref={nodeRef} className="fixed bottom-10 left-10 z-40 flex flex-col items-start">
            {/* Resize Handle (Top & Right) */}
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
            {/* Corner Handle */}
             <div 
                className="w-6 h-6 bg-transparent hover:bg-blue-500/20 cursor-ne-resize absolute -top-4 -right-4 z-[80] rounded-full"
                onMouseDown={startResizing}
            />

            <div 
                className="bg-[#0d1117]/90 rounded-xl border border-gray-800 font-mono text-xs overflow-hidden flex flex-col backdrop-blur-sm shadow-2xl relative transition-all duration-75"
                style={{ width, height }}
            >
                <div className="handle flex items-center gap-2 text-gray-500 p-2 border-b border-gray-800 cursor-move bg-gray-900/50 hover:bg-gray-800 transition-colors select-none sticky top-0 z-10">
                    <Terminal className="w-4 h-4" />
                    <span className="tracking-widest font-bold">SYSTEM_LOG</span>
                    
                    <div className="ml-auto flex items-center gap-2">
                        <button 
                            onClick={() => setIsMuted(!isMuted)}
                            className={clsx("p-1 hover:text-gray-300 transition-colors", isMuted ? "text-red-500" : "text-gray-500")}
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
                                    "px-2 py-0.5 rounded text-[9px] font-bold transition-all", 
                                    filter === f 
                                        ? (f === 'CRITICAL' ? "bg-red-500/20 text-red-400" : 
                                           f === 'WARN' ? "bg-amber-500/20 text-amber-400" :
                                           f === 'INFO' ? "bg-cyan-500/20 text-cyan-400" :
                                           "bg-gray-700 text-white")
                                        : "hover:bg-gray-800 text-gray-500"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                        <GripHorizontal className="w-4 h-4 opacity-50 ml-2" />
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1 p-4 custom-scrollbar" ref={scrollRef}>
                    {filteredLogs.map((log, i) => (
                        <div key={i} className="flex gap-3 hover:bg-white/5 px-1 rounded transition-colors group">
                            <span className="text-gray-600 select-none group-hover:text-gray-500">[{log.time}]</span>
                            <span className={clsx(
                                "break-all",
                                log.type === 'critical' ? 'text-red-500 font-bold' :
                                log.type === 'warn' ? 'text-amber-400' :
                                log.type === 'success' ? 'text-green-500' :
                                log.type === 'info' ? 'text-cyan-400' :
                                'text-gray-300'
                            )}>
                                {log.msg}
                            </span>
                        </div>
                    ))}
                    {filteredLogs.length === 0 && <span className="text-gray-700 italic px-1">No logs matching filter...</span>}
                </div>
            </div>
          </div>
      </Draggable>
  );
};
