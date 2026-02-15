import React from 'react';
import { X, Check } from 'lucide-react';
import { useTacticalActions } from '../../hooks/useTacticalActions';
import { AgentStatusBadge } from '../common/AgentStatusBadge';
import { AgentActionButtons, RenameButton } from '../common/AgentActionButtons';
import { getAgentCardStyle, getAgentTextStyle } from '../../utils/agentStyles';
import clsx from 'clsx';

interface Props {
    agent: any;
}

export const TacticalAgentItem = ({ agent }: Props) => {
    const { 
        isDark, state, renamingId, newName, setNewName, 
        handleStartRename, handleCancelRename, handleConfirmRename,
        onTransferLock, togglePriority, onTogglePause, terminateAgent 
    } = useTacticalActions();

    const isLocked = state.holder === agent.id;
    const isPaused = agent.status?.toLowerCase() === 'paused';
    const isForced = state.forcedCandidate === agent.id;

    return (
        <div className={clsx(
            getAgentCardStyle(isForced, isLocked, isPaused, agent.priority, false, isDark, state.overrideSignal, state.globalStop),
            "p-2 group relative transition-all duration-200 border rounded-sm mb-1"
        )}>
            {state.overrideSignal && (
                <div className="absolute top-0 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-10" />
            )}

            <div className="flex justify-between items-center mb-1.5 gap-2">
                {renamingId === agent.id ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                            className="w-full text-xs bg-black/40 rounded px-1 py-0.5 outline-none border border-blue-500 text-white"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirmRename(agent.id);
                                else if (e.key === 'Escape') handleCancelRename();
                            }} />
                        <button onClick={() => handleConfirmRename(agent.id)} className="text-green-500 p-0.5 rounded"><Check size={12} /></button>
                        <button onClick={handleCancelRename} className="text-red-500 p-0.5 rounded"><X size={12} /></button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 overflow-hidden group/name min-w-0 flex-1">
                         <span className={clsx(getAgentTextStyle(isForced, isLocked, isDark, state.overrideSignal), "truncate font-bold")}>
                            {agent.id}
                         </span>

                         <RenameButton 
                            onClick={(e) => { e.stopPropagation(); handleStartRename(agent.id); }} 
                            className="group-hover/name:opacity-100" 
                         />
                    </div>
                )}

                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex shrink-0">
                    <AgentActionButtons 
                        agent={agent}
                        state={state}
                        onTogglePriority={togglePriority}
                        onTogglePause={onTogglePause}
                        onTerminate={terminateAgent}
                        onTransferLock={onTransferLock}
                        tooltipPosition="left"
                    />
                </div>
            </div>
            
            <div className="flex justify-between items-center text-[10px] opacity-70 gap-2 h-4">
                <div className="flex items-center gap-2 flex-1 min-w-0 h-full">
                    <AgentStatusBadge isLocked={isLocked} isPaused={isPaused || state.globalStop} isForced={isForced} isPriority={agent.priority} />
                    <span className="truncate font-mono leading-none pt-[1px]">{agent.activity || "Standby"}</span>
                </div>
                <span className={clsx("px-1 rounded shrink-0 font-mono text-[9px] max-w-[85px] truncate py-0.5", 
                    isDark ? "bg-gray-800 text-gray-400" : "bg-gray-100 text-gray-600")}>
                    {agent.model}
                </span>
            </div>
        </div>
    );
};