import React, { useMemo, useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { GripVertical, Check, Zap, Clock, Hash, Activity } from 'lucide-react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { AgentStatusBadge } from '../common/AgentStatusBadge';
import { AgentActionButtons, RenameButton } from '../common/AgentActionButtons';
import { Tooltip } from '../Tooltip';
import { getAgentCardStyle, getAgentTextStyle } from '../../utils/agentStyles';
import { useATC } from '../../hooks/useATC';

export const AgentCard = ({
    agent, state, isDark, isSelected, isPrioritySection, renamingId, newName, setNewName,
    onSelect, onStartRename, onConfirmRename, onCancelRename, onTogglePause, onTransferLock, onTogglePriority, onTerminate
}: any) => {
    const { playAlert, playClick } = useATC();
    const isLocked = state.holder === agent.id;
    const isRenaming = renamingId === agent.id;
    const [isShaking, setIsShaking] = useState(false); 
    const logContainerRef = useRef<HTMLDivElement>(null);
    const isAutoScroll = useRef(true);
    const isPaused = useMemo(() => String(agent.status || '').toLowerCase() === 'paused', [agent.status]);

    const agentLogs = useMemo(() => {
        if (!state.logs) return [];
        const myId = String(agent.id);
        return state.logs.filter((log: any) => {
            const logAgentId = String(log.agentId);
            return logAgentId === myId || (logAgentId === 'SYSTEM' && isSelected);
        });
    }, [state.logs, agent.id, isSelected]);

    const handleScroll = () => {
        if (!logContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
        isAutoScroll.current = scrollHeight - clientHeight - scrollTop < 20;
    };

    useEffect(() => {
        if (isSelected && logContainerRef.current) {
            const timer = setTimeout(() => {
                if (logContainerRef.current) {
                    logContainerRef.current.scrollTo({
                        top: logContainerRef.current.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [isSelected]);

    useEffect(() => {
        if (logContainerRef.current && isSelected && isAutoScroll.current) {
            const container = logContainerRef.current;
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }, [agentLogs.length]);

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (/^[A-Z0-9-_.]*$/i.test(val)) {
            setNewName(val);
        } else {
            setIsShaking(true);
            playAlert?.();
            setTimeout(() => setIsShaking(false), 400);
        }
    };

    return (
        <Reorder.Item value={agent.id} dragListener={isPrioritySection} className="list-none relative">
            <motion.div 
                animate={isShaking ? { x: [-8, 8, -8, 8, 0], scale: 1.02 } : { x: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={clsx(
                    getAgentCardStyle(state.forcedCandidate === agent.id, isLocked, isPaused, !!agent.priority, isSelected, isDark, !!state.overrideSignal, !!state.globalStop),
                    isShaking ? "z-50 border-red-500 ring-2 ring-red-500 shadow-xl" : "z-10",
                    "p-3 mb-2 group/card cursor-pointer transition-all duration-200 relative border rounded-sm shadow-sm overflow-hidden box-border"
                )}
                onClick={() => { if(!isRenaming) onSelect(isSelected ? null : agent.id); }}
            >
                <div className="flex justify-between items-center mb-2 h-7 relative">
                    <div className="flex items-center gap-2 min-w-0 flex-1 h-full">
                        {isPrioritySection && <GripVertical size={14} className="text-gray-500 shrink-0" />}
                        {isRenaming ? (
                            <div className="absolute inset-0 flex items-center bg-inherit z-20" onClick={e => e.stopPropagation()}>
                                <div className="relative flex items-center w-full max-w-[200px]">
                                    <input autoFocus 
                                        className={clsx("border text-[11px] px-2 py-1 rounded-sm w-full outline-none font-mono pr-20", isDark ? "bg-black border-blue-500 text-white" : "bg-white border-blue-400 text-slate-900", isShaking && "border-red-500")}
                                        value={newName} onChange={handleNameChange}
                                        onKeyDown={e => { if (e.key === 'Enter') onConfirmRename(agent.id); if (e.key === 'Escape') onCancelRename(); }} 
                                    />
                                    <span className="absolute right-8 text-[8px] text-blue-500/80 font-black pointer-events-none uppercase tracking-tighter">A-Z 0-9 . _ -</span>
                                    <button onClick={() => onConfirmRename(agent.id)} className="ml-1 text-emerald-500"><Check size={18}/></button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 truncate h-full">
                                <span className={clsx(getAgentTextStyle(state.forcedCandidate === agent.id, isLocked, isDark, !!state.overrideSignal), "truncate font-bold text-[13px]")}>
                                    {agent.displayId || agent.id}
                                </span>
                                <RenameButton 
                                    onClick={(e) => { e.stopPropagation(); playClick?.(); onStartRename(agent.id); }} 
                                />
                            </div>
                        )}
                    </div>
                    <div className="flex shrink-0 ml-2 relative z-10" onClick={e => e.stopPropagation()}>
                        <AgentActionButtons agent={agent} state={state} onTogglePriority={onTogglePriority} onTogglePause={onTogglePause} onTerminate={onTerminate} onTransferLock={onTransferLock} tooltipPosition="left" />
                    </div>
                </div>

                <div className="flex justify-between items-center text-[10px] gap-2 h-5">
                    <AgentStatusBadge isLocked={isLocked} isPaused={isPaused || !!state.globalStop} isForced={state.forcedCandidate === agent.id} isPriority={!!agent.priority} />
                    <span className={clsx("px-1.5 py-0.5 rounded font-mono text-[9px] border font-bold uppercase shrink-0 min-w-[65px] text-center", isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200")}>
                        {agent.model}
                    </span>
                </div>

                <AnimatePresence>
                    {isSelected && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 space-y-3">
                            <div className="flex gap-1.5">
                                <MetricBox isDark={isDark} label="T/S" value={`${(Math.random() * 20 + 40).toFixed(1)}`} icon={<Zap size={10}/>} tooltip="Tokens Per Second: Throughput rate" />
                                <MetricBox isDark={isDark} label="LAT" value={`${(Math.random() * 100 + 200).toFixed(0)}ms`} icon={<Clock size={10}/>} tooltip="Inference Latency: Response delay" />
                                <MetricBox isDark={isDark} label="TOT" value={`${(Math.random() * 5000 + 1000).toFixed(0)}`} icon={<Hash size={10}/>} tooltip="Total Accumlated Tokens" />
                                <MetricBox isDark={isDark} label="LOAD" value={`${(Math.random() * 20).toFixed(1)}%`} icon={<Activity size={10}/>} tooltip="Compute Resource Load" />
                            </div>
                            
                            <div ref={logContainerRef} onScroll={handleScroll} className={clsx("p-2 rounded font-mono text-[9px] h-32 overflow-y-auto border custom-scrollbar", isDark ? "bg-black/60 text-emerald-400/80 border-white/5" : "bg-slate-50 text-slate-600 border-slate-200 shadow-inner")}>
                                {agentLogs.length > 0 ? agentLogs.map((log: any, idx: number) => (
                                    <div key={log.id || idx} className={clsx("flex justify-between gap-2 border-b pb-1 mb-1 last:border-0", isDark ? "border-white/5" : "border-slate-200")}>
                                        <span className="opacity-40 text-[7px] shrink-0">{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                        <span className={clsx("flex-1 text-right truncate font-bold uppercase tracking-tighter", 
                                            log.type === 'critical' ? "text-red-500" :
                                            log.type === 'error' ? "text-orange-500" :
                                            log.type === 'success' ? "text-emerald-500" :
                                            log.type === 'system' ? "text-purple-500" :
                                            (isDark ? "text-blue-400" : "text-blue-700")
                                        )}>
                                            {log.message}
                                        </span>
                                    </div>
                                )) : <div className="flex flex-col items-center justify-center h-full opacity-30 py-10 italic text-[8px] uppercase gap-2"><span>[Idle_Stream]</span></div>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </Reorder.Item>
    );
};

const MetricBox = ({ label, value, isDark, icon, tooltip }: any) => (
    <Tooltip content={tooltip} position="top" className="flex-1">
        <div className={clsx(
            "w-full flex flex-col items-center justify-center py-1 rounded-sm border min-w-[45px] h-10 shadow-sm transition-colors", 
            isDark ? "bg-black/20 border-white/5 hover:bg-black/40" : "bg-white border-slate-200 hover:bg-slate-50"
        )}>
            <div className="text-[7px] text-gray-500 uppercase font-bold tracking-tighter flex items-center gap-1 leading-none mb-1">
                {icon}{label}
            </div>
            <div className={clsx(
                "text-[10px] font-mono font-bold truncate leading-none", 
                isDark ? "text-gray-300" : "text-slate-800"
            )}>
                {value}
            </div>
        </div>
    </Tooltip>
);