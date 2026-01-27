import React, { useState, useEffect } from 'react';
import { X, Save, Key, Cpu, MessageSquare, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useATC, Agent } from '../../context/ATCContext';

interface AgentSettingsProps {
    onClose: () => void;
    agents?: Agent[]; // Optional to prevent runtime crash if not provided
}

export const AgentSettings: React.FC<AgentSettingsProps> = ({ onClose }) => {
    const { agents = [], isDark } = useATC(); // Default to empty array safely
    const [selectedAgent, setSelectedAgent] = useState<string>(agents[0]?.id || '');
    const [provider, setProvider] = useState('mock');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI traffic controller.');
    const [isLoading, setIsLoading] = useState(false);
    
    const API_URL = 'http://localhost:3000';

    // Sync selected agent if agents list changes and current selection is empty
    useEffect(() => {
        if (!selectedAgent && agents.length > 0) {
            setSelectedAgent(agents[0].id);
        }
    }, [agents, selectedAgent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await fetch(`${API_URL}/api/agents/${selectedAgent}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        provider,
                        apiKey: apiKey || undefined,
                        model: model || undefined,
                        systemPrompt
                    }
                })
            });
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

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
                    <button 
                        onClick={onClose} 
                        className={clsx("transition-colors", isDark ? "hover:text-red-400" : "hover:text-red-600")}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Agent Selector */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold uppercase opacity-50 tracking-wider">Target Agent</label>
                        <div className="relative">
                            <Cpu className="absolute left-2.5 top-2.5 w-4 h-4 opacity-50" />
                            <select 
                                value={selectedAgent} 
                                onChange={(e) => setSelectedAgent(e.target.value)}
                                className={clsx(
                                    "w-full pl-9 p-2 rounded border text-sm appearance-none outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                    isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-300 text-slate-900"
                                )}
                            >
                                {agents.map(a => (
                                    <option key={a.id} value={a.id}>{a.id} ({a.model || 'Default'})</option>
                                ))}
                                {agents.length === 0 && <option value="" disabled>No Active Agents</option>}
                            </select>
                        </div>
                    </div>

                    {/* Provider */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold uppercase opacity-50 tracking-wider">AI Model Provider</label>
                        <select 
                            value={provider} 
                            onChange={(e) => setProvider(e.target.value)}
                            className={clsx(
                                "w-full p-2 rounded border text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-slate-300 text-slate-900"
                            )}
                        >
                            <option value="mock">Mock (Simulation)</option>
                            <option value="openai">OpenAI (GPT-4)</option>
                            <option value="anthropic">Anthropic (Claude 3)</option>
                            <option value="gemini">Google Gemini</option>
                        </select>
                    </div>

                    {/* API Key */}
                    {provider !== 'mock' && (
                        <div className="space-y-1 animate-fadeIn">
                            <label className="block text-xs font-bold uppercase opacity-50 tracking-wider flex items-center gap-1">
                                API Key
                            </label>
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
                        <input 
                            type="text" 
                            placeholder="e.g. gpt-4-turbo-preview" 
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className={clsx(
                                "w-full p-2 rounded border text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all",
                                isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-600" : "bg-white border-slate-300 placeholder-slate-400"
                            )}
                        />
                    </div>

                    {/* System Prompt */}
                    <div className="space-y-1">
                        <label className="block text-xs font-bold uppercase opacity-50 tracking-wider flex items-center gap-1">
                            Persona / System Prompt
                        </label>
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
