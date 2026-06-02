import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;
let miniPlayerWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0B0B10',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // DEBUG (hapus kalau sudah production)
  mainWindow.webContents.on('did-fail-load', (_, code, desc) => {
    console.log('Main window failed to load:', code, desc);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;

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
    miniPlayerWindow.loadURL(
      'http://localhost:5173?miniplayer=true'
    );
  } else {
    miniPlayerWindow.loadFile(
      path.join(__dirname, '../dist/index.html'),
      {
        query: { miniplayer: 'true' },
      }
    );
  }

  // 🔥 DEBUG IMPORTANT (lihat kenapa blank)
  miniPlayerWindow.webContents.openDevTools();

  miniPlayerWindow.webContents.on('did-fail-load', (_, code, desc) => {
    console.log('Mini player failed to load:', code, desc);
  });

  miniPlayerWindow.on('closed', () => {
    miniPlayerWindow = null;

    if (mainWindow) {
      mainWindow.webContents.send('mini-player-closed');
    }
  });
}

// IPC HANDLERS
ipcMain.on('enter-mini-player', () => {
  if (mainWindow) mainWindow.minimize();
  createMiniPlayerWindow();
});

ipcMain.on('exit-mini-player', () => {
  if (miniPlayerWindow) {
    miniPlayerWindow.close();
    miniPlayerWindow = null;
  }

  if (mainWindow) {
    mainWindow.restore();
  }
});

ipcMain.on('close-mini-player-window', () => {
  if (miniPlayerWindow) {
    miniPlayerWindow.close();
    miniPlayerWindow = null;
  }
});

// APP LIFECYCLE
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});