const { contextBridge, ipcRenderer } = require('electron')
console.log(`Electron bridge`)
// Only expose the API if we're in an Electron environment


if (typeof window !== 'undefined') {
  let chatWindowDataListener;
  let ollamaResonseListener;
  contextBridge.exposeInMainWorld('electronAPI', {
    send: (ch, data) => ipcRenderer.send(ch, data),
    invoke: (ch, data) => ipcRenderer.invoke(ch, data),
    onChatWindowData: (cb) => {
      chatWindowDataListener = (event, message) => cb(message)
      return ipcRenderer.on('chat-window-data', chatWindowDataListener)
    },
    offChatWindowData: (cb) => {
      return ipcRenderer.off('chat-window-data', chatWindowDataListener)
    },
    onOllamaResponse:  (cb) => {
      ollamaResonseListener = (event, message) => cb(message)
      return ipcRenderer.on('ollama-response',ollamaResonseListener )
    },
    offOllamaResponse:  (cb) => {
      return ipcRenderer.off('ollama-response', ollamaResonseListener)
    },
  })
}
