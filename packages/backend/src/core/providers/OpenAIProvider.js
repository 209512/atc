const BaseProvider = require('./BaseProvider');
const OpenAI = require('openai');

class OpenAIProvider extends BaseProvider {
  async init() {
    if (!this.config.apiKey) throw new Error('OpenAI API Key required');
    this.client = new OpenAI({ apiKey: this.config.apiKey });
  }

  async generateResponse(prompt, systemInstruction) {
    if (!this.client) {
        return '[Error] OpenAI Client not initialized. Check API Key.';
    }
    try {
      const completion = await this.client.chat.completions.create({
        messages: [
            { role: "system", content: systemInstruction || "You are a helpful AI agent." },
            { role: "user", content: prompt }
        ],
        model: this.config.model || "gpt-3.5-turbo",
      });
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI Error:', error.message);
      return `[Error] Failed to generate response: ${error.message}`;
    }
  }
}

module.exports = OpenAIProvider;
