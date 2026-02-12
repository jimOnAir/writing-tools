import { EIpcRendererEvent } from '@writing-tools/shared';
import type { IpcRendererEvent } from 'electron';
import { contextBridge, ipcRenderer } from 'electron';

type TIpcRenderListener = (event: IpcRendererEvent, ...args: any[]) => void;

if (typeof window !== 'undefined') {
  contextBridge.exposeInMainWorld('electronAPI', {
    invoke: async (ch: string, data: any) => ipcRenderer.invoke(ch, data),
    onPromptSelected: (cb: (message: any) => void) => {
      const promptSelectedListener = (_: IpcRendererEvent, message: any) => {
        cb(message);
      };

      ipcRenderer.on(EIpcRendererEvent.PROMPT_SELECTED, promptSelectedListener);

      return promptSelectedListener;
    },
    offPromptSelected: (listener: TIpcRenderListener) => {
      ipcRenderer.off(EIpcRendererEvent.PROMPT_SELECTED, listener);
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
    onChatLoadMessagesData: (cb: (message: any) => void) => {
      const chatLoadMessagesDataListener = (_: IpcRendererEvent, message: any) => {
        cb(message);
      };

      ipcRenderer.on(EIpcRendererEvent.CHAT_LOAD_MESSAGES_DATA, chatLoadMessagesDataListener);

      return chatLoadMessagesDataListener;
    },
    offChatLoadMessagesData: (listener: TIpcRenderListener) => {
      return ipcRenderer.off(EIpcRendererEvent.CHAT_LOAD_MESSAGES_DATA, listener);
    },
    onChatCreated: (cb: (message: any) => void) => {
      const chatCreatedListener = (_: IpcRendererEvent, message: any) => {
        cb(message);
      };

      ipcRenderer.on(EIpcRendererEvent.CHAT_CREATED, chatCreatedListener);

      return chatCreatedListener;
    },
    offChatCreated: (listener: TIpcRenderListener) => {
      return ipcRenderer.off(EIpcRendererEvent.CHAT_CREATED, listener);
    },
    onChatDeleted: (cb: (message: any) => void) => {
      const chatDeletedListener = (_: IpcRendererEvent, message: any) => {
        cb(message);
      };

      ipcRenderer.on(EIpcRendererEvent.CHAT_DELETED, chatDeletedListener);

      return chatDeletedListener;
    },
    offChatDeleted: (listener: TIpcRenderListener) => {
      return ipcRenderer.off(EIpcRendererEvent.CHAT_DELETED, listener);
    },
    onChatStreamChunk: (cb: (message: any) => void) => {
      const chatStreamChunkListener = (_: IpcRendererEvent, message: any) => {
        cb(message);
      };

      ipcRenderer.on(EIpcRendererEvent.CHAT_STREAM_CHUNK, chatStreamChunkListener);

      return chatStreamChunkListener;
    },
    offChatStreamChunk: (listener: TIpcRenderListener) => {
      return ipcRenderer.off(EIpcRendererEvent.CHAT_STREAM_CHUNK, listener);
    },
    onChatStreamEnd: (cb: (message: any) => void) => {
      const chatStreamEndListener = (_: IpcRendererEvent, message: any) => {
        cb(message);
      };

      ipcRenderer.on(EIpcRendererEvent.CHAT_STREAM_END, chatStreamEndListener);

      return chatStreamEndListener;
    },
    offChatStreamEnd: (listener: TIpcRenderListener) => {
      return ipcRenderer.off(EIpcRendererEvent.CHAT_STREAM_END, listener);
    },
    onChatFollowUpQuestions: (cb: (message: any) => void) => {
      const chatFollowUpQuestionsListener = (_: IpcRendererEvent, message: any) => {
        cb(message);
      };

      ipcRenderer.on(EIpcRendererEvent.CHAT_FOLLOW_UP_QUESTIONS, chatFollowUpQuestionsListener);

      return chatFollowUpQuestionsListener;
    },
    offChatFollowUpQuestions: (listener: TIpcRenderListener) => {
      return ipcRenderer.off(EIpcRendererEvent.CHAT_FOLLOW_UP_QUESTIONS, listener);
    },
  });
}
