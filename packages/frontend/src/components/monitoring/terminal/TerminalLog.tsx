// src/components/monitoring/terminal/TerminalLog.tsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import Draggable from 'react-draggable';
import clsx from 'clsx';
import { useATC } from '@/hooks/system/useATC';
import { useUI } from '@/hooks/system/useUI';
import { Volume2, VolumeX, ArrowDownCircle, ChevronDown, Save } from 'lucide-react';
import { Tooltip } from '@/components/common/Tooltip';

const LOG_LINE_HEIGHT = 18; // 터미널 로그 한 줄 높이

export const TerminalLog = () => {
  const { state, isAdminMuted, toggleAdminMute } = useATC();
  const { isDark, sidebarWidth } = useUI();
  
  interface Log {
      id: string;
      timestamp: string;
      type: string;
      messageTech: string; 
      messageStd: string;  
  }

  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<'TECH' | 'STD'>('STD');
  const [scrollTop, setScrollTop] = useState(0);

  const nodeRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastHolderRef = useRef<string | null>(null);
  const lastCandidateRef = useRef<string | null>(null); 
  const lastOverrideRef = useRef<boolean>(false);

  const addLog = (type: string, messageTech: string, messageStd: string) => {
      setLogs(prev => [...prev.slice(-499), { // 최대 500개 유지
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
          timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
          type, 
          messageTech,
          messageStd
      }]);
  };

  useEffect(() => {
    if (!state.forcedCandidate && lastCandidateRef.current && state.holder === lastCandidateRef.current) {
        addLog('info', `⚡ [ACQ] ${state.holder} SEIZED CONTROL`, `⚡ SUCCESS: ${state.holder} is Master`);
        lastCandidateRef.current = null;
        lastHolderRef.current = state.holder;
        return;
    }
    if (state.forcedCandidate && state.forcedCandidate !== lastCandidateRef.current) {
        addLog('info', `📡 [CMD] SEIZE TARGET -> ${state.forcedCandidate}`, `📡 ORDER: Switching Master to ${state.forcedCandidate}`);
        lastCandidateRef.current = state.forcedCandidate;
    }
    if (state.holder !== lastHolderRef.current) {
        if (state.holder && !state.holder.includes('Human') && state.holder !== 'RELEASING...') {
            addLog('info', `🔒 [GRANTED] ${state.holder.toLowerCase()} (latency: ${state.latency}ms)`, `🔹 Active: ${state.holder}`);
        }
        lastHolderRef.current = state.holder;
    }
    if (state.overrideSignal && !lastOverrideRef.current) {
        addLog('critical', `🚨 !!! ADMIN_OVERRIDE_ACTIVE !!!`, `🚨 SYSTEM UNDER DIRECT CONTROL`);
        lastOverrideRef.current = true;
    } else if (!state.overrideSignal && lastOverrideRef.current) {
        lastOverrideRef.current = false;
    }
  }, [state.holder, state.forcedCandidate, state.overrideSignal, state.latency]);

  const filteredLogs = useMemo(() => 
    logs.filter(l => filter === 'ALL' || l.type === filter.toLowerCase()),
    [logs, filter]
  );

  // 가상화 인덱스 계산
  const visibleLogs = useMemo(() => {
    const start = Math.floor(scrollTop / LOG_LINE_HEIGHT);
    const end = Math.min(filteredLogs.length, start + 15);
    return { start, end };
  }, [scrollTop, filteredLogs.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop: currentTop, scrollHeight, clientHeight } = e.currentTarget;
    setScrollTop(currentTop);
    setAutoScroll(scrollHeight - clientHeight - currentTop < 20);
  };

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs.length, autoScroll]);

  const saveLogs = () => {
      const content = logs.map(l => `[${l.timestamp}] [${l.type.toUpperCase()}] ${viewMode === 'TECH' ? l.messageTech : l.messageStd}`).join('\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `atc_logs_${new Date().toISOString().slice(0,10)}.txt`;
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
                    top: 'calc(100vh - 250px)', 
                }}
            >
                <div 
                    className={clsx(
                        "rounded-lg border shadow-xl backdrop-blur-md flex flex-col text-xs overflow-hidden",
                        isDark ? "bg-[#0d1117]/90 border-gray-800 text-gray-300" : "bg-slate-50/80 border-slate-200/40 text-slate-800",
                        isCollapsed ? "!h-10 !min-h-[40px] !w-80" : "h-[220px] min-h-[150px] w-[400px] min-w-[280px] resize both"
                    )}
                >
                    {/* Header */}
                    <div className={clsx("flex justify-between items-center p-2 border-b handle cursor-move h-10 shrink-0 w-full",
                        isDark ? "bg-gray-800/20 border-gray-800" : "bg-white/40 border-slate-200/40"
                    )}>
                        <div className="flex items-center gap-2 truncate pr-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
                            <Tooltip content="System Event Log Stream" position="bottom-right">
                                <span className="font-bold tracking-[0.1em] uppercase text-[10px] select-none">TERMINAL_OUT</span>
                            </Tooltip>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                             {!isCollapsed && (
                                 <>
                                    <div className="flex bg-black/20 rounded p-0.5">
                                        {(['STD', 'TECH'] as const).map(m => (
                                            <Tooltip key={m} content={m === 'STD' ? "Standard Language" : "Technical Protocol"} position="bottom">
                                                <button onClick={() => setViewMode(m)} className={clsx("px-1.5 py-0.5 rounded text-[9px] font-bold transition-all", viewMode === m ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-300")}>
                                                    {m}
                                                </button>
                                            </Tooltip>
                                        ))}
                                    </div>
                                    <Tooltip content="Export Logs (.txt)" position="bottom">
                                        <button onClick={saveLogs} className="p-1 rounded hover:bg-white/10 text-gray-500">
                                            <Save size={13} />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content={autoScroll ? "Disable Auto-scroll" : "Enable Auto-scroll"} position="bottom">
                                        <button onClick={() => setAutoScroll(!autoScroll)} className={clsx("p-1 rounded", autoScroll ? "text-green-500" : "text-gray-500")}>
                                            <ArrowDownCircle size={13} />
                                        </button>
                                    </Tooltip>
                                    <Tooltip content={isAdminMuted ? "Unmute All" : "Mute All"} position="bottom">
                                        <button onClick={toggleAdminMute} className="p-1 rounded text-gray-500">
                                            {isAdminMuted ? <VolumeX size={13} className="text-red-500" /> : <Volume2 size={13} />}
                                        </button>
                                    </Tooltip>
                                 </>
                             )}

                            <button onClick={() => setIsCollapsed(!isCollapsed)} className={clsx("p-1 rounded hover:bg-white/10 transition-transform", isCollapsed && "rotate-180")}>
                                <ChevronDown size={14} />
                            </button>

                        </div>
                    </div>

                    {!isCollapsed && (
                        <div className="flex flex-1 overflow-hidden">
                            <div className={clsx("w-8 border-r flex flex-col items-center py-2 gap-2 shrink-0", isDark ? "bg-black/20 border-gray-800" : "bg-white/10 border-slate-200")}>
                                {['ALL', 'INFO', 'WARN', 'CRIT'].map(f => (
                                    <Tooltip key={f} content={`Filter: ${f}`} position="right">
                                        <button onClick={() => setFilter(f === 'CRIT' ? 'CRITICAL' : f)} className={clsx("text-[9px] font-bold w-6 h-6 flex items-center justify-center rounded transition-colors", (filter === f || (f === 'CRIT' && filter === 'CRITICAL')) ? "bg-blue-500 text-white" : "text-gray-500 hover:bg-white/5")}>
                                            {f[0]}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>

                            <div 
                                ref={scrollRef} 
                                onScroll={handleScroll}
                                className={clsx("flex-1 overflow-y-auto custom-scrollbar font-mono text-[11px] relative", isDark ? "bg-black/10" : "bg-white/20")}
                            >
                                <div style={{ height: filteredLogs.length * LOG_LINE_HEIGHT, position: 'relative' }}>
                                    {filteredLogs.slice(visibleLogs.start, visibleLogs.end).map((log, idx) => {
                                        const actualIdx = visibleLogs.start + idx;
                                        const msg = viewMode === 'TECH' ? log.messageTech : log.messageStd;
                                        const isProcessingLog = msg.includes('📡') || msg.includes('⚙️');
                                        const isSuccessLog = msg.includes('⚡');
                                        
                                        return (
                                            <div 
                                                key={log.id} 
                                                className={clsx("absolute w-full flex gap-2 leading-tight border-b last:border-0 pb-1 px-2", isDark ? "border-white/5" : "border-black/5")}
                                                style={{ top: actualIdx * LOG_LINE_HEIGHT, height: LOG_LINE_HEIGHT }}
                                            >
                                                <span className="select-none text-[9px] shrink-0 opacity-40">[{log.timestamp}]</span>
                                                <span className={clsx(
                                                    "truncate font-medium flex-1",
                                                    log.type === 'critical' ? 'text-red-600 font-bold animate-pulse' : 
                                                    isSuccessLog ? (isDark ? 'text-[#BC6FF1] font-extrabold' : 'text-[#8B5CF6] font-black underline decoration-[#8B5CF6]/20 underline-offset-2') :
                                                    isProcessingLog ? (isDark ? 'text-[#BC6FF1]/70 font-bold' : 'text-[#A78BFA] font-bold') :
                                                    log.type === 'warn' ? (isDark ? 'text-amber-500' : 'text-amber-600') :
                                                    viewMode === 'STD' && log.type === 'info' ? 'opacity-60 font-normal' : (isDark ? 'text-blue-300' : 'text-blue-700')
                                                )}>
                                                    {msg}
                                                </span>
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