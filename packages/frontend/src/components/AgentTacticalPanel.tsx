import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import { Activity, X, ChevronDown, ChevronUp, Play, Square, Edit2, Trash2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { AgentRow } from './sidebar/AgentRow';

export const AgentTacticalPanel = ({ 
    agents, 
    activeAgentCount,
    globalStop, 
    toggleGlobalStop, 
    isDark, 
    isHuman, 
    onTogglePause, 
    startRenaming, 
    submitRename, 
    terminateAgent,
    renamingId,
    setRenamingId,
    newName,
    setNewName,
    sidebarWidth = 450
}) => {
    const nodeRef = useRef(null);
    const [isOpen, setIsOpen] = useState(true);

    return (
        <Draggable nodeRef={nodeRef} handle=".tactical-handle" bounds="body">
            <div 
                ref={nodeRef} 
                className={clsx("fixed top-20 w-80 rounded-xl border shadow-2xl backdrop-blur-md z-40 overflow-hidden flex flex-col max-h-[600px] transition-all duration-300", 
                isDark ? "bg-[#0d1117]/95 border-gray-700" : "bg-white/90 border-slate-400 shadow-xl"
            )}
            style={{ right: sidebarWidth + 20 }}
            >
                {/* Header */}
                <div className={clsx("tactical-handle p-3 border-b flex justify-between items-center cursor-move transition-colors select-none",
                     isDark ? "border-gray-700/50 bg-gradient-to-r from-gray-900/50 to-transparent hover:bg-gray-800/50" : "border-slate-200/50 bg-gradient-to-r from-slate-100/50 to-transparent hover:bg-slate-100/50"
                )}>
                     <h3 className={clsx("text-xs font-bold flex items-center gap-2 opacity-90", isDark ? "text-atc-blue" : "text-blue-600")}>
                        <Activity className="w-3.5 h-3.5" /> 
                        TACTICAL_NET ({agents.length})
                     </h3>
                     <div className="flex gap-2">
                         <button onClick={() => toggleGlobalStop(!globalStop)} className={clsx("p-1 rounded transition-colors", globalStop ? "bg-red-500 text-white" : "hover:bg-gray-500/20 text-gray-400")}>
                             {globalStop ? <Play className="w-3 h-3 fill-current" /> : <Square className="w-3 h-3 fill-current" />}
                         </button>
                         <button onClick={() => setIsOpen(!isOpen)} className="p-1 rounded hover:bg-gray-500/20 text-gray-400">
                             {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                         </button>
                     </div>
                </div>
                
                {/* Content */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }} 
                            animate={{ height: 'auto', opacity: 1 }} 
                            exit={{ height: 0, opacity: 0 }} 
                            className={clsx("overflow-y-auto custom-scrollbar p-2 space-y-2", isDark ? "bg-black/20" : "bg-slate-100/20")}
                        >
                            {agents.length === 0 && <div className="text-center text-[10px] opacity-40 py-4 font-mono">NO ACTIVE SIGNALS</div>}
                            
                            {agents.map(agent => (
                                <div key={agent.id} className="relative group">
                                    {renamingId === agent.id ? (
                                        <div className={clsx("flex gap-1 p-2 rounded border items-center", isDark ? "bg-black/40 border-atc-blue/30" : "bg-white/40 border-blue-500/30")}>
                                            <input 
                                                autoFocus
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                className={clsx("flex-1 bg-transparent text-xs outline-none font-mono", isDark ? "text-white" : "text-slate-800")}
                                                placeholder="NEW_CALLSIGN"
                                            />
                                            <button onClick={submitRename} className="p-1 hover:bg-green-500/20 rounded"><Check className="w-3 h-3 text-green-500" /></button>
                                            <button onClick={() => setRenamingId(null)} className="p-1 hover:bg-red-500/20 rounded"><X className="w-3 h-3 text-red-500" /></button>
                                        </div>
                                    ) : (
                                        <AgentRow 
                                            agent={agent} 
                                            isDark={isDark} 
                                            onTogglePause={() => onTogglePause(agent.id, agent.status)}
                                            disabled={isHuman}
                                            renderExtras={() => (
                                                <div className="flex gap-1 ml-2">
                                                    <button onClick={() => startRenaming(agent)} className="p-1.5 hover:bg-blue-500/20 rounded text-gray-400 hover:text-atc-blue transition-colors" title="Rename Callsign">
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={() => terminateAgent(agent.id)} className="p-1.5 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-500 transition-colors" title="Terminate Signal">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}
                                        />
                                    )}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </Draggable>
    );
};
