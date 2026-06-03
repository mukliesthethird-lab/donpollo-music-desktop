import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const isDev = !app.isPackaged;
dotenv.config({ path: path.join(__dirname, '../.env') });

let mainWindow: BrowserWindow | null = null;
let miniPlayerWindow: BrowserWindow | null = null;
let db: mysql.Connection | null = null;

async function initDB() {
  try {
    db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: Number(process.env.DB_PORT) || 3306,
    });
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS playlists (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        avatar LONGTEXT,
        songs LONGTEXT,
        discord_id VARCHAR(255)
      )
    `);
    console.log('MySQL connected and table initialized');
  } catch (error) {
    console.error('MySQL connection error:', error);
  }
}

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
    let useVercel = false;
    try {
      const envPath = path.join(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        if (envContent.includes('LOAD_VERCEL=true')) {
          useVercel = true;
        }
      }
    } catch (e) {
      console.error('Failed to read .env', e);
    }

    if (useVercel) {
      mainWindow.loadURL('https://donpollo-music-desktop.vercel.app/');
    } else {
      mainWindow.loadURL('http://localhost:5173/');
    }
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

ipcMain.handle('get-playlists', async (event, discordId) => {
  if (!db) return [];
  try {
    const [rows] = await db.execute('SELECT * FROM playlists WHERE discord_id = ? OR discord_id IS NULL OR discord_id = ""', [discordId || '']);
    return (rows as any[]).map(row => ({
      id: row.id,
      name: row.name,
      avatar: row.avatar,
      songs: JSON.parse(row.songs || '[]'),
      discordId: row.discord_id
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
});

ipcMain.handle('save-playlist', async (event, pl) => {
  if (!db) return false;
  try {
    await db.execute(
      'INSERT INTO playlists (id, name, avatar, songs, discord_id) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, avatar = ?, songs = ?, discord_id = ?',
      [pl.id, pl.name, pl.avatar || '', JSON.stringify(pl.songs), pl.discordId || '', pl.name, pl.avatar || '', JSON.stringify(pl.songs), pl.discordId || '']
    );
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});

ipcMain.handle('delete-playlist', async (event, id) => {
  if (!db) return false;
  try {
    await db.execute('DELETE FROM playlists WHERE id = ?', [id]);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});

// APP LIFECYCLE
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await initDB();
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