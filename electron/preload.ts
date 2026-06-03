import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  enterMiniPlayer: () => ipcRenderer.send('enter-mini-player'),
  exitMiniPlayer: () => ipcRenderer.send('exit-mini-player'),
  closeMiniPlayerWindow: () => ipcRenderer.send('close-mini-player-window'),
  onMiniPlayerClosed: (callback: () => void) => ipcRenderer.on('mini-player-closed', callback),
  isMiniPlayerWindow: () => new URLSearchParams(window.location.search).get('miniplayer') === 'true',
  getPlaylists: (discordId?: string) => ipcRenderer.invoke('get-playlists', discordId),
  savePlaylist: (playlist: any) => ipcRenderer.invoke('save-playlist', playlist),
  deletePlaylist: (id: string) => ipcRenderer.invoke('delete-playlist', id),
  onUpdateAvailable: (callback: (event: any, info: any) => void) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => ipcRenderer.on('update-downloaded', callback),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
});
