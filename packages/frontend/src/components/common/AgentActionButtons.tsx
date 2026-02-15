import React from 'react';
import clsx from 'clsx';
import { Play, Pause, Trash2, Star, Zap, Edit2 } from 'lucide-react'; // Edit2 추가
import { Tooltip } from '../Tooltip';
import { Agent } from '../../contexts/atcTypes';

interface AgentActionButtonsProps {
    agent: Agent;
    state: any;
    onTogglePriority: (id: string, enable: boolean) => void;
    onTogglePause: (id: string, isPaused: boolean) => void; 
    onTerminate: (id: string) => void;
    onTransferLock: (id: string) => void;
    layout?: 'row' | 'compact';
    showLabels?: boolean;
    tooltipPosition?: 'top' | 'bottom' | 'left' | 'right' | 'bottom-left' | 'bottom-right';
}


export const RenameButton = ({ onClick, className }: { onClick: (e: React.MouseEvent) => void, className?: string }) => (
    <Tooltip content="Rename Agent" position="right">
        <button 
            onClick={onClick}
            className={clsx(
                "p-1 rounded transition-all hover:bg-blue-500/10 text-blue-400 group-hover/card:opacity-100 opacity-0 shrink-0 cursor-pointer",
                className
            )}
        >
            <Edit2 size={11} />
        </button>
    </Tooltip>
);


export const getActionButtonClass = (active: boolean, colorClass: string, hoverClass: string, disabled?: boolean, showLabels?: boolean) => 
    clsx(
        "p-1.5 rounded transition-all flex items-center justify-center gap-1",
        active ? colorClass : `text-gray-400 ${hoverClass}`,
        showLabels && "flex-1 text-[10px]",
        disabled ? "opacity-20 cursor-not-allowed grayscale" : "cursor-pointer"
    );

export const AgentActionButtons = ({
    agent,
    state,
    onTogglePriority,
    onTogglePause,
    onTerminate,
    onTransferLock,
    layout = 'row',
    showLabels = false,
    tooltipPosition = 'bottom'
}: AgentActionButtonsProps) => {
    const isLocked = state.holder === agent.id;
    const isPaused = agent.status?.toLowerCase() === 'paused';
    const isGlobalStopped = !!state.globalStop;
    const effectivePaused = isPaused || isGlobalStopped;
    const hasPriority = !!agent.priority;

    const canSeize = !!(state.holder && !isLocked && !effectivePaused);

    return (
        <div className={clsx("flex items-center gap-1", layout === 'compact' && "justify-between w-full mt-2")}>
            
            {/* 1. Priority Button */}
            <Tooltip content={hasPriority ? "Revoke Priority" : "Grant Priority"} position={tooltipPosition}>
                <button 
                    onClick={(e) => { e.stopPropagation(); onTogglePriority(agent.id, !hasPriority); }}
                    className={getActionButtonClass(hasPriority, "bg-yellow-500/10 text-yellow-500 border border-yellow-500/50", "hover:bg-yellow-400/10", false, showLabels)}
                >
                    <Star size={12} className={clsx(hasPriority && "fill-current")} />
                    {showLabels && <span>Priority</span>}
                </button>
            </Tooltip>

            {/* 2. Seize Button */}
            <Tooltip content={canSeize ? "Force Lock Transfer" : "Cannot Seize"} position={tooltipPosition}>
                <button 
                    onClick={(e) => { e.stopPropagation(); onTransferLock(agent.id); }} 
                    disabled={!canSeize}
                    className={getActionButtonClass(canSeize, "bg-purple-500/10 text-purple-500 border border-purple-500/50", "hover:bg-purple-500/20", !canSeize, showLabels)}
                >
                    <Zap size={12} fill={canSeize ? "currentColor" : "none"} />
                    {showLabels && <span>Seize</span>}
                </button>
            </Tooltip>

            {/* 3. Pause / Resume Button */}
            <Tooltip content={isPaused ? "Resume" : "Pause"} position={tooltipPosition}>
                <button 
                    disabled={isGlobalStopped} 
                    onClick={(e) => { e.stopPropagation(); onTogglePause(agent.id, isPaused); }} 
                    className={getActionButtonClass(isPaused, "bg-zinc-700 text-zinc-100 border border-zinc-500", "hover:bg-zinc-600", isGlobalStopped, showLabels)}
                >
                    {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                    {showLabels && <span>{isPaused ? 'Resume' : 'Pause'}</span>}
                </button>
            </Tooltip>

            {/* 4. Terminate Button */}
            <Tooltip content="Terminate Agent" position={tooltipPosition}>
                <button 
                    onClick={(e) => { e.stopPropagation(); onTerminate(agent.id); }} 
                    className={getActionButtonClass(false, "", "hover:bg-red-500/20 text-red-500", false, showLabels)}
                >
                    <Trash2 size={12} />
                    {showLabels && <span>Terminate</span>}
                </button>
            </Tooltip>
        </div>
    );
};