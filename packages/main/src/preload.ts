import type { IpcRendererEvent } from 'electron';
import { contextBridge, ipcRenderer } from 'electron';

type TIpcRenderListener = (event: IpcRendererEvent, ...args: any[]) => void;

if (typeof window !== 'undefined') {
  contextBridge.exposeInMainWorld('electronAPI', {
    invoke: async (ch: string, data: any) => ipcRenderer.invoke(ch, data),
    onChatWindowData: (cb: Function) => {
      const chatWindowDataListener = (_: IpcRendererEvent, message: any) => cb(message);

      ipcRenderer.on('chat-window-data', chatWindowDataListener);

      return chatWindowDataListener;
    },
    offChatWindowData: (lisener: TIpcRenderListener) => {
      ipcRenderer.off('chat-window-data', lisener);
    },
    onOllamaResponse: (cb: Function) => {
      const ollamaResponseListener = (_: IpcRendererEvent, message: any) => cb(message);

      ipcRenderer.on('ollama-response', ollamaResponseListener);

      return ollamaResponseListener;
    },
    offOllamaResponse: (listener: TIpcRenderListener) => {
      return ipcRenderer.off('ollama-response', listener);
    },
    onPromptSelectorData: (cb: Function) => {
      const promptSelectorDataListener = (_: IpcRendererEvent, message: any) => cb(message);

      ipcRenderer.on('prompt-selector-data', promptSelectorDataListener);

      return promptSelectorDataListener;
    },
    offPromptSelectorData: (listener: TIpcRenderListener) => {
      return ipcRenderer.off('prompt-selector-data', listener);
    },
  });
}
