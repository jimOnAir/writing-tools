import type { Message } from 'ollama';

import type { LMStudioChatResponse, LMStudioStreamChunk } from './LMStudioClient';
import type { OllamaChatResponse, OllamaStreamChunk } from './OllamaClient';

export type LLMChatResponse = OllamaChatResponse | LMStudioChatResponse;

export type LLMStreamChunk = OllamaStreamChunk | LMStudioStreamChunk;

/**
 * Interface for model service operations
 * Adapter that selects the appropriate provider service based on settings
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface IModelService {
  /**
   * Fetch available models for a provider
   */
  fetchModels: (providerOverride: 'ollama' | 'lmstudio') => Promise<{ models: string[] } | { error: string, models: string[] }>;

  /**
   * Get the model context length (tokens) for the given provider and model, or null if unavailable.
   */
  getModelContextLength: (provider: 'ollama' | 'lmstudio', model: string) => Promise<number | null>;

  /**
   * Send messages to the LLM and get response
   * @param options.model - Override model (e.g. from chat session); when omitted, uses settings
   * @param options.provider - Override provider (e.g. from chat session); when omitted, uses settings
   */
  sendMessages: (messages: Message[], options?: { maxTokens?: number, model?: string, provider?: 'ollama' | 'lmstudio' }) => Promise<LLMChatResponse>;

  /**
   * Send messages to the LLM and get streaming response
   * @param options.model - Override model (e.g. from chat session); when omitted, uses settings
   * @param options.provider - Override provider (e.g. from chat session); when omitted, uses settings
   */
  sendMessagesStream: (messages: Message[], options?: { model?: string, provider?: 'ollama' | 'lmstudio' }) => AsyncGenerator<LLMStreamChunk, void>;
}
