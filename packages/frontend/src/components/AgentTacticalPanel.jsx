import React, { useRef, useState } from 'react';
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
    setNewName
}) => {
    const nodeRef = useRef(null);
    const [isOpen, setIsOpen] = useState(true);

    return (
        <Draggable nodeRef={nodeRef} handle=".tactical-handle" bounds="body">
            <div ref={nodeRef} className={clsx("fixed top-20 right-20 w-80 rounded-xl border shadow-2xl backdrop-blur-md z-50 overflow-hidden flex flex-col max-h-[600px]", isDark ? "bg-[#0d1117]/95 border-gray-700" : "bg-white/95 border-gray-200")}>
                {/* Header */}
                <div className="tactical-handle p-3 border-b border-gray-700/50 flex justify-between items-center cursor-move bg-gradient-to-r from-gray-900/50 to-transparent hover:bg-gray-800/50 transition-colors select-none">
                     <h3 className="text-xs font-bold flex items-center gap-2 opacity-90 text-atc-blue">
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
                            className="overflow-y-auto custom-scrollbar p-2 space-y-2 bg-black/20"
                        >
                            {agents.length === 0 && <div className="text-center text-[10px] opacity-40 py-4 font-mono">NO ACTIVE SIGNALS</div>}
                            
                            {agents.map(agent => (
                                <div key={agent.id} className="relative group">
                                    {renamingId === agent.id ? (
                                        <div className="flex gap-1 p-2 bg-black/40 rounded border border-atc-blue/30 items-center">
                                            <input 
                                                autoFocus
                                                value={newName}
                                                onChange={(e) => setNewName(e.target.value)}
                                                className="flex-1 bg-transparent text-xs outline-none font-mono text-white"
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
                                            // Only render lock icon if holder, no extra styling here to keep it clean in tactical view? 
                                            // Actually user wants rename/terminate here.
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
