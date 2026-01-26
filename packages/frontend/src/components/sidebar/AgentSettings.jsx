import React, { useState } from 'react';
import { X, Save, Key, Cpu, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { API_URL } from '../../hooks/useATC';

export const AgentSettings = ({ agents, onClose, isDark }) => {
    const [selectedAgent, setSelectedAgent] = useState(agents[0]?.id || '');
    const [provider, setProvider] = useState('mock');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI traffic controller.');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await fetch(`${API_URL}/api/agents/${selectedAgent}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: {
                        provider,
                        apiKey: apiKey || undefined, // Don't send empty string if not changed
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className={clsx(
                "w-full max-w-md p-6 rounded-xl shadow-2xl border relative",
                isDark ? "bg-[#0d1117] border-gray-700 text-gray-300" : "bg-white border-gray-200 text-gray-800"
            )}>
                <button onClick={onClose} className="absolute right-4 top-4 hover:text-red-500 transition-colors">
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-atc-blue" />
                    Agent Configuration
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Agent Selector */}
                    <div>
                        <label className="block text-xs font-bold uppercase opacity-50 mb-1">Target Agent</label>
                        <select 
                            value={selectedAgent} 
                            onChange={(e) => setSelectedAgent(e.target.value)}
                            className={clsx(
                                "w-full p-2 rounded border bg-transparent outline-none focus:border-atc-blue transition-colors",
                                isDark ? "border-gray-700" : "border-gray-300"
                            )}
                        >
                            {agents.map(a => (
                                <option key={a.id} value={a.id} className="text-black">{a.id} ({a.model || 'Default'})</option>
                            ))}
                        </select>
                    </div>

                    {/* Provider */}
                    <div>
                        <label className="block text-xs font-bold uppercase opacity-50 mb-1">AI Model Provider</label>
                        <select 
                            value={provider} 
                            onChange={(e) => setProvider(e.target.value)}
                            className={clsx(
                                "w-full p-2 rounded border bg-transparent outline-none focus:border-atc-blue transition-colors",
                                isDark ? "border-gray-700" : "border-gray-300"
                            )}
                        >
                            <option value="mock" className="text-black">Mock (Simulation)</option>
                            <option value="openai" className="text-black">OpenAI (GPT-4)</option>
                            <option value="anthropic" className="text-black">Anthropic (Claude 3)</option>
                            <option value="gemini" className="text-black">Google Gemini</option>
                        </select>
                    </div>

                    {/* API Key */}
                    {provider !== 'mock' && (
                        <div>
                            <label className="block text-xs font-bold uppercase opacity-50 mb-1 flex items-center gap-1">
                                <Key className="w-3 h-3" /> API Key
                            </label>
                            <input 
                                type="password" 
                                placeholder="sk-..." 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className={clsx(
                                    "w-full p-2 rounded border bg-transparent outline-none focus:border-atc-blue transition-colors",
                                    isDark ? "border-gray-700" : "border-gray-300"
                                )}
                            />
                        </div>
                    )}

                    {/* Model Name Override */}
                    <div>
                        <label className="block text-xs font-bold uppercase opacity-50 mb-1">Model Name (Optional)</label>
                        <input 
                            type="text" 
                            placeholder="e.g. gpt-4-turbo-preview" 
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className={clsx(
                                "w-full p-2 rounded border bg-transparent outline-none focus:border-atc-blue transition-colors",
                                isDark ? "border-gray-700" : "border-gray-300"
                            )}
                        />
                    </div>

                    {/* System Prompt */}
                    <div>
                        <label className="block text-xs font-bold uppercase opacity-50 mb-1 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Persona / System Prompt
                        </label>
                        <textarea 
                            rows={3}
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            className={clsx(
                                "w-full p-2 rounded border bg-transparent outline-none focus:border-atc-blue transition-colors text-sm",
                                isDark ? "border-gray-700" : "border-gray-300"
                            )}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-atc-blue hover:bg-blue-600 text-white font-bold p-3 rounded-lg flex items-center justify-center gap-2 transition-colors mt-4"
                    >
                        <Save className="w-4 h-4" />
                        {isLoading ? 'Updating...' : 'Save Configuration'}
                    </button>
                </form>
            </div>
        </div>
    );
};
