import React from 'react';
import clsx from 'clsx';
import { Pause, Play } from 'lucide-react';
import { CustomTooltip } from './CustomTooltip';
import { StatusBadge } from './StatusBadge';

export const AgentRow = ({ agent, isDark, onTogglePause }) => (
    <div className={clsx("p-2.5 rounded border flex justify-between items-center", isDark ? "bg-gray-800/40 border-gray-700" : "bg-white border-gray-200")}>
        <div className="flex flex-col min-w-0 pr-2">
            <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-blue-500 text-xs">{agent.id}</span>
                <StatusBadge status={agent.status} />
            </div>
            <div className="text-[10px] opacity-60 truncate">
                {agent.resource !== 'None' && <span className="font-bold text-atc-purple mr-1">[{agent.resource}]</span>}
                {agent.activity}
            </div>
        </div>
        <CustomTooltip text={agent.status === 'PAUSED' ? "Resume" : "Pause"} position="left">
            <button onClick={onTogglePause} className={clsx("p-1.5 rounded transition-colors", isDark ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-200 text-gray-500")}>
                {agent.status === 'PAUSED' ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
        </CustomTooltip>
    </div>
);
