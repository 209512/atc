// src/components/monitoring/radar/AgentDetailPopup.tsx
import React from 'react';
import { Html } from '@react-three/drei';
import { X, Pause, Activity, Cpu, Database } from 'lucide-react'; 
import clsx from 'clsx';
import { Agent } from '@/contexts/atcTypes';
import { useATC } from '@/hooks/system/useATC';
import { useAgentLogic } from '@/hooks/agent/useAgentLogic';
import { useTacticalActions } from '@/hooks/agent/useTacticalActions';
import { AgentActionButtons } from '@/components/common/AgentActionButtons';

interface AgentDetailPopupProps {
    agent: Agent | undefined;
    position: [number, number, number] | undefined;
    onClose: () => void;
    isDark: boolean;
    onTerminate: (id: string) => void;
    onTogglePriority: (id: string, enable: boolean) => void;
    onTransferLock: (id: string) => void;
    onTogglePause: (id: string, isPaused: boolean) => void;
    isCompact?: boolean;
}

export const AgentDetailPopup = ({ 
    agent, position, onClose, isDark, 
    isCompact = false
}: AgentDetailPopupProps) => {
    const { state } = useATC();
    const { onTogglePause, onTransferLock, togglePriority, terminateAgent } = useTacticalActions();

    const { isPaused, isForced, statusLabel, isLocked } = useAgentLogic(agent as Agent, state);

    if (!agent || !position) return null;

    const verticalOffset = -180; 

    return (
        <Html position={position} center zIndexRange={[1000, 0]} pointerEvents="auto">
             <div 
                className={clsx(
                    "p-4 rounded-lg border shadow-2xl backdrop-blur-xl transition-all duration-300 select-none",
                    isCompact ? "w-48 scale-90" : "w-64",
                    isForced ? "ring-2 ring-purple-500 bg-purple-900/20" : 
                    (isDark ? "bg-[#0d1117]/95 border-gray-700 text-gray-300" : "bg-white/95 border-slate-300 text-slate-700")
                )}
                style={{ transform: `translateY(${verticalOffset}px)`, cursor: 'default' }} 
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-3 border-b pb-2 border-gray-500/20">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Activity size={14} className={clsx(isLocked ? "text-emerald-500" : "text-blue-500", "shrink-0")} />
                        <span className="font-black text-xs font-mono tracking-tighter truncate">
                            {/* displayId 적용 */}
                            {agent.displayId || agent.id}
                        </span>
                        {isPaused && <Pause size={10} className="text-red-500 animate-pulse shrink-0" />}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="hover:text-red-500 transition-colors ml-2 shrink-0 p-1 cursor-pointer">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-1.5 text-[10px] font-mono mb-4">
                    <div className="flex justify-between items-center">
                        <span className="opacity-50 flex items-center gap-1"><Cpu size={10}/> STATUS</span> 
                        <span className={clsx("font-bold px-1 rounded", isPaused ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500')}>
                            {statusLabel}
                        </span>
                    </div>
                    {!isCompact && (
                        <>
                            <div className="flex justify-between items-center">
                                <span className="opacity-50 flex items-center gap-1"><Database size={10}/> PROVIDER</span> 
                                <span className="text-blue-400 font-bold uppercase">{(agent as any).provider || 'MOCK_API'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="opacity-50">MODEL_ID</span> 
                                <span className="text-gray-400 truncate max-w-[110px]">{agent.model || 'DEFAULT'}</span>
                            </div>
                        </>
                    )}
                </div>
                
                <div className="pt-2 border-t border-gray-500/20">
                    <AgentActionButtons 
                        agent={agent} 
                        state={state}
                        onTogglePriority={togglePriority}
                        onTogglePause={onTogglePause}
                        onTerminate={terminateAgent}
                        onTransferLock={onTransferLock}
                        layout="compact"
                        showLabels={false}
                        tooltipPosition="top"
                    />
                </div>
            </div>
        </Html>
    );
};