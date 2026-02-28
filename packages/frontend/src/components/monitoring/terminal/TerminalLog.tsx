// src/components/monitoring/terminal/TerminalLog.tsx
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Draggable from 'react-draggable';
import clsx from 'clsx';
import { useATC } from '@/hooks/system/useATC';
import { useUI } from '@/hooks/system/useUI';
import { Volume2, VolumeX, ArrowDownCircle, ChevronDown, Save } from 'lucide-react';
import { Tooltip } from '@/components/common/Tooltip';
import { LogItem } from '@/components/common/LogItem';

const LOG_LINE_HEIGHT = 24;

export const TerminalLog = () => {
  const { state, agents, isAdminMuted, toggleAdminMute } = useATC();
  const { isDark, sidebarWidth } = useUI();
  
  const [filter, setFilter] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  const nodeRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    const allLogs = state?.logs || [];
    if (filter === 'ALL') return allLogs;
    
    return allLogs.filter(l => {
        if (filter === 'critical') return l.type === 'critical' || l.type === 'error';
        if (filter === 'lock') return l.type === 'lock' || l.type === 'success';
        if (filter === 'system') return l.type === 'system'; 
        if (filter === 'policy') return l.type === 'policy';
        return l.type === filter.toLowerCase();
    });
  }, [state?.logs, filter]);

  const agentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    agents.forEach(a => {
      map[a.id] = a.displayId || a.id;
    });
    return map;
  }, [agents]);

  const visibleLogs = useMemo(() => {
    const start = Math.floor(scrollTop / LOG_LINE_HEIGHT);
    const end = Math.max(start + 15, 15); 
    return { start: Math.max(0, start), end };
  }, [scrollTop, filteredLogs.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop: currentTop, scrollHeight, clientHeight } = e.currentTarget;
    setScrollTop(currentTop);
    const isBottom = scrollHeight - clientHeight - currentTop < 50;
    setAutoScroll(isBottom);
  };

  useEffect(() => {
    if (!isCollapsed) {
        setTimeout(() => {
            if (scrollRef.current) {
                if (autoScroll) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
                setScrollTop(scrollRef.current.scrollTop);
            }
        }, 50);
    }
  }, [isCollapsed, autoScroll]);

  useEffect(() => {
    if (autoScroll && scrollRef.current && !isCollapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs.length, autoScroll, isCollapsed]);

  const saveLogs = () => {
      const content = (state?.logs || []).map(l => 
        `[${new Date(l.timestamp).toISOString()}] [${(l.type || 'INFO').toUpperCase()}] ${l.message}`
      ).join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atc_tactical_logs_${new Date().toISOString().slice(0,10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
  };

  return (
      <Draggable nodeRef={nodeRef} handle=".handle" bounds="body">
            <div 
                ref={nodeRef} 
                className="fixed z-50 flex flex-col items-end font-mono transition-[left] duration-300 ease-out pointer-events-auto" 
                style={{ 
                    left: `calc(100vw - ${sidebarWidth + 420}px)`, 
                    top: 'calc(100vh - 280px)', 
                }}
            >
                <div 
                    className={clsx(
                        "rounded-lg border shadow-xl backdrop-blur-md flex flex-col text-xs overflow-hidden",
                        isDark ? "bg-[#0d1117]/90 border-gray-800 text-gray-300" : "bg-slate-50/80 border-slate-200/40 text-slate-800",
                        isCollapsed ? "!h-10 !min-h-[40px] !w-80" : "h-[260px] min-h-[180px] w-[400px] min-w-[320px] resize both"
                    )}
                >
                    {/* Header */}
                    <div className={clsx("flex justify-between items-center p-2 border-b handle cursor-move h-10 shrink-0 w-full",
                        isDark ? "bg-gray-800/20 border-gray-800" : "bg-white/40 border-slate-200/40"
                    )}>
                        <div className="flex items-center gap-2 truncate pr-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
                            <span className="font-bold tracking-[0.1em] uppercase text-[10px] select-none">TERMINAL_OUT</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                             {!isCollapsed && (
                                 <>
                                    <button onClick={saveLogs} className="p-1 rounded hover:bg-white/10 text-gray-500"><Save size={13} /></button>
                                    <button onClick={() => setAutoScroll(!autoScroll)} className={clsx("p-1 rounded", autoScroll ? "text-green-500" : "text-gray-500")}><ArrowDownCircle size={13} /></button>
                                    <button onClick={toggleAdminMute} className="p-1 rounded text-gray-500">{isAdminMuted ? <VolumeX size={13} className="text-red-500" /> : <Volume2 size={13} />}</button>
                                 </>
                             )}
                            <button onClick={() => setIsCollapsed(!isCollapsed)} className={clsx("p-1 rounded hover:bg-white/10 transition-transform", isCollapsed && "rotate-180")}><ChevronDown size={14} /></button>
                        </div>
                    </div>

                    {!isCollapsed && (
                        <div className="flex flex-1 overflow-hidden relative">
                            {/* Side Filter Bar */}
                            <div className={clsx(
                                "w-10 border-r flex flex-col items-center py-2 gap-1.5 shrink-0 overflow-y-auto", 
                                isDark ? "bg-black/20 border-gray-800" : "bg-white/10 border-slate-200",
                                "scrollbar-hide" // Tailwind 플러그인이 있다면 사용, 없다면 아래 style 사용
                            )} style={{ 
                                msOverflowStyle: 'none', 
                                scrollbarWidth: 'none',
                                WebkitOverflowScrolling: 'touch' 
                            }}>
                                <style>{`
                                    .scrollbar-hide::-webkit-scrollbar { display: none; }
                                `}</style>
                            {/* <div className={clsx("w-8 border-r flex flex-col items-center py-2 gap-2 shrink-0", isDark ? "bg-black/20 border-gray-800" : "bg-white/10 border-slate-200")}> */}
                                {['ALL', 'INFO', 'WARN', 'LOCK', 'SYS', 'PLC', 'CRIT'].map(f => {
                                    const filterValue = f === 'CRIT' ? 'critical' : (f === 'LOCK' ? 'lock' : (f === 'SYS' ? 'system' : (f === 'PLC' ? 'policy' : f)));
                                    const isActive = filter === filterValue || (f === 'ALL' && filter === 'ALL');
                                    
                                    return (
                                        <Tooltip key={f} content={`Filter: ${f}`} position="right">
                                            <button 
                                                onClick={() => setFilter(filterValue)} 
                                                className={clsx("text-[9px] font-bold w-6 h-6 flex items-center justify-center rounded transition-colors", 
                                                    isActive ? "bg-blue-500 text-white" : "text-gray-500 hover:bg-white/5")}>
                                                {f[0]}
                                            </button>
                                        </Tooltip>
                                    );
                                })}
                            </div>

                            {/* Log Area */}
                            <div ref={scrollRef} onScroll={handleScroll} className={clsx("flex-1 overflow-y-auto custom-scrollbar relative", isDark ? "bg-black/10" : "bg-white/20")}>
                                {!autoScroll && (
                                    <button onClick={() => setAutoScroll(true)} className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 text-white text-[10px] px-2 py-1 rounded-full shadow-lg animate-bounce z-10 border border-white/10">NEW_LOG ↓</button>
                                )}
                                <div style={{ height: Math.max(filteredLogs.length * LOG_LINE_HEIGHT, 1), position: 'relative' }}>
                                    {filteredLogs.slice(visibleLogs.start, visibleLogs.end).map((log, idx) => {
                                        const actualIdx = visibleLogs.start + idx;
                                        const agentName = log.agentId && log.agentId !== 'SYSTEM' ? agentNameMap[log.agentId] : null;
                                        const displayMsg = agentName ? `[${agentName}] ${log.message}` : log.message;
                                        
                                        return (
                                            <div 
                                                key={`${log.id}-${actualIdx}`} 
                                                className="absolute w-full px-2" 
                                                style={{ top: actualIdx * LOG_LINE_HEIGHT, height: LOG_LINE_HEIGHT }}
                                            >
                                                <LogItem log={{...log, message: displayMsg}} isDark={isDark} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
      </Draggable>
  );
};