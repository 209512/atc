const BaseProvider = require('./BaseProvider');
const Anthropic = require('@anthropic-ai/sdk');

class AnthropicProvider extends BaseProvider {
  async init() {
    if (!this.config.apiKey) throw new Error('Anthropic API Key required');
    this.client = new Anthropic({ apiKey: this.config.apiKey });
  }

  async generateResponse(prompt, systemInstruction) {
    if (!this.client) {
        return '[Error] Anthropic Client not initialized. Check API Key.';
    }
    try {
      const msg = await this.client.messages.create({
        model: this.config.model || "claude-3-opus-20240229",
        max_tokens: 1024,
        system: systemInstruction,
        messages: [
          { role: "user", content: prompt }
        ]
      });
      return msg.content[0].text;
    } catch (error) {
      console.error('Anthropic Error:', error.message);
      return `[Error] Failed to generate response: ${error.message}`;
    }
  }
}

module.exports = AnthropicProvider;
