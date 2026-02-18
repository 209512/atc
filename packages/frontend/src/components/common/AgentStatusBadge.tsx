// src/components/common/AgentStatusBadge.tsx
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

export const AgentStatusBadge = ({ 
    isLocked, 
    isPaused, 
    isForced, 
    isPriority, 
    className 
}: AgentStatusBadgeProps) => {
    return (
        <div className={clsx("flex items-center gap-1", className)}>
            {/* 우선순위 에이전트인 경우 별 아이콘 표시 */}
            {isPriority && (
                <Star size={12} className="text-yellow-400 fill-yellow-400 animate-pulse" />
            )}
            
            {/* 1. 정지/중단 상태 */}
            {isPaused ? (
                <span className="flex items-center gap-1 text-[9px] text-zinc-400 bg-zinc-800 px-1 rounded border border-zinc-700">
                    <Pause size={8} /> STOPPED
                </span>
            ) : 
            /* 2. 제어권 점유(활성) 상태 */
            isLocked ? (
                <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20 animate-pulse font-bold">
                    <Activity size={8} /> LIVE_LOCK
                </span>
            ) : 
            /* 3. 제어권 강제 이양 시도 중 */
            isForced ? (
                <span className="flex items-center gap-1 text-[9px] text-purple-400 bg-purple-500/10 px-1 rounded border border-purple-500/30 animate-pulse font-bold">
                    <Zap size={8} className="fill-current" /> SEIZING
                </span>
            ) : null}
        </div>
    );
};