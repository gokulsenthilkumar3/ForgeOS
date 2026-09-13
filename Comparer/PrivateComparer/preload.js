const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  // Add any bridge functions here for the app (e.g. saving files to local path)
});
