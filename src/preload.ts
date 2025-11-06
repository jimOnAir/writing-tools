import { IpcRendererEvent } from "electron";

const { contextBridge, ipcRenderer } = require('electron')
// Only expose the API if we're in an Electron environment
type TIpcRenderListener = (event: IpcRendererEvent, ...args: any[]) => void;


if (typeof window !== 'undefined') {

  let chatWindowDataListener: TIpcRenderListener;
  let ollamaResonseListener: TIpcRenderListener;
  contextBridge.exposeInMainWorld('electronAPI', {
    send: (ch: string, data: any) => ipcRenderer.send(ch, data),
    invoke: (ch: string, data: any) => ipcRenderer.invoke(ch, data),
    onChatWindowData: (cb: Function) => {
      chatWindowDataListener = (_, message: any) => cb(message)
      return ipcRenderer.on('chat-window-data', chatWindowDataListener)
    },
    offChatWindowData: (cb: Function) => {
      return ipcRenderer.off('chat-window-data', chatWindowDataListener)
    },
    onOllamaResponse:  (cb: Function) => {
      ollamaResonseListener = (event, message) => cb(message)
      return ipcRenderer.on('ollama-response',ollamaResonseListener )
    },
    offOllamaResponse:  () => {
      return ipcRenderer.off('ollama-response', ollamaResonseListener)
    },
  })
}
