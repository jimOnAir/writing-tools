import type { EIpcChannel, TIpcResponsePayload, TIpcEvent, IPreconfiguredPrompt, EIpcEvent, IChatMessage } from '@writing-tools/shared';

import type { TIpcRenderListener } from './TIpcRenderListener';

declare global {
  interface Window {
    electronAPI: {
      invoke: <T extends EIpcChannel, K extends EIpcEvent>(channel: T, data: TIpcEvent<T, K>) => Promise<TIpcResponsePayload<K>>,
      onChatWindowData: (callback: (data: { prompt: string }) => void) => TIpcRenderListener,
      offChatWindowData: (listener: TIpcRenderListener) => void,
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
    };
  }
}

export {};
