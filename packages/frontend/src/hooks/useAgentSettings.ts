import { useState, useEffect } from 'react';
import { useATC } from './useATC';

export const useAgentSettings = (onClose: () => void) => {
    const { 
        agents = [], 
        updateAgentConfig, 
        isDark, 
        areTooltipsEnabled, 
        setAreTooltipsEnabled 
    } = useATC();
    
    const [selectedAgent, setSelectedAgent] = useState<string>(agents[0]?.id || '');
    const [provider, setProvider] = useState('mock');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI traffic controller.');
    const [isLoading, setIsLoading] = useState(false);
    
    const API_URL = 'http://localhost:3000';

    useEffect(() => {
        if (!selectedAgent && agents.length > 0) {
            setSelectedAgent(agents[0].id);
        }
    }, [agents, selectedAgent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAgent) return;

        if (provider !== 'mock' && !apiKey) {
            alert("실제 모델을 사용하려면 API Key가 필수입니다. 테스트를 원하시면 'Mock'을 선택하세요.");
            return; 
        }

        const nextModelName = model.trim() || 'DEFAULT_MODEL';
        updateAgentConfig(selectedAgent, { model: nextModelName });

        setIsLoading(true);
        
        try {
            const response = await fetch(`${API_URL}/api/agents/${selectedAgent}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config: { 
                        provider: provider || 'mock', 
                        apiKey: apiKey || '', 
                        model: nextModelName,
                        systemPrompt: systemPrompt || 'Default AI Controller'
                    }
                })
            });

            if (response.ok) {
                onClose();
            } else {
                console.error("SERVER_RESPONSE_ERROR");
            }
        } catch (err) {
            console.error("NETWORK_FAILURE:", err);
        } finally {
            setIsLoading(false);
        }
    };
    return {
        agents, isDark, areTooltipsEnabled, setAreTooltipsEnabled,
        selectedAgent, setSelectedAgent,
        provider, setProvider,
        apiKey, setApiKey,
        model, setModel,
        systemPrompt, setSystemPrompt,
        isLoading, handleSubmit
    };
};