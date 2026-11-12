const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dial', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.send('settings:set', patch),
  quit: () => ipcRenderer.send('app:quit')
});
