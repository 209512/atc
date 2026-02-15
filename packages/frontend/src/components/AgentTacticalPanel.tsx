import React, { useRef, useState, useMemo } from 'react';
import Draggable from 'react-draggable';
import clsx from 'clsx';
import { ChevronDown, Radio, Play, Pause } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { TacticalAgentItem } from './sidebar/TacticalAgentItem';
import { useTacticalActions } from '../hooks/useTacticalActions';
import { Agent } from '../contexts/atcTypes';

export const AgentTacticalPanel = () => {
    const { 
        agents, isDark, sidebarWidth, globalStop, toggleGlobalStop
    } = useTacticalActions();

    const [isOpen, setIsOpen] = useState(true);
    const nodeRef = useRef(null);

    const activeCount = useMemo(() => {
        return agents.filter((a: Agent) => {
            const isPaused = String(a.status).toLowerCase() === 'paused' || a.isPaused;
            return !isPaused && !globalStop;
        }).length;
    }, [agents, globalStop]);

    return (
        <Draggable nodeRef={nodeRef} handle=".tactical-handle" bounds="body">
            <div 
                ref={nodeRef} 
                className={clsx("fixed top-20 w-80 rounded-xl border shadow-2xl backdrop-blur-md z-[100] flex flex-col max-h-[600px] transition-none overflow-hidden", 
                isDark ? "bg-[#0d1117]/90 border-gray-800 text-gray-300" : "bg-slate-50/80 border-slate-200/40 text-slate-800"
            )}
            style={{ right: sidebarWidth + 20 }}
            >
                <div className={clsx("p-3 border-b flex justify-between items-center tactical-handle cursor-move select-none rounded-t-xl shrink-0", 
                    isDark ? "bg-gray-800/20 border-gray-800" : "bg-white/40 border-slate-200/40"
                )}>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] font-mono">
                        <Radio size={14} className="text-blue-500" />
                        <Tooltip content="Detailed Agent Operations" position="bottom-right">
                            Tactical Command
                        </Tooltip>
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => setIsOpen(!isOpen)}
                            className={clsx("p-1 rounded hover:bg-white/10 transition", !isOpen && "rotate-180")}
                        >
                            <ChevronDown size={14} />
                        </button>
                    </div>
                </div>

                {isOpen && (
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 rounded-b-xl pb-2">
                        <div className="grid grid-cols-2 gap-2 mb-3 shrink-0">
                            <Tooltip content={globalStop ? "Resume All" : "Halt All"} className="w-full h-full block" position="bottom">
                                <button
                                    onClick={toggleGlobalStop}
                                    className={clsx("w-full h-full p-2 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-all border",
                                        globalStop 
                                            ? "bg-red-500 text-white border-red-600 animate-pulse" 
                                            : (isDark ? "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700" : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50")
                                    )}
                                >
                                    {globalStop ? <Play size={12} /> : <Pause size={12} />}
                                    {globalStop ? "RESUME ALL" : "HALT ALL"}
                                </button>
                            </Tooltip>
                             <div className={clsx("p-2 rounded text-[10px] font-mono flex flex-col items-center justify-center border",
                                isDark ? "bg-gray-900 border-gray-800 text-gray-500" : "bg-slate-50 border-slate-200 text-slate-500"
                            )}>
                                <span className="text-[9px] uppercase font-bold">Active / Total</span>
                                <span className="font-bold text-lg text-blue-500 leading-none">
                                    {activeCount} <span className="text-xs opacity-50">/ {agents.length}</span>
                                </span>
                            </div>
                        </div>

                        {agents.map((agent: Agent) => (
                            <TacticalAgentItem 
                                key={`tactical-${agent.id}`}
                                agent={agent}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Draggable>
    );
};