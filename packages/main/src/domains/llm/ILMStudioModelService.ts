import type { Message } from 'ollama';

import type { LMStudioChatResponse, LMStudioStreamChunk } from './LMStudioClient';

/**
 * Interface for LM Studio model service operations
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface ILMStudioModelService {
  /**
   * Fetch available LM Studio models
   */
  fetchModels: () => Promise<{ models: string[] } | { error: string, models: string[] }>;

  /**
   * Send messages to LM Studio and get response
   */
  sendMessages: (messages: Message[], options?: { maxTokens?: number }) => Promise<LMStudioChatResponse>;

  /**
   * Send messages to LM Studio and get streaming response
   * @param options.model - Override model; when omitted, uses settings
   */
  sendMessagesStream: (messages: Message[], options?: { model?: string }) => AsyncGenerator<LMStudioStreamChunk, void>;
}
