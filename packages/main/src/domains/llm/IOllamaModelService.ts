import type { Message } from 'ollama';

import type { OllamaChatResponse, OllamaStreamChunk } from './OllamaClient';

/**
 * Interface for Ollama model service operations
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface IOllamaModelService {
  /**
   * Fetch available Ollama models
   */
  fetchModels: () => Promise<{ models: string[] } | { error: string, models: string[] }>;

  /**
   * Send messages to Ollama and get response
   */
  sendMessages: (messages: Message[], options?: { maxTokens?: number }) => Promise<OllamaChatResponse>;

  /**
   * Send messages to Ollama and get streaming response
   * @param options.model - Override model; when omitted, uses settings
   */
  sendMessagesStream: (messages: Message[], options?: { model?: string }) => AsyncGenerator<OllamaStreamChunk, void>;

  /**
   * Get the model context length (num_ctx) from Ollama, or null if unavailable.
   */
  getModelContextLength: (model: string) => Promise<number | null>;
}
