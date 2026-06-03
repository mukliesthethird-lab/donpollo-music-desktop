import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { autoUpdater } from 'electron-updater';
import DiscordRPC from 'discord-rpc';

const isDev = !app.isPackaged;
dotenv.config({ path: path.join(__dirname, '../.env') });

let mainWindow: BrowserWindow | null = null;
let miniPlayerWindow: BrowserWindow | null = null;
let db: mysql.Connection | null = null;

// Register custom protocol for OAuth deep-linking
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('donpollo', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('donpollo');
}

function handleDeepLink(url: string) {
  // url = donpollo://callback#access_token=xxx&token_type=Bearer&...
  if (!mainWindow) return;
  const hash = url.split('#')[1] || '';
  const params = new URLSearchParams(hash);
  const token = params.get('access_token');
  if (token) {
    mainWindow.webContents.send('discord-oauth-token', token);
    mainWindow.focus();
  }
}

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
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS online_users (
        discord_id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255),
        avatar_url VARCHAR(255),
        current_song LONGTEXT,
        party_id VARCHAR(255),
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS listen_parties (
        id VARCHAR(255) PRIMARY KEY,
        host_discord_id VARCHAR(255),
        song_data LONGTEXT,
        current_time FLOAT,
        is_playing BOOLEAN,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

// PRESENCE & PARTY IPC HANDLERS
ipcMain.handle('update-presence', async (event, data) => {
  if (!db) return false;
  try {
    const { discordId, username, avatarUrl, currentSong, partyId } = data;
    const songDataStr = currentSong ? JSON.stringify(currentSong) : '';
    await db.execute(
      `INSERT INTO online_users (discord_id, username, avatar_url, current_song, party_id, last_seen) 
       VALUES (?, ?, ?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE username = ?, avatar_url = ?, current_song = ?, party_id = ?, last_seen = NOW()`,
      [discordId, username, avatarUrl, songDataStr, partyId || '', username, avatarUrl, songDataStr, partyId || '']
    );
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});

ipcMain.handle('get-online-users', async (event, currentUserId) => {
  if (!db) return [];
  try {
    // Delete users older than 30 seconds to clean up
    await db.execute('DELETE FROM online_users WHERE last_seen < DATE_SUB(NOW(), INTERVAL 30 SECOND)');
    
    const [rows] = await db.execute('SELECT * FROM online_users WHERE discord_id != ?', [currentUserId || '']);
    return (rows as any[]).map(row => ({
      discordId: row.discord_id,
      username: row.username,
      avatarUrl: row.avatar_url,
      currentSong: row.current_song ? JSON.parse(row.current_song) : null,
      partyId: row.party_id
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
});

ipcMain.handle('host-party', async (event, partyId, hostDiscordId, song, currentTime, isPlaying) => {
  if (!db) return false;
  try {
    await db.execute(
      `INSERT INTO listen_parties (id, host_discord_id, song_data, current_time, is_playing, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE song_data = ?, current_time = ?, is_playing = ?, updated_at = NOW()`,
      [partyId, hostDiscordId, JSON.stringify(song), currentTime, isPlaying ? 1 : 0, JSON.stringify(song), currentTime, isPlaying ? 1 : 0]
    );
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});

ipcMain.handle('get-party-state', async (event, partyId) => {
  if (!db) return null;
  try {
    const [rows] = await db.execute('SELECT * FROM listen_parties WHERE id = ?', [partyId]);
    if ((rows as any[]).length > 0) {
      const row = (rows as any[])[0];
      return {
        song: JSON.parse(row.song_data),
        currentTime: row.current_time,
        isPlaying: !!row.is_playing,
        updatedAt: row.updated_at
      };
    }
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
});

ipcMain.handle('delete-party', async (event, partyId) => {
  if (!db) return false;
  try {
    await db.execute('DELETE FROM listen_parties WHERE id = ?', [partyId]);
    return true;
  } catch (error) {
    return false;
  }
});

// DISCORD RPC
const clientId = process.env.VITE_DISCORD_CLIENT_ID || '1257064052203458712';
DiscordRPC.register(clientId);
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

let rpcReady = false;
let currentActivity: any = null;

rpc.on('ready', () => {
  rpcReady = true;
  if (currentActivity) {
    rpc.setActivity(currentActivity).catch(console.error);
  }
});

rpc.login({ clientId }).catch(console.error);

function cleanSongTitle(title: string): string {
  if (!title) return '';
  let cleaned = title.replace(/\\s*\\(.*?\\b(official|music video|mv|lyric|audio|live|performance|vizualizer|visualizer)\\b.*?\\)/ig, '');
  cleaned = cleaned.replace(/\\s*\\[.*?\\b(official|music video|mv|lyric|audio|live|performance|vizualizer|visualizer)\\b.*?\\]/ig, '');
  cleaned = cleaned.replace(/\\s*(official|music video|mv|lyric video|lyric|audio|live|performance|vizualizer|visualizer)\\s*/ig, '');
  cleaned = cleaned.replace(/【.*?】/g, '');
  return cleaned.trim();
}

ipcMain.on('set-activity', (event, song, progressStr) => {
  if (!song) {
    currentActivity = {
      details: 'Browsing DonPollo Music',
      state: 'Looking for a song',
      startTimestamp: new Date(),
      largeImageKey: 'logo',
      largeImageText: 'DonPollo Music',
      instance: false,
    };
  } else {
    const cleanTitle = cleanSongTitle(song.title);
    currentActivity = {
      details: `Listening to ${cleanTitle}`,
      state: `by ${song.artist || 'Unknown'}`,
      largeImageKey: 'logo',
      largeImageText: cleanTitle,
      instance: false,
    };
  }

  if (rpcReady) {
    rpc.setActivity(currentActivity).catch(console.error);
  }
});

ipcMain.on('clear-activity', () => {
  if (rpcReady) {
    rpc.clearActivity().catch(console.error);
  }
});

// AUTO UPDATER
autoUpdater.autoDownload = false; // We want to ask the user to download or we can download automatically and notify
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-downloaded', info);
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

// APP LIFECYCLE
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await initDB();
  createWindow();

  // Handle deep-link on macOS (open-url)
  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  // Check for updates after a short delay
  setTimeout(() => {
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle deep-link on Windows/Linux (second-instance)
app.on('second-instance', (_event, commandLine) => {
  // The URL will be the last element of commandLine
  const url = commandLine.find(arg => arg.startsWith('donpollo://'));
  if (url) handleDeepLink(url);
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});