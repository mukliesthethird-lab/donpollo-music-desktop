import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;
let miniPlayerWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0B0B10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // If main window closes, also close mini player
    if (miniPlayerWindow) {
      miniPlayerWindow.close();
      miniPlayerWindow = null;
    }
  });
}

function createMiniPlayerWindow() {
  if (miniPlayerWindow) {
    miniPlayerWindow.focus();
    return;
  }

  miniPlayerWindow = new BrowserWindow({
    width: 320,
    height: 420,
    resizable: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    miniPlayerWindow.loadURL('http://localhost:5173?miniplayer=true');
  } else {
    miniPlayerWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      query: { miniplayer: 'true' },
    });
  }

  miniPlayerWindow.on('closed', () => {
    miniPlayerWindow = null;
    // Notify the renderer that mini player was closed
    if (mainWindow) {
      mainWindow.webContents.send('mini-player-closed');
    }
  });
}

// IPC Handlers
ipcMain.on('enter-mini-player', () => {
  if (mainWindow) mainWindow.minimize();
  createMiniPlayerWindow();
});

ipcMain.on('exit-mini-player', () => {
  if (miniPlayerWindow) {
    miniPlayerWindow.close();
    miniPlayerWindow = null;
  }
  if (mainWindow) mainWindow.restore();
});

ipcMain.on('close-mini-player-window', () => {
  if (miniPlayerWindow) {
    miniPlayerWindow.close();
    miniPlayerWindow = null;
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
