// src/core/providers/ProviderFactory.js
const OpenAIProvider = require('./OpenAIProvider');
const GeminiProvider = require('./GeminiProvider');
const AnthropicProvider = require('./AnthropicProvider');
const BaseProvider = require('./BaseProvider');

class MockProvider extends BaseProvider {
    async init() { console.log('Mock Provider Initialized'); }
    async generateResponse(prompt, system) {
        const delay = 500 + Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay)); 
        return `[MOCK] Processed by ${this.config.model || 'Simulation'} | Context: ${system ? 'Persona Active' : 'Default'}`;
    }
}

class ProviderFactory {
  static create(type, agentConfig = {}) {
    const apiKeyMap = {
        openai: process.env.OPENAI_API_KEY,
        gemini: process.env.GEMINI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY
    };

    const config = {
        apiKey: apiKeyMap[type?.toLowerCase()] || null,
        model: agentConfig?.model || process.env.DEFAULT_MODEL || 'gpt-3.5-turbo',
        ...agentConfig
    };

    const providerType = type?.toLowerCase();

    if (!providerType || providerType === 'mock' || !config.apiKey) {
        if (providerType !== 'mock' && !config.apiKey) {
            console.warn(`⚠️ API Key missing for ${type}. Falling back to Mock.`);
        }
        return new MockProvider(config);
    }
    
    switch (providerType) {
      case 'openai': return new OpenAIProvider(config);
      case 'gemini': return new GeminiProvider(config);
      case 'anthropic': return new AnthropicProvider(config);
      default: return new MockProvider(config);
    }
  }
}

module.exports = ProviderFactory;
