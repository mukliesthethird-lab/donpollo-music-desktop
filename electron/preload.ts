import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  enterMiniPlayer: () => ipcRenderer.send('enter-mini-player'),
  exitMiniPlayer: () => ipcRenderer.send('exit-mini-player'),
  closeMiniPlayerWindow: () => ipcRenderer.send('close-mini-player-window'),
  onMiniPlayerClosed: (callback: () => void) => ipcRenderer.on('mini-player-closed', callback),
  isMiniPlayerWindow: () => new URLSearchParams(window.location.search).get('miniplayer') === 'true',
});
