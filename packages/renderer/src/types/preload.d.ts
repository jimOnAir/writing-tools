import type { EIpcChannel, TIpcResponsePayload, TIpcEvent, IPreconfiguredPrompt, EIpcEvent } from '@writing-tools/shared';

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
    };
  }
}

export {};
