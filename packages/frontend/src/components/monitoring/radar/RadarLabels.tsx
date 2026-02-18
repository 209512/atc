// src/components/monitoring/radar/RadarLabels.tsx
import React from 'react';
import { Html } from '@react-three/drei';
import { Star, Pause } from 'lucide-react';
import clsx from 'clsx';
import { useATC } from '@/hooks/system/useATC';
import { useUI } from '@/hooks/system/useUI';
import { Agent } from '@/contexts/atcTypes';

export const RadarLabels = () => {
    const { agents, state } = useATC();
    const { selectedAgentId, isDark } = useUI();
    const isGlobalStopped = !!state?.globalStop;

    return (
        <group>
            {agents.map((agent: Agent) => {
                const isSelected = selectedAgentId === agent.id;
                const isLocked = state?.holder === agent.id;
                const isPriority = !!agent.priority;
                const isPaused = agent.status === 'paused' || agent.isPaused === true || isGlobalStopped;

                if (!agent.position) return null;

                return (
                    <Html
                        key={`label-${agent.id}`}
                        position={[agent.position[0], agent.position[1] + 0.8, agent.position[2]]}
                        center
                        distanceFactor={12}
                        zIndexRange={[0, 10]}
                        style={{ pointerEvents: 'none', transition: 'all 0.2s ease-in-out' }}
                    >
                        <div className={clsx(
                            "px-1.5 py-0.5 rounded text-[9px] font-mono border backdrop-blur-sm flex items-center gap-1 whitespace-nowrap select-none transition-all",
                            isDark 
                                ? "bg-black/60 border-white/20 text-white" 
                                : "bg-white/90 border-slate-300 text-slate-700 shadow-[0_2px_4px_rgba(0,0,0,0.05)]",
                            
                            isLocked && (isDark 
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                : "bg-emerald-50 border-emerald-500 text-emerald-600 shadow-sm"),

                            isSelected && "ring-1 ring-blue-500/50 scale-110 z-30",
                            isPaused && "opacity-50 scale-95 grayscale"
                        )}>
                            {isPriority && <Star size={8} className={clsx("fill-current", isDark ? "text-yellow-500" : "text-amber-500")} />}
                            {isPaused && <Pause size={7} className="fill-current" />}
                            <span className={clsx(isPaused && "line-through decoration-1 opacity-70")}>
                                {isPaused ? `[P] ${agent.displayId || agent.id}` : (agent.displayId || agent.id)}
                            </span>
                        </div>
                    </Html>
                );
            })}
        </group>
    );
};