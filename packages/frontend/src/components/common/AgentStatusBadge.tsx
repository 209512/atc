import React from 'react';
import clsx from 'clsx';
import { Star, Zap, Pause, Activity } from 'lucide-react';

interface AgentStatusBadgeProps {
    isLocked: boolean;
    isPaused: boolean;
    isForced: boolean;
    isPriority: boolean;
    className?: string;
}

export const AgentStatusBadge = ({ isLocked, isPaused, isForced, isPriority, className }: AgentStatusBadgeProps) => {
    return (
        <div className={clsx("flex items-center gap-1", className)}>
            {isPriority && <Star size={12} className="text-yellow-400 fill-yellow-400 animate-pulse" />}
            
            {isPaused && (
                <span className="flex items-center gap-1 text-[9px] text-yellow-500 bg-yellow-500/10 px-1 rounded">
                    <Pause size={8} className="fill-current" /> PAUSED
                </span>
            )}
            
            {isLocked && (
                <span className="flex items-center gap-1 text-[9px] text-emerald-500 bg-emerald-500/10 px-1 rounded animate-pulse font-bold">
                    <Activity size={8} /> LOCKED
                </span>
            )}
            
            {isForced && !isLocked && (
                <span className="flex items-center gap-1 text-[9px] text-purple-500 bg-purple-500/10 px-1 rounded animate-pulse font-bold">
                    <Zap size={8} className="fill-current" /> SEIZING...
                </span>
            )}
        </div>
    );
};
