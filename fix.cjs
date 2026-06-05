const fs = require('fs');
let content = fs.readFileSync('e:/donpollo-music-desktop/electron/main.ts', 'utf8');

const startStr = "ipcMain.on('clear-activity', () => {";
const endStr = "ipcMain.handle('romanize-lyrics', async (event, text: string, lang: 'ko' | 'ja') => {";

const start = content.indexOf(startStr);
const end = content.indexOf(endStr);

if (start > -1 && end > -1) {
  const replacement = `ipcMain.on('clear-activity', () => {
  if (rpcReady) {
    rpc.clearActivity().catch(console.error);
  }
});

// AUTO UPDATER
autoUpdater.autoDownload = false; // We want to ask the user to download or we can download automatically and notify
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = true;
autoUpdater.channel = 'latest';

autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('error', (err: any) => {
  const msg = err instanceof Error ? err.message : err?.toString() || 'Unknown error';
  if (msg.includes('No published versions on GitHub')) return;
  if (mainWindow) mainWindow.webContents.send('update-error', msg);
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
});

autoUpdater.on('download-progress', (progressObj) => {
  if (mainWindow) mainWindow.webContents.send('download-progress', progressObj);
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('fetch-url', async (event, url: string) => { try { const res = await fetch(url); return await res.json(); } catch (err: any) { throw err; } }); 
// ROMANIZATION IPC
let kuroshiroInstance: any = null;
`;
  content = content.substring(0, start) + replacement + content.substring(end);
  fs.writeFileSync('e:/donpollo-music-desktop/electron/main.ts', content);
  console.log('Successfully fixed main.ts');
} else {
  console.log('Failed to find markers. Start:', start, 'End:', end);
}
