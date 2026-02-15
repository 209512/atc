import React from 'react';
import { Html } from '@react-three/drei';
import { X, Pause, Zap } from 'lucide-react'; 
import clsx from 'clsx';
import { Agent } from '../../contexts/atcTypes';
import { useATC } from '../../hooks/useATC';
import { AgentActionButtons } from '../common/AgentActionButtons';

interface AgentDetailPopupProps {
    agent: Agent | undefined;
    position: [number, number, number] | undefined;
    onClose: () => void;
    isDark: boolean;
    onTerminate: (id: string) => void;
    onTogglePriority: (id: string, enable: boolean) => void;
    onTransferLock: (id: string) => void;
    onTogglePause: (id: string, isPaused: boolean) => void;
}

export const AgentDetailPopup = ({ 
    agent, position, onClose, isDark, 
    onTerminate, onTogglePriority, onTransferLock, onTogglePause 
}: AgentDetailPopupProps) => {
    const { state } = useATC();

    if (!agent || !position) return null;

    const isPaused = String(agent.status || '').toLowerCase() === 'paused';
    const isForced = state.forcedCandidate === agent.id;
    const isLowerHalf = position[2] > 2;
    const verticalOffset = isLowerHalf ? -180 : 60; 

    return (
        <Html 
            position={position} 
            style={{ pointerEvents: 'none' }} 
            zIndexRange={[9999, 0]}
        >
             <div 
                className={clsx(
                    "absolute w-64 p-4 rounded-lg border shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-300 animate-in fade-in zoom-in-95",
                    isForced ? "ring-2 ring-purple-500 border-purple-400 bg-purple-900/20" : 
                    (isDark ? "bg-[#0d1117]/95 border-gray-700 text-gray-300" : "bg-white/95 border-slate-300 text-slate-700")
                )}
                style={{ 
                    transform: `translate(-50%, ${verticalOffset}px)`,
                    pointerEvents: 'auto',
                }} 
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-3 border-b pb-2 border-gray-500/20">
                    <div className="flex items-center gap-2">
                        <div className={clsx("font-black text-sm font-mono tracking-tighter", 
                            isForced ? "text-purple-400" : (isPaused ? "text-red-500" : "text-blue-500")
                        )}>
                            {agent.id}
                        </div>
                        {isPaused && <Pause size={10} className="text-red-500 fill-current animate-pulse" />}
                        {isForced && <Zap size={10} className="text-purple-400 animate-bounce" />}
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onClose(); }} 
                        className="p-1 hover:bg-red-500/20 rounded-md hover:text-red-500 transition-all"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Info Grid */}
                <div className="space-y-1.5 text-[11px] font-mono mb-4">
                    <div className="flex justify-between items-center">
                        <span className="opacity-50">STATUS</span> 
                        <span className={clsx(
                            "font-bold px-1.5 rounded",
                            isForced ? "text-purple-400 bg-purple-500/10" : 
                            (isPaused ? 'text-red-500 bg-red-500/10' : 'text-emerald-500 bg-emerald-500/10')
                        )}>
                            {isForced ? 'SEIZING' : agent.status.toUpperCase()}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-50">PRIORITY</span> 
                        <span className={agent.priority ? "text-yellow-500" : ""}>{agent.priority ? 'CRITICAL' : 'ROUTINE'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="opacity-50">MODEL</span> 
                        <span className="truncate max-w-[120px] text-blue-400">{agent.model || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-500/10 mt-1 pt-1 italic opacity-40">
                        <span>LATENCY</span> 
                        <span>{Math.floor(Math.random() * 50 + 10)}ms</span>
                    </div>
                </div>
                
                {/* Action Buttons */}
                <div className="pt-2 border-t border-gray-500/20">
                    <AgentActionButtons 
                        agent={agent}
                        state={state}
                        onTogglePriority={onTogglePriority}
                        onTogglePause={onTogglePause}
                        onTerminate={onTerminate}
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