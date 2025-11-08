import type { EIpcChannel, TIpcResponsePayload, TIpcEvent } from '@writing-tools/shared';
import type { EIpcEvent } from '@writing-tools/shared';

declare global {
  interface Window {
    electronAPI: {
      invoke: <T extends EIpcChannel, K extends EIpcEvent>(channel: T, data: TIpcEvent<T, K>) => Promise<TIpcResponsePayload<K>>,
      onChatWindowData: (callback: (data: { prompt: string }) => void) => void,
      offChatWindowData: (callback: (data: { prompt: string }) => void) => void,
      onOllamaResponse: (callback: (data?: any) => void) => void,
      offOllamaResponse: (callback: (data?: any) => void) => void,
    };
  }
}

export {};
