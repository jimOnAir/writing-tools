import type { EIpcChannel, TIpcResponsePayload, TIpcEvent, IPreconfiguredPrompt, EIpcEvent, IChatMessage, IChatFollowUpQuestions, IChatStreamChunk, IChatStreamEnd, IPromptSelectedData } from '@writing-tools/shared';

import type { TIpcRenderListener } from './TIpcRenderListener';

declare global {
  interface Window {
    electronAPI: {
      invoke: <T extends EIpcChannel, K extends EIpcEvent>(channel: T, data: TIpcEvent<T, K>) => Promise<TIpcResponsePayload<K>>,
      onPromptSelected: (callback: (data: IPromptSelectedData) => void) => TIpcRenderListener,
      offPromptSelected: (listener: TIpcRenderListener) => void,
      onOllamaResponse: (callback: (data?: any) => void) => TIpcRenderListener,
      offOllamaResponse: (callback: TIpcRenderListener) => void,
      onPromptSelectorData: (callback: (data: { selectedText: string, preconfiguredPrompts: IPreconfiguredPrompt[] }) => void) => TIpcRenderListener,
      offPromptSelectorData: (callback: TIpcRenderListener) => void,
      onChatTitleUpdated: (callback: (data: { chatId: number, title: string }) => void) => TIpcRenderListener,
      offChatTitleUpdated: (listener: TIpcRenderListener) => void,
      onChatLoadMessagesData: (callback: (data: { chatId: number, messages: IChatMessage[] }) => void) => TIpcRenderListener,
      offChatLoadMessagesData: (listener: TIpcRenderListener) => void,
      onChatCreated: (callback: (data: { chatId: number }) => void) => TIpcRenderListener,
      offChatCreated: (listener: TIpcRenderListener) => void,
      onChatDeleted: (callback: (data: { chatId: number }) => void) => TIpcRenderListener,
      offChatDeleted: (listener: TIpcRenderListener) => void,
      onChatStreamChunk: (callback: (data: IChatStreamChunk) => void) => TIpcRenderListener,
      offChatStreamChunk: (listener: TIpcRenderListener) => void,
      onChatStreamEnd: (callback: (data: IChatStreamEnd) => void) => TIpcRenderListener,
      offChatStreamEnd: (listener: TIpcRenderListener) => void,
      onChatFollowUpQuestions: (callback: (data: IChatFollowUpQuestions) => void) => TIpcRenderListener,
      offChatFollowUpQuestions: (listener: TIpcRenderListener) => void,
    };
    // Exposed for before-quit handler to save tabs
    __multiChatService?: {
      saveTabs: () => Promise<void>,
    };
  }
}

export {};
