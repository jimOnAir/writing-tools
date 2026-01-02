import type { IChatMessage } from '@writing-tools/shared';

// Domain-specific types for chat
// Most types are imported from @writing-tools/shared
// This file is reserved for any chat-domain-specific type extensions

export type ChatServiceCallbacks = {
  onMessagesChange?: (messages: IChatMessage[]) => void,
  onLoadingChange?: (isLoading: boolean) => void,
  onErrorChange?: (error: string | null) => void,
  onHistoryIndexChange?: (index: number) => void,
  onHandlingResponseChange?: (isHandling: boolean) => void,
};
