import React, { useState } from 'react';
import { X, Save, Key, Cpu, MessageSquare, Settings, ChevronDown, Boxes } from 'lucide-react';
import clsx from 'clsx';
import { Agent } from '../../contexts/atcTypes';
import { useAgentSettings } from '../../hooks/useAgentSettings';

interface AgentSettingsProps {
    onClose: () => void;
    agents?: Agent[];
}

export const AgentSettings: React.FC<AgentSettingsProps> = ({ onClose }) => {
    // 각 드롭다운의 열림 상태 관리
    const [isAgentOpen, setIsAgentOpen] = useState(false);
    const [isProviderOpen, setIsProviderOpen] = useState(false);

    const {
        agents, isDark, areTooltipsEnabled, setAreTooltipsEnabled,
        selectedAgent, setSelectedAgent, provider, setProvider,
        apiKey, setApiKey, model, setModel, systemPrompt, setSystemPrompt,
        isLoading, handleSubmit
    } = useAgentSettings(onClose);

    const providers = [
        { id: 'mock', name: 'Mock (Simulation)' },
        { id: 'openai', name: 'OpenAI (GPT-4)' },
        { id: 'anthropic', name: 'Anthropic (Claude 3)' },
        { id: 'gemini', name: 'Google Gemini' }
    ];

    return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div 
                className={clsx(
                    "w-full max-w-md p-6 rounded-xl shadow-2xl border relative backdrop-blur-md transition-all",
                    isDark ? "bg-[#0d1117]/95 border-gray-700 text-gray-300" : "bg-white/95 border-slate-200 text-slate-800"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={clsx("flex justify-between items-center border-b pb-3 mb-5", 
                    isDark ? "border-gray-500/20" : "border-slate-200"
                )}>
                    <h2 className="flex items-center gap-2 font-mono font-bold tracking-[0.2em] uppercase text-sm">
                        <Settings size={16} className="text-blue-500" />
                        Agent Configuration
                    </h2>
                    <button onClick={onClose} className={clsx("transition-colors", isDark ? "hover:text-red-400" : "hover:text-red-600")}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Interface Settings */}
                    <div className="p-3 rounded-lg border border-dashed border-gray-500/30 bg-gray-500/5">
                        <label className="flex items-center justify-between cursor-pointer">
                            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <MessageSquare size={14} />
                                Enable Tooltips
                            </span>
                            <div className="relative inline-block w-8 h-4 align-middle select-none transition duration-200 ease-in">
                                <input 
                                    type="checkbox" 
                                    checked={areTooltipsEnabled}
                                    onChange={(e) => setAreTooltipsEnabled(e.target.checked)}
                                    className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-4"
                                />
                                <label className={clsx("toggle-label block overflow-hidden h-4 rounded-full cursor-pointer", areTooltipsEnabled ? "bg-blue-500" : "bg-gray-400")}></label>
                            </div>
                        </label>
                    </div>

                    {/* Agent Selector (Custom Dropdown) */}
                    <div className="space-y-1 relative">
                        <label className="block text-xs font-bold uppercase opacity-50 tracking-wider">Target Agent</label>
                        <button 
                            type="button"
                            onClick={() => { setIsAgentOpen(!isAgentOpen); setIsProviderOpen(false); }}
                            className={clsx(
                                "w-full pl-9 pr-4 p-2 rounded border text-sm flex items-center justify-between transition-all outline-none focus:ring-2 focus:ring-blue-500",
                                isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-300 text-slate-900"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Cpu className="absolute left-2.5 w-4 h-4 opacity-50" />
                                <span>{selectedAgent || "Select Agent"}</span>
                            </div>
                            <ChevronDown size={14} className={clsx("transition-transform", isAgentOpen && "rotate-180")} />
                        </button>

                        {isAgentOpen && (
                            <div className={clsx(
                                "absolute z-[110] w-full mt-1 border rounded shadow-2xl max-h-48 overflow-y-auto animate-fadeIn",
                                isDark ? "bg-gray-900 border-gray-700" : "bg-white border-slate-200"
                            )}>
                                {agents.map((a: Agent) => (
                                    <div 
                                        key={a.id}
                                        onClick={() => { setSelectedAgent(a.id); setIsAgentOpen(false); }}
                                        className="p-2 pl-9 text-sm cursor-pointer hover:bg-blue-600 hover:text-white transition-colors border-b border-gray-500/10 last:border-0"
                                    >
                                        {a.id} <span className="text-[10px] opacity-50 ml-2">[{a.model}]</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Provider Selector (Custom Dropdown - UI Unified) */}
                    <div className="space-y-1 relative">
                        <label className="block text-xs font-bold uppercase opacity-50 tracking-wider">AI Model Provider</label>
                        <button 
                            type="button"
                            onClick={() => { setIsProviderOpen(!isProviderOpen); setIsAgentOpen(false); }}
                            className={clsx(
                                "w-full pl-9 pr-4 p-2 rounded border text-sm flex items-center justify-between transition-all outline-none focus:ring-2 focus:ring-blue-500",
                                isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-300 text-slate-900"
                            )}
                        >
                            <div className="flex items-center gap-2">
                                <Boxes className="absolute left-2.5 w-4 h-4 opacity-50" />
                                <span>{providers.find(p => p.id === provider)?.name || "Select Provider"}</span>
                            </div>
                            <ChevronDown size={14} className={clsx("transition-transform", isProviderOpen && "rotate-180")} />
                        </button>

                        {isProviderOpen && (
                            <div className={clsx(
                                "absolute z-[110] w-full mt-1 border rounded shadow-2xl max-h-48 overflow-y-auto animate-fadeIn",
                                isDark ? "bg-gray-900 border-gray-700" : "bg-white border-slate-200"
                            )}>
                                {providers.map((p) => (
                                    <div 
                                        key={p.id}
                                        onClick={() => { setProvider(p.id); setIsProviderOpen(false); }}
                                        className="p-2 pl-9 text-sm cursor-pointer hover:bg-blue-600 hover:text-white transition-colors border-b border-gray-500/10 last:border-0"
                                    >
                                        {p.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* API Key */}
                    {provider !== 'mock' && (
                        <div className="space-y-1 animate-fadeIn">
                            <label className="block text-xs font-bold uppercase opacity-50 tracking-wider">API Key</label>
                            <div className="relative">
                                <Key className="absolute left-2.5 top-2.5 w-4 h-4 opacity-50" />
                                <input 
                                    type="password" 
                                    placeholder="sk-..." 
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className={clsx(
                                        "w-full pl-9 p-2 rounded border text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                        isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-600" : "bg-white border-slate-300 placeholder-slate-400"
                                    )}
                                />
                            </div>
                        </div>
                    )}

                    {/* Model Name Override */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold uppercase opacity-50 tracking-wider">Model Name (Optional)</label>
                        <div className="relative">
                            <Settings className="absolute left-2.5 top-2.5 w-4 h-4 opacity-50" />
                            <input 
                                type="text" 
                                placeholder="e.g. gpt-4-turbo-preview" 
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className={clsx(
                                    "w-full pl-9 p-2 rounded border text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                    isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-600" : "bg-white border-slate-300 placeholder-slate-400"
                                )}
                            />
                        </div>
                    </div>

                    {/* System Prompt */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold uppercase opacity-50 tracking-wider">Persona / System Prompt</label>
                        <div className="relative">
                            <MessageSquare className="absolute left-2.5 top-2.5 w-4 h-4 opacity-50" />
                            <textarea 
                                rows={3}
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                className={clsx(
                                    "w-full pl-9 p-2 rounded border text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none",
                                    isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-600" : "bg-white border-slate-300 placeholder-slate-400"
                                )}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading || !selectedAgent}
                        className={clsx(
                            "w-full font-bold p-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg",
                            isLoading || !selectedAgent 
                                ? "bg-gray-600 cursor-not-allowed opacity-50" 
                                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 active:scale-[0.98]"
                        )}
                    >
                        <Save className="w-4 h-4" />
                        {isLoading ? 'Updating...' : 'Save Configuration'}
                    </button>
                </form>
            </div>
        </div>
    );
};