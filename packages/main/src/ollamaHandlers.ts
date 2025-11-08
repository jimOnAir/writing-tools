import { logger } from '@writing-tools/shared';
import type { Message } from 'ollama';
import { Ollama } from 'ollama';

import { loadSettings } from './settings';

export async function fetchOllamaModels() {
  try {
    const settings = loadSettings();
    const ollama = new Ollama({ host: settings.ollama.address });
    const response = await ollama.list();

    return { models: response.models.map(m => m.name) };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error.message
      : String(Error);
    logger.error('Failed to fetch Ollama models: %s', errorMessage);

    return { error: errorMessage };
  }
}

export async function sendOllamaMessages(messages: Message[]) {
  try {
    const settings = loadSettings();
    const { address, model } = settings.ollama;
    const ollama = new Ollama({ host: address });
    if (!model) {
      throw new Error('Model not specified');
    }
    const response = await ollama.chat({
      model,
      messages,
      stream: false,
    });

    return { response: response.message.content };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error.message
      : String(Error);
    logger.error('Failed to fetch Ollama models: %s', errorMessage);

    return { error: errorMessage };
  }
}
