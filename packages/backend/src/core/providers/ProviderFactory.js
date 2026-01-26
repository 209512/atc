const OpenAIProvider = require('./OpenAIProvider');
const GeminiProvider = require('./GeminiProvider');
const AnthropicProvider = require('./AnthropicProvider');
const BaseProvider = require('./BaseProvider');

class MockProvider extends BaseProvider {
    async init() { console.log('Mock Provider Initialized'); }
    async generateResponse(prompt, system) {
        // Simulate varying latency
        const delay = 500 + Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay)); 
        return `[MOCK] Processed by ${this.config.model || 'Simulation'} | Context: ${system ? 'Persona Active' : 'Default'}`;
    }
}

class ProviderFactory {
  static create(type, config) {
    if (!type) return new MockProvider(config);
    
    switch (type.toLowerCase()) {
      case 'openai': return new OpenAIProvider(config);
      case 'gemini': return new GeminiProvider(config);
      case 'anthropic': return new AnthropicProvider(config);
      case 'mock': return new MockProvider(config);
      default: 
        console.warn(`Unknown provider type '${type}', falling back to Mock.`);
        return new MockProvider(config);
    }
  }
}

module.exports = ProviderFactory;
