import React, { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import clsx from 'clsx';
import { 
    X, Pause, Play, Trash2, Edit2, Check, ChevronDown, 
    AlertTriangle, Terminal, Activity, Star, Zap
} from 'lucide-react';
import { useATC } from '../context/ATCContext';
import { Tooltip } from './Tooltip';

export const AgentTacticalPanel = () => {
    const { 
        agents, 
        state, 
        toggleGlobalStop, 
        isDark, 
        togglePause, 
        startRenaming, 
        submitRename, 
        terminateAgent,
        sidebarWidth,
        togglePriority,
        transferLock,
        areTooltipsEnabled
    } = useATC();

    const isHuman = state.holder && state.holder.includes('Human');
    const globalStop = state.globalStop;
    const activeAgentCount = state.activeAgentCount;

    // Local State
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [isOpen, setIsOpen] = useState(true);

    const nodeRef = useRef(null);

    return (
        <Draggable nodeRef={nodeRef} handle=".tactical-handle" bounds="body">
            <div 
                ref={nodeRef} 
                className={clsx("fixed top-20 w-80 rounded-xl border shadow-2xl backdrop-blur-md z-[100] flex flex-col max-h-[600px] transition-none overflow-visible", 
                isDark ? "bg-[#0d1117]/90 border-gray-800 text-gray-300" : "bg-slate-50/80 border-slate-200/40 text-slate-800"
            )}
            style={{ right: sidebarWidth + 20 }}
            >
                {/* Header */}
                <div className={clsx("p-3 border-b flex justify-between items-center tactical-handle cursor-move select-none rounded-t-xl", 
                    isDark ? "bg-gray-800/20 border-gray-800" : "bg-white/40 border-slate-200/40"
                )}>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] font-mono">
                        <Terminal size={14} className="text-blue-500" />
                        <Tooltip content="Detailed Agent Operations" position="bottom">
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
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 rounded-b-xl">
                        {/* Global Actions */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            <Tooltip content={globalStop ? "Resume All Operations" : "Halt All Operations"} className="w-full h-full block" position="bottom">
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
                                <span className="text-[9px] uppercase">Active Threads</span>
                                <span className="font-bold text-lg text-blue-500 leading-none">{activeAgentCount}</span>
                            </div>
                        </div>

                        {/* Agent List */}
                        {agents.map(agent => (
                            <div key={agent.id} className={clsx("p-2 rounded border group transition-all",
                                isDark ? "bg-gray-900/50 border-gray-800 hover:border-gray-600" : "bg-white border-slate-200 hover:border-slate-300"
                            )}>
                                <div className="flex justify-between items-center mb-1">
                                    {renamingId === agent.id ? (
                                        <div className="flex items-center gap-1 flex-1 mr-2">
                                            <input 
                                                autoFocus
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                className="w-full text-xs bg-black/20 rounded px-1 py-0.5 outline-none border border-blue-500 text-white"
                                            />
                                            <button 
                                                onClick={() => {
                                                    submitRename(agent.id, newName);
                                                    setRenamingId(null);
                                                }}
                                                className="text-green-500 hover:bg-green-500/20 p-0.5 rounded"
                                            >
                                                <Check size={12} />
                                            </button>
                                            <button 
                                                onClick={() => setRenamingId(null)}
                                                className="text-red-500 hover:bg-red-500/20 p-0.5 rounded"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 font-mono text-xs font-bold text-blue-400">
                                            {agent.priority && <Star size={12} className="text-yellow-400 fill-yellow-400 animate-pulse" />}
                                            <span className={clsx(agent.priority && "text-yellow-400")}>{agent.id}</span>
                                            {agent.status === 'paused' && <span className="text-[9px] text-yellow-500 bg-yellow-500/10 px-1 rounded">PAUSED</span>}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Transfer Lock Button */}
                                        {state.holder && state.holder !== agent.id && !agent.status.includes('paused') && (
                                            <Tooltip content="Seize Control (Force Lock)">
                                                <button 
                                                    onClick={() => transferLock(agent.id)}
                                                    className="p-1 rounded hover:bg-purple-500/20 text-purple-500 transition" 
                                                >
                                                    <Zap size={12} />
                                                </button>
                                            </Tooltip>
                                        )}
                                        
                                        {/* Priority Toggle */}
                                        <Tooltip content={agent.priority ? "Revoke Priority" : "Grant Priority"}>
                                            <button 
                                                onClick={() => togglePriority(agent.id, !agent.priority)}
                                                className={clsx("p-1 rounded transition", agent.priority ? "text-yellow-400 hover:bg-yellow-400/20" : "text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/20")} 
                                            >
                                                <Star size={12} className={clsx(agent.priority && "fill-yellow-400")} />
                                            </button>
                                        </Tooltip>

                                        <Tooltip content="Rename">
                                            <button 
                                                onClick={() => {
                                                    setRenamingId(agent.id);
                                                    setNewName(agent.id);
                                                }}
                                                className="p-1 rounded hover:bg-blue-500/20 text-blue-500 transition" 
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content={agent.status === 'paused' ? "Resume" : "Pause"}>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Stop propagation
                                                    togglePause(agent.id, agent.status === 'paused');
                                                }}
                                                className={clsx("p-1 rounded hover:bg-yellow-500/20 text-yellow-500 transition")} 
                                            >
                                                {agent.status === 'paused' ? <Play size={12} /> : <Pause size={12} />}
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Terminate">
                                            <button 
                                                onClick={() => terminateAgent(agent.id)}
                                                className="p-1 rounded hover:bg-red-500/20 text-red-500 transition" 
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                                
                                {/* Status Bar */}
                                <div className="flex justify-between items-center text-[10px] opacity-60">
                                    <span>{agent.activity}</span>
                                    <span>{agent.model}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Draggable>
    );
};
