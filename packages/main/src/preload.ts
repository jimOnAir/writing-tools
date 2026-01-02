import { EIpcRendererEvent } from '@writing-tools/shared';
import type { IpcRendererEvent } from 'electron';
import { contextBridge, ipcRenderer } from 'electron';

type TIpcRenderListener = (event: IpcRendererEvent, ...args: any[]) => void;

if (typeof window !== 'undefined') {
  contextBridge.exposeInMainWorld('electronAPI', {
    invoke: async (ch: string, data: any) => ipcRenderer.invoke(ch, data),
    onChatWindowData: (cb: (message: any) => void) => {
      const chatWindowDataListener = (_: IpcRendererEvent, message: any) => {
        cb(message);
      };

      ipcRenderer.on(EIpcRendererEvent.CHAT_WINDOW_DATA, chatWindowDataListener);

      return chatWindowDataListener;
    },
    offChatWindowData: (listener: TIpcRenderListener) => {
      ipcRenderer.off(EIpcRendererEvent.CHAT_WINDOW_DATA, listener);
    },
    onOllamaResponse: (cb: (message: any) => void) => {
      const ollamaResponseListener = (_: IpcRendererEvent, message: any) => {
        cb(message);
      };

      ipcRenderer.on(EIpcRendererEvent.OLLAMA_RESPONSE, ollamaResponseListener);

      return ollamaResponseListener;
    },
    offOllamaResponse: (listener: TIpcRenderListener) => {
      return ipcRenderer.off(EIpcRendererEvent.OLLAMA_RESPONSE, listener);
    },
    onPromptSelectorData: (cb: (message: any) => void) => {
      const promptSelectorDataListener = (_: IpcRendererEvent, message: any) => {
        cb(message);
      };

      ipcRenderer.on(EIpcRendererEvent.PROMPT_SELECTOR_DATA, promptSelectorDataListener);

      return promptSelectorDataListener;
    },
    offPromptSelectorData: (listener: TIpcRenderListener) => {
      return ipcRenderer.off(EIpcRendererEvent.PROMPT_SELECTOR_DATA, listener);
    },
    onChatTitleUpdated: (cb: (message: any) => void) => {
      const chatTitleUpdatedListener = (_: IpcRendererEvent, message: any) => {
        cb(message);
      };

      ipcRenderer.on(EIpcRendererEvent.CHAT_TITLE_UPDATED, chatTitleUpdatedListener);

      return chatTitleUpdatedListener;
    },
    offChatTitleUpdated: (listener: TIpcRenderListener) => {
      return ipcRenderer.off(EIpcRendererEvent.CHAT_TITLE_UPDATED, listener);
    },
  });
}
