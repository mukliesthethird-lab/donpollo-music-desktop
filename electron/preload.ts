import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  discordLogin: (authUrl: string) => ipcRenderer.invoke('discord-login', authUrl),
  enterMiniPlayer: () => ipcRenderer.send('enter-mini-player'),
  exitMiniPlayer: () => ipcRenderer.send('exit-mini-player'),
  setMinimizeToMiniPlayer: (enabled: boolean) => ipcRenderer.send('set-minimize-to-miniplayer', enabled),
  onMiniPlayerMode: (callback: (event: any, mode: boolean) => void) => {
    ipcRenderer.on('mini-player-mode', callback);
    return () => ipcRenderer.off('mini-player-mode', callback);
  },
  getPlaylists: (discordId?: string) => ipcRenderer.invoke('get-playlists', discordId),
  savePlaylist: (playlist: any) => ipcRenderer.invoke('save-playlist', playlist),
  deletePlaylist: (id: string) => ipcRenderer.invoke('delete-playlist', id),
  onUpdateAvailable: (callback: (event: any, info: any) => void) => {
    ipcRenderer.on('update-available', callback);
    return () => ipcRenderer.off('update-available', callback);
  },
  onUpdateDownloaded: (callback: (event: any, info: any) => void) => {
    ipcRenderer.on('update-downloaded', callback);
    return () => ipcRenderer.off('update-downloaded', callback);
  },
  onDownloadProgress: (callback: (event: any, progressObj: any) => void) => {
    ipcRenderer.on('download-progress', callback);
    return () => ipcRenderer.off('download-progress', callback);
  },
  onUpdateError: (callback: (event: any, error: string) => void) => {
    ipcRenderer.on('update-error', callback);
    return () => ipcRenderer.off('update-error', callback);
  },
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  updatePresence: (data: any) => ipcRenderer.invoke('update-presence', data),
  getOnlineUsers: (currentUserId: string) => ipcRenderer.invoke('get-online-users', currentUserId),
  hostParty: (partyId: string, hostDiscordId: string, song: any, currentTime: number, isPlaying: boolean) => ipcRenderer.invoke('host-party', partyId, hostDiscordId, song, currentTime, isPlaying),
  getPartyState: (partyId: string) => ipcRenderer.invoke('get-party-state', partyId),
  deleteParty: (partyId: string) => ipcRenderer.invoke('delete-party', partyId),
  sendJoinRequest: (hostId: string, guestId: string, guestName: string) => ipcRenderer.invoke('send-join-request', hostId, guestId, guestName),
  pollJoinRequests: (userId: string) => ipcRenderer.invoke('poll-join-requests', userId),
  respondJoinRequest: (requestId: number, status: string) => ipcRenderer.invoke('respond-join-request', requestId, status),
  sendQueueRequest: (hostId: string, guestId: string, guestName: string, songData: any) => ipcRenderer.invoke('send-queue-request', hostId, guestId, guestName, songData),
  pollQueueRequests: (hostId: string) => ipcRenderer.invoke('poll-queue-requests', hostId),
  respondQueueRequest: (requestId: number, status: string) => ipcRenderer.invoke('respond-queue-request', requestId, status),
  romanizeLyrics: (text: string, lang: 'ko' | 'ja') => ipcRenderer.invoke('romanize-lyrics', text, lang),
  setActivity: (song: any, progressStr?: string) => ipcRenderer.send('set-activity', song, progressStr),
  clearActivity: () => ipcRenderer.send('clear-activity'),
  onDiscordOAuthToken: (callback: (token: string) => void) => {
    const wrapped = (_event: any, token: string) => callback(token);
    ipcRenderer.on('discord-oauth-token', wrapped);
    return () => ipcRenderer.off('discord-oauth-token', wrapped);
  },
  checkCache: (songId: string) => ipcRenderer.invoke('check-cache', songId),
  cacheAudio: (songData: any, url: string) => ipcRenderer.send('cache-audio', songData, url),
  getDownloadedSongs: () => ipcRenderer.invoke('get-downloaded-songs'),
  deleteDownloadedSong: (songId: string) => ipcRenderer.invoke('delete-downloaded-song', songId),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  getCacheSize: () => ipcRenderer.invoke('get-cache-size'),
  onDownloadCacheProgress: (callback: (event: any, data: any) => void) => {
    ipcRenderer.on('download-cache-progress', callback);
    return () => ipcRenderer.off('download-cache-progress', callback);
  },
  onDownloadCacheComplete: (callback: (event: any, song: any) => void) => {
    ipcRenderer.on('download-cache-complete', callback);
    return () => ipcRenderer.off('download-cache-complete', callback);
  },
  onTrayControl: (callback: (action: string) => void) => {
    const wrapped = (_event: any, action: string) => callback(action);
    ipcRenderer.on('tray-control', wrapped);
    return () => ipcRenderer.off('tray-control', wrapped);
  },
  setTrayLabels: (labels: any) => ipcRenderer.send('set-tray-labels', labels),
  setThumbarIcons: (icons: any) => ipcRenderer.send('set-thumbar-icons', icons),
  notifyClosing: (discordId: string) => ipcRenderer.send('notify-closing', discordId)
, fetchUrl: (url: string) => ipcRenderer.invoke('fetch-url', url) });
