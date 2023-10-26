const { contextBridge, ipcRenderer } = require('electron')

// expose a function to renderer process that fetches data as the 
// fetch request is not allowed on renderer due to CORS, 
// also it is more convinient to have user data in the main process.
contextBridge.exposeInMainWorld('electronAPI', {
    fetchdata: (...args) => ipcRenderer.invoke('fetchdata', ...args),
    sendUrl: (url) => ipcRenderer.send('sendUrl', url)
})