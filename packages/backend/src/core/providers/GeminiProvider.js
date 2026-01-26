const BaseProvider = require('./BaseProvider');
const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiProvider extends BaseProvider {
  async init() {
    if (!this.config.apiKey) throw new Error('Gemini API Key required');
    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.config.model || "gemini-pro" });
  }

  async generateResponse(prompt, systemInstruction) {
    if (!this.model) {
        return '[Error] Gemini Model not initialized. Check API Key.';
    }
    try {
      const fullPrompt = systemInstruction 
        ? `System: ${systemInstruction}\nUser: ${prompt}`
        : prompt;

      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini Error:', error.message);
      return `[Error] Failed to generate response: ${error.message}`;
    }
  }
}

module.exports = GeminiProvider;
