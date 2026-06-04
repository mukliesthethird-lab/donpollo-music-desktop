import { app, BrowserWindow, ipcMain, Menu, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
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

    db.on('error', (err: any) => {
      console.error('MySQL database error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
        console.log('Reconnecting to MySQL...');
        initDB();
      }
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
        status VARCHAR(20) DEFAULT 'online',
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    try {
      await db.execute("ALTER TABLE online_users ADD COLUMN status VARCHAR(20) DEFAULT 'online'");
    } catch (e: any) { }

    try {
      await db.execute("ALTER TABLE online_users ADD COLUMN queue LONGTEXT");
    } catch (e: any) { }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS queue_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        host_id VARCHAR(255),
        guest_id VARCHAR(255),
        guest_name VARCHAR(255),
        song_data LONGTEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS join_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        host_id VARCHAR(255),
        guest_id VARCHAR(255),
        guest_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS listen_parties (
        id VARCHAR(255) PRIMARY KEY,
        host_discord_id VARCHAR(255),
        song_data LONGTEXT,
        playback_time FLOAT,
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
    icon: path.join(__dirname, isDev ? '../public/icon.jpg' : '../dist/icon.jpg'),
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
    icon: path.join(__dirname, isDev ? '../public/icon.jpg' : '../dist/icon.jpg'),
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

// Discord OAuth - opens a popup, never navigates the main window
ipcMain.handle('discord-login', async (_event, authUrl: string) => {
  return new Promise<string | null>((resolve) => {
    const popup = new BrowserWindow({
      width: 500,
      height: 700,
      title: 'Login dengan Discord',
      autoHideMenuBar: true,
      parent: mainWindow || undefined,
      modal: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    popup.loadURL(authUrl);

    // Watch every URL change inside the popup
    const handleRedirect = (url: string) => {
      // Discord redirects to the Vercel callback page which then tries donpollo://
      // But we intercept the Vercel callback URL here before it can do anything
      if (url.startsWith('https://donpollo-music-desktop.vercel.app/callback')) {
        // The token is in the hash fragment - but webContents URL won't include hash
        // So we also watch for the donpollo:// deep link
      }
      if (url.startsWith('donpollo://callback')) {
        const hash = url.split('#')[1] || '';
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        resolve(token || null);
        popup.close();
      }
    };

    popup.webContents.on('will-navigate', (_e, url) => handleRedirect(url));
    popup.webContents.on('will-redirect', (_e, url) => handleRedirect(url));

    // Also intercept when the callback page tries to redirect to donpollo://
    // by intercepting the navigation before it goes external
    popup.webContents.on('did-navigate', (_e, url) => {
      if (url.startsWith('https://donpollo-music-desktop.vercel.app/callback')) {
        // Inject JS to read hash and send it back
        popup.webContents.executeJavaScript(`
          (() => {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            return params.get('access_token');
          })()
        `).then((token: string | null) => {
          if (token) {
            resolve(token);
            popup.close();
          }
        }).catch(() => {});
      }
    });

    popup.on('closed', () => {
      resolve(null);
    });
  });
});

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
    const { discordId, username, avatarUrl, currentSong, partyId, status, queue } = data;
    const songDataStr = currentSong ? JSON.stringify(currentSong) : '';
    const queueStr = queue ? JSON.stringify(queue) : '';
    await db.execute(
      `INSERT INTO online_users (discord_id, username, avatar_url, current_song, party_id, status, queue, last_seen) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE username = ?, avatar_url = ?, current_song = ?, party_id = ?, status = ?, queue = ?, last_seen = NOW()`,
      [discordId, username, avatarUrl, songDataStr, partyId || '', status || 'online', queueStr, username, avatarUrl, songDataStr, partyId || '', status || 'online', queueStr]
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
      partyId: row.party_id,
      status: row.status,
      queue: row.queue ? JSON.parse(row.queue) : []
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
});

// QUEUE REQUESTS IPC
ipcMain.handle('send-queue-request', async (event, hostId, guestId, guestName, songData) => {
  if (!db) return false;
  try {
    const songStr = typeof songData === 'object' ? JSON.stringify(songData) : songData;
    await db.execute(
      `INSERT INTO queue_requests (host_id, guest_id, guest_name, song_data, status) VALUES (?, ?, ?, ?, 'pending')`,
      [hostId, guestId, guestName, songStr]
    );
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});

ipcMain.handle('poll-queue-requests', async (event, hostId) => {
  if (!db) return [];
  try {
    // Auto-clean old queue requests
    await db.execute('DELETE FROM queue_requests WHERE created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)');
    
    const [rows] = await db.execute('SELECT * FROM queue_requests WHERE host_id = ? AND status = "pending"', [hostId]);
    return (rows as any[]).map(row => ({
      id: row.id,
      hostId: row.host_id,
      guestId: row.guest_id,
      guestName: row.guest_name,
      songData: row.song_data ? JSON.parse(row.song_data) : null,
      status: row.status
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
});

ipcMain.handle('respond-queue-request', async (event, requestId, status) => {
  if (!db) return false;
  try {
    if (status === 'consumed') {
      await db.execute('DELETE FROM queue_requests WHERE id = ?', [requestId]);
    } else {
      await db.execute('UPDATE queue_requests SET status = ? WHERE id = ?', [status, requestId]);
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});

// JOIN REQUESTS IPC
ipcMain.handle('send-join-request', async (event, hostId, guestId, guestName) => {
  if (!db) return false;
  try {
    await db.execute(
      `INSERT INTO join_requests (host_id, guest_id, guest_name, status) VALUES (?, ?, ?, 'pending')`,
      [hostId, guestId, guestName]
    );
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});

ipcMain.handle('poll-join-requests', async (event, userId) => {
  if (!db) return { incoming: [], outgoing: [] };
  try {
    // Clean up old requests (older than 2 minutes)
    await db.execute('DELETE FROM join_requests WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)');
    
    const [incomingRows] = await db.execute('SELECT * FROM join_requests WHERE host_id = ? AND status = "pending"', [userId]);
    const [outgoingRows] = await db.execute('SELECT * FROM join_requests WHERE guest_id = ?', [userId]);
    
    return {
      incoming: (incomingRows as any[]).map(row => ({
        id: row.id,
        hostId: row.host_id,
        guestId: row.guest_id,
        guestName: row.guest_name,
        status: row.status
      })),
      outgoing: (outgoingRows as any[]).map(row => ({
        id: row.id,
        hostId: row.host_id,
        guestId: row.guest_id,
        status: row.status
      }))
    };
  } catch (error) {
    console.error(error);
    return { incoming: [], outgoing: [] };
  }
});

ipcMain.handle('respond-join-request', async (event, requestId, status) => {
  if (!db) return false;
  try {
    await db.execute('UPDATE join_requests SET status = ? WHERE id = ?', [status, requestId]);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});

ipcMain.handle('host-party', async (event, partyId, hostDiscordId, song, currentTime, isPlaying) => {
  if (!db) return false;
  try {
    await db.execute(
      `INSERT INTO listen_parties (id, host_discord_id, song_data, playback_time, is_playing, updated_at) 
       VALUES (?, ?, ?, ?, ?, NOW()) 
       ON DUPLICATE KEY UPDATE song_data = ?, playback_time = ?, is_playing = ?, updated_at = NOW()`,
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
        currentTime: row.playback_time,
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
autoUpdater.allowPrerelease = true;

autoUpdater.on('update-available', (info) => {
  if (mainWindow) mainWindow.webContents.send('update-available', info);
});

autoUpdater.on('error', (err: any) => {
  const msg = err instanceof Error ? err.message : err?.toString() || 'Unknown error';
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

// ROMANIZATION IPC
let kuroshiroInstance: any = null;
ipcMain.handle('romanize-lyrics', async (event, text: string, lang: 'ko' | 'ja') => {
  try {
    if (lang === 'ko') {
      const aromanize = require('aromanize');
      return aromanize.romanize(text);
    } else if (lang === 'ja') {
      if (!kuroshiroInstance) {
        const Kuroshiro = require('kuroshiro');
        const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');
        kuroshiroInstance = new Kuroshiro();
        await kuroshiroInstance.init(new KuromojiAnalyzer());
      }
      return await kuroshiroInstance.convert(text, { to: 'romaji', mode: 'spaced', romajiSystem: 'hepburn' });
    }
  } catch (error) {
    console.error('Romanization error:', error);
  }
  return text;
});

// CACHING SYSTEM
const CACHE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB
const cacheDir = path.join(app.getPath('userData'), 'AudioCache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

function enforceCacheLimit() {
  fs.readdir(cacheDir, (err, files) => {
    if (err) return;
    let totalSize = 0;
    const fileStats = files.map(file => {
      const filePath = path.join(cacheDir, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
      return { filePath, size: stats.size, mtime: stats.mtime.getTime() };
    });

    if (totalSize > CACHE_LIMIT_BYTES) {
      fileStats.sort((a, b) => a.mtime - b.mtime); // Oldest first
      for (const file of fileStats) {
        try {
          fs.unlinkSync(file.filePath);
          totalSize -= file.size;
          if (totalSize <= CACHE_LIMIT_BYTES) break;
        } catch (e) { }
      }
    }
  });
}

function downloadToCache(songId: string, urlStr: string) {
  const filePath = path.join(cacheDir, `${songId}.m4a`);
  const tempPath = path.join(cacheDir, `${songId}.tmp`);
  
  // If already cached or currently downloading, skip
  if (fs.existsSync(filePath) || fs.existsSync(tempPath)) return;

  const url = new URL(urlStr);
  const client = url.protocol === 'https:' ? https : http;

  client.get(urlStr, (response) => {
    // Only save if status is OK and content is audio/video
    if (response.statusCode === 200) {
      const fileStream = fs.createWriteStream(tempPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close(() => {
          try {
            fs.renameSync(tempPath, filePath);
            enforceCacheLimit();
          } catch (e) {}
        });
      });
      
      fileStream.on('error', () => {
        fs.unlink(tempPath, () => {});
      });
    } else {
      // Consume response data to free up memory
      response.resume();
    }
  }).on('error', () => {
    fs.unlink(tempPath, () => {});
  });
}

ipcMain.handle('check-cache', async (event, songId) => {
  const filePath = path.join(cacheDir, `${songId}.m4a`);
  return fs.existsSync(filePath);
});

ipcMain.on('cache-audio', (event, songId, url) => {
  downloadToCache(songId, url);
});

ipcMain.handle('clear-cache', async () => {
  try {
    const files = fs.readdirSync(cacheDir);
    for (const file of files) {
      fs.unlinkSync(path.join(cacheDir, file));
    }
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('get-cache-size', async () => {
  try {
    const files = fs.readdirSync(cacheDir);
    let totalSize = 0;
    for (const file of files) {
      totalSize += fs.statSync(path.join(cacheDir, file)).size;
    }
    return totalSize;
  } catch (e) {
    return 0;
  }
});

// APP LIFECYCLE
app.whenReady().then(async () => {
  protocol.registerFileProtocol('donpollo-cache', (request, callback) => {
    const url = request.url.replace('donpollo-cache://', '');
    const songId = url.split('/')[0].split('?')[0];
    const filePath = path.join(cacheDir, `${songId}.m4a`);
    callback({ path: filePath });
  });

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