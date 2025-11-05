import { Ollama } from 'ollama';

// Ollama-related IPC handlers
export async function fetchOllamaModels(ollamaAddress: string) {
  try {
    const ollama = new Ollama({ host: ollamaAddress });
    const response = await ollama.list();
    return { models: response.models };
  } catch (error: any) {
    console.error('Failed to fetch Ollama models:', error);
    return { error: error.message };
  }
}

export async function sendOllamaMessage(address: string, model: string, messages: any[]) {
  try {
    const ollama = new Ollama({ host: address });
    const response = await ollama.chat({
      model: model,
      messages: messages,
      stream: false
    });

    console.log(messages);
    return { response: response.message.content };
  } catch (error: any) {
    console.error('Failed to send message to Ollama:', error);
    return { error: error.message };
  }
}
