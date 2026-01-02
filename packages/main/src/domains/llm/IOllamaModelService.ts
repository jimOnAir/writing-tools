import type { Message } from 'ollama';

import type { OllamaChatResponse } from './OllamaClient';

/**
 * Interface for Ollama model service operations
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface IOllamaModelService {
  /**
   * Fetch available Ollama models
   */
  fetchModels: () => Promise<{ models: string[] } | { error: string }>;

  /**
   * Send messages to Ollama and get response
   */
  sendMessages: (messages: Message[]) => Promise<OllamaChatResponse>;
}
