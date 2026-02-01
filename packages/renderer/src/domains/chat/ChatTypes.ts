import type { EStreamingErrorType, IChatMessage, IPreconfiguredPrompt } from '@writing-tools/shared';

// Domain-specific types for chat
// Most types are imported from @writing-tools/shared
// This file is reserved for any chat-domain-specific type extensions

export type ChatServiceCallbacks = {
  onErrorChange?: (error: string | null, errorType?: EStreamingErrorType) => void,
  onHandlingResponseChange?: (isHandling: boolean) => void,
  onHistoryIndexChange?: (index: number) => void,
  onLoadingChange?: (isLoading: boolean) => void,
  onMessagesChange?: (messages: IChatMessage[]) => void,
  onPromptsChange?: (prompts: IPreconfiguredPrompt[]) => void,
  onSelectedTextChange?: (text: string) => void,
  onStreamingChange?: (isStreaming: boolean) => void,
  onTitleChange?: (title: string) => void,
};
