import { Message, Ollama } from 'ollama';
import { loadSettings } from './settings';
import { logger } from '@writing-tools/shared';

export async function fetchOllamaModels() {
  try {
    const settings = loadSettings();
    const ollama = new Ollama({ host: settings.ollama.address });
    const response = await ollama.list();
    return { models: response.models };
  } catch (error: any) {
    logger.error('Failed to fetch Ollama models: %s', error);
    return { error: error.message };
  }
}

export async function sendOllamaMessages(messages: Message[]) {
  try {
    const settings = loadSettings();
    const { address, model } = settings.ollama;
    const ollama = new Ollama({ host: address });
    const response = await ollama.chat({
      model: model!,
      messages,
      stream: false
    });

    return { response: response.message.content };
  } catch (error: any) {
    logger.error('Failed to send message to Ollama: %s', error);
    return { error: error.message };
  }
}
