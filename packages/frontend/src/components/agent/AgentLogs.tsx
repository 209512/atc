// src/components/agent/AgentLogs.tsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import clsx from 'clsx';
import { LogEntry } from '@/contexts/atcTypes';

interface AgentLogsProps {
    logs: LogEntry[];
    isDark: boolean;
    isSelected: boolean;
}

const ITEM_HEIGHT = 18; // 각 로그 줄의 높이 (px)

export const AgentLogs = ({ logs, isDark, isSelected }: AgentLogsProps) => {
    const logContainerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const isAutoScroll = useRef(true);

    // 가상화 계산: 현재 보이는 인덱스 범위 산출
    const visibleRange = useMemo(() => {
        const start = Math.floor(scrollTop / ITEM_HEIGHT);
        const end = Math.min(logs.length, start + 10); // 10개 내외 표시
        return { start, end };
    }, [scrollTop, logs.length]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop: currentTop, scrollHeight, clientHeight } = e.currentTarget;
        setScrollTop(currentTop);
        // 하단 끝에 가까우면 자동 스크롤 활성화
        isAutoScroll.current = scrollHeight - clientHeight - currentTop < 20;
    };

    useEffect(() => {
        if (isSelected && isAutoScroll.current && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs.length, isSelected]);

    return (
        <div 
            ref={logContainerRef} 
            onScroll={handleScroll} 
            className={clsx(
                "p-2 rounded font-mono text-[9px] h-32 overflow-y-auto border custom-scrollbar mt-3 relative", 
                isDark ? "bg-black/60 text-emerald-400/80 border-white/5" : "bg-slate-50 text-slate-600 border-slate-200 shadow-inner"
            )}
        >
            {logs.length > 0 ? (
                <div style={{ height: logs.length * ITEM_HEIGHT, position: 'relative' }}>
                    {logs.slice(visibleRange.start, visibleRange.end).map((log, idx) => {
                        const actualIdx = visibleRange.start + idx;
                        return (
                            <div 
                                key={log.id || actualIdx} 
                                className={clsx(
                                    "absolute w-full flex justify-between gap-2 border-b pb-1 last:border-0", 
                                    isDark ? "border-white/5" : "border-slate-200"
                                )}
                                style={{ 
                                    top: actualIdx * ITEM_HEIGHT,
                                    height: ITEM_HEIGHT 
                                }}
                            >
                                <span className="opacity-40 text-[7px] shrink-0">
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                <span className={clsx("flex-1 text-right truncate font-bold uppercase tracking-tighter", 
                                    log.type === 'critical' || log.type === 'CRITICAL' ? "text-red-500" :
                                    log.type === 'error' ? "text-orange-500" :
                                    log.type === 'success' ? "text-emerald-500" :
                                    log.type === 'system' ? "text-purple-500" :
                                    (isDark ? "text-blue-400" : "text-blue-700")
                                )}>
                                    {log.message}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-30 py-10 italic text-[8px] uppercase gap-2">
                    <span>[Idle_Stream]</span>
                </div>
            )}
        </div>
    );
};