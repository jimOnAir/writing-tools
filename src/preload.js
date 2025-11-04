const { contextBridge, ipcRenderer } = require('electron')

// Only expose the API if we're in an Electron environment
if (typeof window !== 'undefined') {
  contextBridge.exposeInMainWorld('electronAPI', {
    send: (ch, data) => ipcRenderer.send(ch, data),
    on: (ch, cb) => ipcRenderer.on(ch, cb),
    invoke: (ch, data) => ipcRenderer.invoke(ch, data)
  })
}
