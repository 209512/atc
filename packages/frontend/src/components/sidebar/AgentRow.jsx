import React from 'react';
import clsx from 'clsx';
import { Pause, Play, Cpu, Lock } from 'lucide-react';
import PropTypes from 'prop-types';
import { CustomTooltip } from './CustomTooltip';
import { StatusBadge } from './StatusBadge';

export const AgentRow = ({ agent, isDark, onTogglePause, disabled, isHolder, renderExtras }) => (
    <div className={clsx(
        "p-2.5 rounded border flex justify-between items-center transition-all duration-300",
        isHolder 
            ? "bg-green-500/10 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)] scale-[1.02]" 
            : (isDark ? "bg-gray-800/40 border-gray-700" : "bg-white border-gray-200"),
        disabled && "opacity-50 pointer-events-none"
    )}>
        <div className="flex flex-col min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
                <span className={clsx("font-bold text-xs font-mono truncate max-w-[100px]", isHolder ? "text-green-400" : "text-blue-500")}>
                    {agent.id}
                </span>
                <StatusBadge status={agent.status} />
            </div>
            {agent.model && (
                <div className="flex items-center gap-1 mb-1 text-[9px] opacity-70 font-mono">
                    <Cpu className="w-2.5 h-2.5" />
                    <span>{agent.model}</span>
                </div>
            )}
            <div className="text-[10px] opacity-60 truncate font-mono">
                {agent.resource !== 'None' && <span className="font-bold text-atc-purple mr-1">[{agent.resource}]</span>}
                {agent.activity}
            </div>
        </div>
        
        <div className="flex items-center gap-1">
            {renderExtras && renderExtras()}
            
            {isHolder && (
                 <Lock className="w-3 h-3 text-green-400 animate-pulse" />
            )}
            {!renderExtras && (
                <CustomTooltip text={disabled ? "System Locked" : (agent.status === 'PAUSED' ? "Resume" : "Pause")} position="left">
                    <button 
                        onClick={onTogglePause} 
                        disabled={disabled}
                        className={clsx("p-1.5 rounded transition-colors", isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-500", disabled && "cursor-not-allowed")}
                    >
                        {agent.status === 'PAUSED' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </button>
                </CustomTooltip>
            )}
        </div>
    </div>
);

AgentRow.propTypes = {
    agent: PropTypes.shape({
        id: PropTypes.string.isRequired,
        status: PropTypes.string.isRequired,
        resource: PropTypes.string,
        activity: PropTypes.string,
        model: PropTypes.string
    }).isRequired,
    isDark: PropTypes.bool.isRequired,
    onTogglePause: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    isHolder: PropTypes.bool,
    renderExtras: PropTypes.func
};
