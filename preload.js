const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mabruenia', {
  windowControl(action) {
    if (['minimize', 'maximize', 'close'].includes(action)) {
      ipcRenderer.send('window-control', action);
    }
  }
});
