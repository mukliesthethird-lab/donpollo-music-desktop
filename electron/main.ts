import { app, BrowserWindow, ipcMain, Menu, protocol, globalShortcut, Tray, nativeImage, dialog, session } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import DiscordRPC from 'discord-rpc';
import { setupUpdater, checkUpdateCLI, startAutoUpdateCheck, setMainWindowGetter } from './updater.js';

const isDev = !app.isPackaged;
dotenv.config({ path: path.join(__dirname, '../.env') });

let mainWindow: BrowserWindow | null = null;
let db: mysql.Pool | null = null;
let dbReconnecting = false;
let minimizeToMiniPlayerEnabled = false; // kept for manual enter-mini-player IPC
let closeToTrayEnabled = false;
let isQuitting = false;
let currentActiveDiscordId: string | null = null;

let globalStatsCache = {
  percentileMap: new Map<string, number>(),
  saveCountMap: {} as Record<string, number>,
  lastUpdated: 0
};

async function ensureGlobalStatsCache() {
  if (Date.now() - globalStatsCache.lastUpdated < 30 * 1000) return;
  if (!db) return;

  try {
    const [[savedRows], [statsRows]] = await Promise.all([
      db.execute('SELECT saved_playlists FROM user_profiles WHERE saved_playlists IS NOT NULL AND saved_playlists != ?', ['[]']),
      db.execute('SELECT discord_id, stats FROM user_profiles WHERE stats IS NOT NULL')
    ]);

    const saveCountMap: Record<string, number> = {};
    for (const row of (savedRows as any[])) {
      try {
        const saved = JSON.parse(row.saved_playlists || '[]');
        for (const pid of saved) saveCountMap[pid] = (saveCountMap[pid] || 0) + 1;
      } catch { }
    }

    const users = (statsRows as any[]).map(r => {
      let time = 0;
      try { time = JSON.parse(r.stats || '{}').totalListenSeconds || 0; } catch (e) { }
      return { id: r.discord_id, time };
    }).sort((a, b) => b.time - a.time);

    const percentileMap = new Map<string, number>();
    const totalUsers = users.length;
    if (totalUsers > 0) {
      users.forEach((u, index) => {
        let percentile = Math.floor((index / totalUsers) * 100);
        if (percentile === 0 && totalUsers > 0) percentile = 1;

        let p = 100;
        if (percentile <= 1) p = 1;
        else if (percentile <= 2) p = 2;
        else if (percentile <= 5) p = 5;
        else if (percentile <= 10) p = 10;
        else if (percentile <= 20) p = 20;
        else if (percentile <= 50) p = 50;

        percentileMap.set(u.id, p);
      });
    }

    globalStatsCache.saveCountMap = saveCountMap;
    globalStatsCache.percentileMap = percentileMap;
    globalStatsCache.lastUpdated = Date.now();
  } catch (error) {
    console.error('Stats cache error', error);
  }
}

let isCleanupDone = false;
app.on('before-quit', async (e) => {
  if (isCleanupDone) return;
  isQuitting = true;
  if (db && currentActiveDiscordId) {
    e.preventDefault();
    isCleanupDone = true;
    const targetId = currentActiveDiscordId;
    try {
      await Promise.all([
        db.execute('DELETE FROM online_users WHERE discord_id = ?', [targetId]),
        db.execute('DELETE FROM listen_parties WHERE host_discord_id = ?', [targetId]),
        db.execute('DELETE FROM join_requests WHERE host_id = ? OR guest_id = ?', [targetId, targetId])
      ]);
    } catch (err) {
      console.error('Cleanup on before-quit error:', err);
    }
    if (db) {
      try {
        await db.end();
        db = null;
      } catch { }
    }
    app.quit();
  } else if (db) {
    try {
      await db.end();
      db = null;
    } catch { }
  }
});

let isMiniPlayerMode = false;
let previousBounds = { width: 1280, height: 800, x: 0, y: 0 };
let tray: Tray | null = null;
let trayLabels: any = {
  play: 'Play',
  pause: 'Pause',
  next: 'Next Track',
  prev: 'Previous Track',
  showApp: 'Show App',
  quit: 'Quit'
};

function updateTrayMenu(songTitle: string, isPlaying: boolean) {
  if (!tray) return;
  const contextMenu = Menu.buildFromTemplate([
    { label: songTitle || 'DonPollo Music', enabled: false },
    { type: 'separator' },
    { label: isPlaying ? trayLabels.pause : trayLabels.play, click: () => mainWindow?.webContents.send('tray-control', isPlaying ? 'pause' : 'play') },
    { label: trayLabels.next, click: () => mainWindow?.webContents.send('tray-control', 'next') },
    { label: trayLabels.prev, click: () => mainWindow?.webContents.send('tray-control', 'prev') },
    { type: 'separator' },
    { label: trayLabels.showApp, click: () => mainWindow?.show() },
    { label: trayLabels.quit, click: () => { isQuitting = true; mainWindow && !mainWindow.isDestroyed() ? mainWindow.close() : app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip(songTitle || 'DonPollo Music');
}

let thumbarIcons: any = {};
function updateThumbar(isPlaying: boolean, hasSong: boolean = true) {
  if (!mainWindow || !thumbarIcons.play) return;

  const flags: string[] = hasSong ? [] : ['disabled'];

  mainWindow.setThumbarButtons([
    {
      tooltip: trayLabels.prev,
      icon: thumbarIcons.prev,
      flags,
      click() { mainWindow?.webContents.send('tray-control', 'prev'); }
    },
    {
      tooltip: isPlaying ? trayLabels.pause : trayLabels.play,
      icon: isPlaying ? thumbarIcons.pause : thumbarIcons.play,
      flags,
      click() { mainWindow?.webContents.send('tray-control', isPlaying ? 'pause' : 'play'); }
    },
    {
      tooltip: trayLabels.next,
      icon: thumbarIcons.next,
      flags,
      click() { mainWindow?.webContents.send('tray-control', 'next'); }
    }
  ]);
}

// Register custom protocol for OAuth deep-linking
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('donpollo', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('donpollo');
}

function handleDeepLink(url: string) {
  if (!mainWindow) return;

  // donpollo://callback#access_token=... (OAuth)
  if (url.startsWith('donpollo://callback')) {
    const hash = url.split('#')[1] || '';
    const params = new URLSearchParams(hash);
    const token = params.get('access_token');
    if (token) {
      mainWindow.webContents.send('discord-oauth-token', token);
      mainWindow.focus();
    }
    return;
  }

  // donpollo://listen?u=[userId]&name=[username] (Listen Along invite)
  if (url.startsWith('donpollo://listen')) {
    try {
      const queryStr = url.split('?')[1] || '';
      const params = new URLSearchParams(queryStr);
      const userId = params.get('u');
      const username = params.get('name');
      if (userId) {
        mainWindow.webContents.send('listen-along-invite', { userId, username });
        mainWindow.focus();
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
      }
    } catch (e) {
      console.error('listen deep link error:', e);
    }
    return;
  }

  // Legacy: fallback for old-format donpollo:// links
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
    db = mysql.createPool({
      host: process.env.DB_HOST || 'ar-men-08.vexyhost.com',
      user: process.env.DB_USER || 'u9206_8NUrZJ5MBH',
      password: process.env.DB_PASSWORD || 'uW@blF0qtSbshWbz!^xnjz+^',
      database: process.env.DB_NAME || 's9206_database',
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 5,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000
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
      await db.execute("ALTER TABLE online_users ADD COLUMN status VARCHAR(20) DEFAULT 'online'").catch(() => { });
      await db.execute("ALTER TABLE online_users ADD COLUMN queue LONGTEXT").catch(() => { });
      await db.execute("ALTER TABLE online_users ADD COLUMN platform VARCHAR(20) DEFAULT 'desktop'").catch(() => { });
      await db.execute("ALTER TABLE online_users ADD COLUMN custom_status VARCHAR(255) DEFAULT NULL").catch(() => { });
      console.log('Database connected and initialized.');
    } catch (e: any) { }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        discord_id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255),
        avatar_url VARCHAR(255),
        liked_songs LONGTEXT,
        stats LONGTEXT,
        privacy_settings LONGTEXT,
        saved_playlists LONGTEXT,
        following LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    try {
      await db.execute("ALTER TABLE playlists ADD COLUMN is_private BOOLEAN DEFAULT FALSE");
    } catch (e: any) { }

    try {
      await db.execute("ALTER TABLE playlists ADD COLUMN collaborators LONGTEXT");
    } catch (e: any) { }

    try {
      await db.execute("ALTER TABLE user_profiles ADD COLUMN banner_url VARCHAR(1000)");
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
    await db.execute(`
      CREATE TABLE IF NOT EXISTS playlist_shares (
        code VARCHAR(12) PRIMARY KEY,
        playlist_id VARCHAR(255) NOT NULL,
        discord_id VARCHAR(255),
        playlist_data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS collab_invites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        playlist_id VARCHAR(255) NOT NULL,
        playlist_name VARCHAR(255) NOT NULL,
        host_id VARCHAR(255) NOT NULL,
        host_name VARCHAR(255) NOT NULL,
        guest_id VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS time_capsules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        message LONGTEXT,
        songs LONGTEXT,
        unlock_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ⚡ Optimasi Index B-Tree agar query presence, collab, & party secepat kilat (<1ms)
    try { await db.execute("CREATE INDEX idx_collab_guest_status ON collab_invites (guest_id, status)"); } catch { }
    try { await db.execute("CREATE INDEX idx_queue_host_status ON queue_requests (host_id, status)"); } catch { }
    try { await db.execute("CREATE INDEX idx_join_host_status ON join_requests (host_id, status)"); } catch { }
    try { await db.execute("CREATE INDEX idx_join_guest_status ON join_requests (guest_id, status)"); } catch { }
    try { await db.execute("CREATE INDEX idx_online_last_seen ON online_users (last_seen)"); } catch { }
    try { await db.execute("CREATE INDEX idx_playlists_discord_id ON playlists (discord_id)"); } catch { }
    try { await db.execute("CREATE INDEX idx_listen_parties_host ON listen_parties (host_discord_id)"); } catch { }
    try { await db.execute("CREATE INDEX idx_online_party_id ON online_users (party_id)"); } catch { }

    // 🧹 Auto-prune sampah request lama (> 10 menit atau consumed) agar tabel selalu ramping & enteng
    try {
      await db.execute("DELETE FROM join_requests WHERE status = 'consumed' OR created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)");
      await db.execute("DELETE FROM queue_requests WHERE status = 'consumed' OR created_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE)");
    } catch { }

    console.log('MySQL connected, indexed, and table initialized');
  } catch (error) {
    console.error('MySQL connection error:', error);
    db = null;
    if (!dbReconnecting && !isQuitting) {
      dbReconnecting = true;
      setTimeout(() => {
        dbReconnecting = false;
        if (!isQuitting) initDB();
      }, 10000);
    }
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
      backgroundThrottling: false,
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

  // Hidden debug mode: Ctrl+Shift+D to toggle DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'd') {
      mainWindow?.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // @ts-ignore: minimize event does pass an event object in Electron, despite what TS thinks
  mainWindow.on('minimize', (event: any) => {
    // minimizeToMiniPlayer only triggered via manual IPC, not on OS minimize
  });

  mainWindow.on('restore', () => {
    if (isMiniPlayerMode && mainWindow) {
      isMiniPlayerMode = false;
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setMinimumSize(800, 600);
      mainWindow.setBounds(previousBounds);
      mainWindow.webContents.send('mini-player-mode', false);
    }
  });

  mainWindow.on('maximize', () => {
    if (isMiniPlayerMode && mainWindow) {
      isMiniPlayerMode = false;
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setMinimumSize(800, 600);
      mainWindow.webContents.send('mini-player-mode', false);
    }
  });

  if (isDev) console.log('Creating window...');
  mainWindow.on('close', async (event: any) => {
    if (closeToTrayEnabled && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return;
    }

    if (currentActiveDiscordId && db && !isCleanupDone) {
      event.preventDefault();
      isQuitting = true;
      isCleanupDone = true;
      const targetId = currentActiveDiscordId;
      try {
        await Promise.all([
          db.execute('DELETE FROM online_users WHERE discord_id = ?', [targetId]),
          db.execute('DELETE FROM listen_parties WHERE host_discord_id = ?', [targetId]),
          db.execute('DELETE FROM join_requests WHERE host_id = ? OR guest_id = ?', [targetId, targetId])
        ]);
      } catch (e) {
        console.error('Error cleaning up on window close:', e);
      }
      mainWindow?.destroy();
      app.quit();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
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
        }).catch(() => { });
      }
    });

    popup.on('closed', () => {
      resolve(null);
    });
  });
});

ipcMain.on('enter-mini-player', () => {
  if (mainWindow && !isMiniPlayerMode) {
    previousBounds = mainWindow.getBounds();
    isMiniPlayerMode = true;
    mainWindow.setMinimumSize(300, 100);
    mainWindow.setBounds({ width: 320, height: 420 });
    mainWindow.setAlwaysOnTop(true);
    mainWindow.webContents.send('mini-player-mode', true);
  }
});

ipcMain.on('exit-mini-player', () => {
  if (mainWindow && isMiniPlayerMode) {
    isMiniPlayerMode = false;
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setMinimumSize(800, 600);
    mainWindow.setBounds(previousBounds);
    mainWindow.webContents.send('mini-player-mode', false);
  }
});

ipcMain.on('set-minimize-to-miniplayer', (_event, _enabled) => {
  // Deprecated: minimizeToMiniPlayer setting removed from UI
});

ipcMain.on('set-close-to-tray', (event, enabled) => {
  closeToTrayEnabled = enabled;
});

ipcMain.handle('get-playlists', async (event, discordId) => {
  if (!db) return [];
  try {
    await ensureGlobalStatsCache();

    let savedPlaylistIds: string[] = [];
    if (discordId) {
      try {
        const [uRows] = await db.execute('SELECT saved_playlists FROM user_profiles WHERE discord_id = ?', [discordId]);
        if ((uRows as any[]).length > 0) {
          savedPlaylistIds = safeJsonParse((uRows as any[])[0].saved_playlists, []);
        }
      } catch { }
    }

    let query: string;
    let params: any[] = [];

    if (discordId) {
      query = `
        SELECT p.*, u.username as author_name, u.avatar_url as author_avatar
        FROM playlists p 
        LEFT JOIN user_profiles u ON p.discord_id = u.discord_id 
        WHERE (p.discord_id = ? OR p.discord_id IS NULL OR p.discord_id = "" OR p.collaborators LIKE ?
      `;
      params = [discordId, `%${discordId}%`];

      if (savedPlaylistIds.length > 0) {
        const placeholders = savedPlaylistIds.map(() => '?').join(',');
        query += ` OR p.id IN (${placeholders}))`;
        params.push(...savedPlaylistIds);
      } else {
        query += `)`;
      }
    } else {
      query = `
        SELECT p.*, u.username as author_name, u.avatar_url as author_avatar
        FROM playlists p 
        LEFT JOIN user_profiles u ON p.discord_id = u.discord_id 
        WHERE p.discord_id IS NULL OR p.discord_id = "" OR p.is_private = 0
        LIMIT 50
      `;
      params = [];
    }

    const [rows] = await db.execute(query, params);

    const playlists = (rows as any[]).map(row => {
      const saveCount = (globalStatsCache.saveCountMap && globalStatsCache.saveCountMap[row.id]) || 0;
      return {
        id: row.id,
        name: row.name,
        avatar: row.avatar,
        songs: safeJsonParse(row.songs, []),
        discordId: row.discord_id,
        authorName: row.author_name,
        authorAvatar: row.author_avatar,
        saveCount,
        isPrivate: row.is_private === 1,
        collaborators: safeJsonParse(row.collaborators, [])
      };
    });
    return playlists;
  } catch (error) {
    console.error('get-playlists error:', error);
    return [];
  }
});

ipcMain.handle('save-playlist', async (event, pl) => {
  if (!db) return false;
  try {
    const isPrivate = pl.isPrivate ? 1 : 0;
    const collaboratorsStr = JSON.stringify(pl.collaborators || []);
    await db.execute(
      'INSERT INTO playlists (id, name, avatar, songs, discord_id, is_private, collaborators) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, avatar = ?, songs = ?, discord_id = ?, is_private = ?, collaborators = ?',
      [pl.id, pl.name, pl.avatar || '', JSON.stringify(pl.songs), pl.discordId || '', isPrivate, collaboratorsStr, pl.name, pl.avatar || '', JSON.stringify(pl.songs), pl.discordId || '', isPrivate, collaboratorsStr]
    );
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});

// ─── USER PROFILE IPC ──────────────────────────────────────────────────────
ipcMain.handle('get-profile', async (event, discordId) => {
  if (!db) return null;
  try {
    await ensureGlobalStatsCache();
    // Run all user-specific queries in parallel for performance
    const [[rows], [playlistRows], [followerRows]] = await Promise.all([
      db.execute('SELECT * FROM user_profiles WHERE discord_id = ?', [discordId]),
      db.execute('SELECT id, name, avatar, songs, discord_id FROM playlists WHERE discord_id = ? AND (is_private = 0 OR is_private IS NULL)', [discordId]),
      db.execute('SELECT discord_id FROM user_profiles WHERE following LIKE ?', [`%"${discordId}"%`])
    ]);

    const username = (rows as any[]).length > 0 ? (rows as any[])[0].username : '';
    let avatarUrl = (rows as any[]).length > 0 ? (rows as any[])[0].avatar_url : '';
    if (process.env.DISCORD_TOKEN && discordId) {
      const live = await fetchDiscordUserLive(discordId);
      if (live && live.avatarUrl) {
        avatarUrl = live.avatarUrl;
      }
    }
    const followers = (followerRows as any[]).map(r => r.discord_id);

    const playlists = (playlistRows as any[]).map(r => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      songs: JSON.parse(r.songs || '[]'),
      discordId: r.discord_id,
      authorName: username,
      authorAvatar: avatarUrl,
      saveCount: globalStatsCache.saveCountMap[r.id] || 0,
      isPrivate: false
    }));

    if ((rows as any[]).length > 0) {
      const p = (rows as any[])[0];
      return {
        discordId: p.discord_id,
        username: p.username,
        avatarUrl: avatarUrl || p.avatar_url,
        likedSongs: p.liked_songs ? JSON.parse(p.liked_songs) : [],
        stats: p.stats ? JSON.parse(p.stats) : { playHistory: [] },
        privacySettings: p.privacy_settings ? JSON.parse(p.privacy_settings) : { publicLikedSongs: true, publicStats: true },
        savedPlaylists: p.saved_playlists ? JSON.parse(p.saved_playlists) : [],
        following: p.following ? JSON.parse(p.following) : [],
        followers,
        bannerUrl: p.banner_url,
        playlists
      };
    } else {
      return { discordId, playlists, followers };
    }
  } catch (error) {
    console.error('get-profile error:', error);
    return null;
  }
});

ipcMain.handle('update-banner', async (event, discordId, bannerUrl) => {
  if (!db) return false;
  try {
    await db.execute('UPDATE user_profiles SET banner_url = ? WHERE discord_id = ?', [bannerUrl || null, discordId]);
    return true;
  } catch (error) {
    console.error('update-banner error:', error);
    return false;
  }
});

// Playlist Share Code
function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0,O,1,I)
  let code = 'DP-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

ipcMain.handle('create-share-code', async (event, playlist) => {
  if (!db) return null;
  try {
    // Cleanup expired codes first
    await db.execute('DELETE FROM playlist_shares WHERE expires_at < NOW()');
    // Check if this playlist already has a valid code
    const [existing] = await db.execute('SELECT code, expires_at FROM playlist_shares WHERE playlist_id = ? AND expires_at > NOW()', [playlist.id]);
    if ((existing as any[]).length > 0) {
      return { code: (existing as any[])[0].code, expiresAt: (existing as any[])[0].expires_at };
    }
    // Generate a unique code
    let code = generateShareCode();
    let attempts = 0;
    while (attempts < 5) {
      const [exists] = await db.execute('SELECT code FROM playlist_shares WHERE code = ?', [code]);
      if ((exists as any[]).length === 0) break;
      code = generateShareCode();
      attempts++;
    }
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.execute(
      'INSERT INTO playlist_shares (code, playlist_id, discord_id, playlist_data, expires_at) VALUES (?, ?, ?, ?, ?)',
      [code, playlist.id, playlist.discordId || null, JSON.stringify(playlist), expiresAt]
    );
    return { code, expiresAt };
  } catch (error) {
    console.error('create-share-code error:', error);
    return null;
  }
});

ipcMain.handle('resolve-share-code', async (event, code) => {
  if (!db) return null;
  try {
    const cleanCode = (code || '').trim().toUpperCase();
    const [rows] = await db.execute('SELECT playlist_data, expires_at FROM playlist_shares WHERE code = ? AND expires_at > NOW()', [cleanCode]);
    if ((rows as any[]).length === 0) return null;
    return JSON.parse((rows as any[])[0].playlist_data);
  } catch (error) {
    console.error('resolve-share-code error:', error);
    return null;
  }
});

ipcMain.handle('get-user-percentile', async (event, discordId) => {
  if (!db) return 50;
  try {
    await ensureGlobalStatsCache();
    return globalStatsCache.percentileMap.get(discordId) || 50;
  } catch (error) {
    console.error('get-user-percentile error:', error);
    return 50;
  }
});

ipcMain.handle('update-profile', async (event, profileData) => {
  if (!db) return false;
  try {
    const { discordId, username, avatarUrl, likedSongs, stats, privacySettings, savedPlaylists, following, bannerUrl } = profileData;

    // Safety: Retrieve existing record first to prevent accidental resets
    const [existingRows] = await db.execute('SELECT stats, liked_songs, saved_playlists, following, privacy_settings, banner_url FROM user_profiles WHERE discord_id = ?', [discordId]);
    const existing = (existingRows as any[])[0] || null;

    let mergedStats = stats;
    let mergedLiked = likedSongs;
    let mergedSavedPlaylists = savedPlaylists;
    let mergedFollowing = following;
    let mergedPrivacy = privacySettings;
    let mergedBanner = bannerUrl;

    if (existing) {
      // 1. Never overwrite stats with empty or smaller listen seconds!
      let existingStats: any = {};
      try { existingStats = JSON.parse(existing.stats || '{}'); } catch { }

      if (!stats || Object.keys(stats).length === 0) {
        mergedStats = existingStats;
      } else {
        const existingSeconds = typeof existingStats.totalListenSeconds === 'number' ? existingStats.totalListenSeconds : 0;
        const newSeconds = typeof stats.totalListenSeconds === 'number' ? stats.totalListenSeconds : 0;
        mergedStats = {
          ...existingStats,
          ...stats,
          totalListenSeconds: Math.max(existingSeconds, newSeconds),
          playHistory: (stats.playHistory && stats.playHistory.length > 0) ? stats.playHistory : (existingStats.playHistory || [])
        };
      }

      // 2. Never overwrite likedSongs, savedPlaylists, following if undefined
      if (likedSongs === undefined && existing.liked_songs) {
        try { mergedLiked = JSON.parse(existing.liked_songs); } catch { }
      }
      if (savedPlaylists === undefined && existing.saved_playlists) {
        try { mergedSavedPlaylists = JSON.parse(existing.saved_playlists); } catch { }
      }
      if (following === undefined && existing.following) {
        try { mergedFollowing = JSON.parse(existing.following); } catch { }
      }
      if (privacySettings === undefined && existing.privacy_settings) {
        try { mergedPrivacy = JSON.parse(existing.privacy_settings); } catch { }
      }
      if (!bannerUrl && existing.banner_url) {
        mergedBanner = existing.banner_url;
      }
    }

    await db.execute(
      `INSERT INTO user_profiles (discord_id, username, avatar_url, liked_songs, stats, privacy_settings, saved_playlists, following, banner_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       username = VALUES(username), 
       avatar_url = COALESCE(VALUES(avatar_url), avatar_url), 
       liked_songs = VALUES(liked_songs), 
       stats = VALUES(stats), 
       privacy_settings = VALUES(privacy_settings), 
       saved_playlists = VALUES(saved_playlists), 
       following = VALUES(following), 
       banner_url = COALESCE(VALUES(banner_url), banner_url)`,
      [
        discordId, username, avatarUrl,
        JSON.stringify(mergedLiked || []),
        JSON.stringify(mergedStats || {}),
        JSON.stringify(mergedPrivacy || { publicLikedSongs: true, publicStats: true }),
        JSON.stringify(mergedSavedPlaylists || []),
        JSON.stringify(mergedFollowing || []),
        mergedBanner || null
      ]
    );
    return true;
  } catch (error) {
    console.error('update-profile error:', error);
    return false;
  }
});

// Helper for toggle functions
ipcMain.handle('toggle-follow', async (event, discordId, targetId) => {
  if (!db) return false;
  try {
    const [rows] = await db.execute('SELECT following FROM user_profiles WHERE discord_id = ?', [discordId]);
    if ((rows as any[]).length > 0) {
      let following = JSON.parse((rows as any[])[0].following || '[]');
      if (following.includes(targetId)) following = following.filter((id: string) => id !== targetId);
      else following.push(targetId);
      await db.execute('UPDATE user_profiles SET following = ? WHERE discord_id = ?', [JSON.stringify(following), discordId]);
      return following;
    }
  } catch (e) { }
  return null;
});

ipcMain.handle('toggle-save-playlist', async (event, discordId, playlistId) => {
  if (!db) return false;
  try {
    const [rows] = await db.execute('SELECT saved_playlists FROM user_profiles WHERE discord_id = ?', [discordId]);
    if ((rows as any[]).length > 0) {
      let saved = JSON.parse((rows as any[])[0].saved_playlists || '[]');
      if (saved.includes(playlistId)) saved = saved.filter((id: string) => id !== playlistId);
      else saved.push(playlistId);
      await db.execute('UPDATE user_profiles SET saved_playlists = ? WHERE discord_id = ?', [JSON.stringify(saved), discordId]);
      return saved;
    }
  } catch (e) { }
  return null;
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
    const { discordId, username, avatarUrl, currentSong, partyId, status, queue, customStatus } = data;
    if (discordId) currentActiveDiscordId = discordId;

    if (currentSong) {
      updateTrayMenu(currentSong.title || 'Unknown', !!currentSong.isPlaying);
      updateThumbar(!!currentSong.isPlaying, true);
    } else {
      updateTrayMenu('Not Playing', false);
      updateThumbar(false, false);
    }

    const songDataStr = currentSong ? JSON.stringify(currentSong) : '';
    const queueStr = queue ? JSON.stringify(queue) : '';
    await db.execute(
      `INSERT INTO online_users (discord_id, username, avatar_url, current_song, party_id, status, custom_status, queue, platform, last_seen) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'desktop', NOW()) 
       ON DUPLICATE KEY UPDATE username = ?, avatar_url = ?, current_song = ?, party_id = ?, status = ?, custom_status = ?, queue = ?, platform = 'desktop', last_seen = NOW()`,
      [discordId, username, avatarUrl, songDataStr, partyId || '', status || 'online', customStatus || null, queueStr, username, avatarUrl, songDataStr, partyId || '', status || 'online', customStatus || null, queueStr]
    );
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});

function safeJsonParse<T>(str: any, fallback: T): T {
  if (!str || typeof str !== 'string') return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

const discordAvatarCache = new Map<string, { avatarUrl: string, username?: string, globalName?: string, timestamp: number }>();

async function fetchDiscordUserLive(discordId: string): Promise<{ avatarUrl: string, username?: string, globalName?: string } | null> {
  const token = process.env.DISCORD_TOKEN;
  if (!token || !discordId) return null;

  const cached = discordAvatarCache.get(discordId);
  if (cached && (Date.now() - cached.timestamp < 15 * 60 * 1000)) {
    return cached;
  }

  // Pre-set cache to avoid parallel thundering herd fetches from rapid polling
  discordAvatarCache.set(discordId, {
    avatarUrl: cached?.avatarUrl || '',
    username: cached?.username,
    globalName: cached?.globalName,
    timestamp: Date.now()
  });

  try {
    const res = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
      headers: { Authorization: `Bot ${token}` }
    });
    if (res.ok) {
      const data: any = await res.json();
      const avatarUrl = data.avatar
        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(data.id) >> 22n) % 6n)}.png`;

      const entry = {
        avatarUrl,
        username: data.username,
        globalName: data.global_name,
        timestamp: Date.now()
      };
      discordAvatarCache.set(discordId, entry);

      if (db && avatarUrl) {
        db.execute('UPDATE online_users SET avatar_url = ? WHERE discord_id = ? AND avatar_url != ?', [avatarUrl, discordId, avatarUrl]).catch(() => { });
        db.execute('UPDATE user_profiles SET avatar_url = ? WHERE discord_id = ? AND avatar_url != ?', [avatarUrl, discordId, avatarUrl]).catch(() => { });
      }
      return entry;
    }
  } catch (e) {
    console.error(`Failed to fetch Discord user live for ${discordId}:`, e);
  }
  return cached || null;
}

ipcMain.handle('get-live-discord-avatar', async (event, discordId) => {
  if (!discordId) return null;
  const live = await fetchDiscordUserLive(discordId);
  return live ? live.avatarUrl : null;
});

ipcMain.handle('get-live-discord-user', async (event, discordId) => {
  if (!discordId) return null;
  return await fetchDiscordUserLive(discordId);
});

ipcMain.handle('get-online-users', async (event, currentUserId) => {
  if (!db) return [];
  try {
    // Delete users older than 90 seconds to clean up (10% chance per request to reduce load)
    if (Math.random() < 0.1) {
      await db.execute('DELETE FROM online_users WHERE last_seen < DATE_SUB(NOW(), INTERVAL 90 SECOND)').catch(() => { });
    }

    const [rows] = await db.execute('SELECT *, (UNIX_TIMESTAMP(NOW(3)) - UNIX_TIMESTAMP(last_seen)) as server_age FROM online_users WHERE discord_id != ? AND last_seen >= DATE_SUB(NOW(), INTERVAL 60 SECOND)', [currentUserId || '']);
    return (rows as any[]).map(row => {
      let avatarUrl = row.avatar_url;
      const cached = discordAvatarCache.get(row.discord_id);
      if (cached && cached.avatarUrl) {
        avatarUrl = cached.avatarUrl;
      } else if (row.discord_id && !cached) {
        fetchDiscordUserLive(row.discord_id).catch(() => { });
      }

      return {
        discordId: row.discord_id,
        username: row.username,
        avatarUrl: avatarUrl,
        currentSong: safeJsonParse(row.current_song, null),
        partyId: row.party_id,
        status: row.status,
        customStatus: row.custom_status || '',
        queue: safeJsonParse(row.queue, []),
        platform: row.platform || 'desktop',
        serverAge: parseFloat(row.server_age) || 0
      };
    });
  } catch (error) {
    console.error('get-online-users error:', error);
    return [];
  }
});

// UNIFIED PRESENCE SYNC: 1 single IPC trip instead of 5 serial network round-trips!
ipcMain.handle('unified-presence-sync', async (event, payload: any) => {
  if (!db) {
    return {
      onlineUsers: [],
      joinRequests: { incoming: [], outgoing: [] },
      collabInvites: [],
      queueRequests: []
    };
  }

  const { presenceData, discordId, isGuest } = payload || {};

  try {
    // 1. Update own presence
    if (presenceData && discordId) {
      currentActiveDiscordId = discordId;
      const { username, avatarUrl, currentSong, partyId, status, queue, customStatus } = presenceData;

      if (currentSong) {
        updateTrayMenu(currentSong.title || 'Unknown', !!currentSong.isPlaying);
        updateThumbar(!!currentSong.isPlaying, true);
      } else {
        updateTrayMenu('Not Playing', false);
        updateThumbar(false, false);
      }

      const songDataStr = currentSong ? JSON.stringify(currentSong) : '';
      const queueStr = queue ? JSON.stringify(queue) : '';
      await db.execute(
        `INSERT INTO online_users (discord_id, username, avatar_url, current_song, party_id, status, custom_status, queue, platform, last_seen) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'desktop', NOW()) 
         ON DUPLICATE KEY UPDATE username = ?, avatar_url = ?, current_song = ?, party_id = ?, status = ?, custom_status = ?, queue = ?, platform = 'desktop', last_seen = NOW()`,
        [discordId, username, avatarUrl, songDataStr, partyId || '', status || 'online', customStatus || null, queueStr, username, avatarUrl, songDataStr, partyId || '', status || 'online', customStatus || null, queueStr]
      );
    }

    // 2. Run all queries in PARALLEL via Promise.all (Ultra-fast single round-trip)
    const [onlineUsersRows, incomingJoinRows, outgoingJoinRows, collabRows, queueRows] = await Promise.all([
      db.execute('SELECT *, (UNIX_TIMESTAMP(NOW(3)) - UNIX_TIMESTAMP(last_seen)) as server_age FROM online_users WHERE discord_id != ? AND last_seen >= DATE_SUB(NOW(), INTERVAL 60 SECOND)', [discordId || '']),
      db.execute('SELECT * FROM join_requests WHERE host_id = ? AND status = "pending"', [discordId || '']),
      db.execute('SELECT * FROM join_requests WHERE guest_id = ?', [discordId || '']),
      db.execute('SELECT * FROM collab_invites WHERE guest_id = ? AND status = "pending"', [discordId || '']),
      !isGuest ? db.execute('SELECT * FROM queue_requests WHERE host_id = ? AND status = "pending"', [discordId || '']) : Promise.resolve([[]])
    ]);

    // Periodically clean up stale offline users to keep DB clean (10% chance)
    if (Math.random() < 0.1) {
      db.execute('DELETE FROM online_users WHERE last_seen < DATE_SUB(NOW(), INTERVAL 90 SECOND)').catch(() => { });
    }

    const onlineUsers = ((onlineUsersRows as any[])[0] as any[]).map(row => {
      let avatarUrl = row.avatar_url;
      const cached = discordAvatarCache.get(row.discord_id);
      if (cached && cached.avatarUrl) {
        avatarUrl = cached.avatarUrl;
      }
      return {
        discordId: row.discord_id,
        username: row.username,
        avatarUrl: avatarUrl,
        currentSong: safeJsonParse(row.current_song, null),
        partyId: row.party_id,
        status: row.status,
        customStatus: row.custom_status || '',
        queue: safeJsonParse(row.queue, []),
        platform: row.platform || 'desktop',
        serverAge: parseFloat(row.server_age) || 0
      };
    });

    const joinRequests = {
      incoming: (((incomingJoinRows as any[])[0] as any[]) || []).map(row => ({
        id: row.id,
        hostId: row.host_id,
        guestId: row.guest_id,
        guestName: row.guest_name,
        status: row.status
      })),
      outgoing: (((outgoingJoinRows as any[])[0] as any[]) || []).map(row => ({
        id: row.id,
        hostId: row.host_id,
        guestId: row.guest_id,
        status: row.status
      }))
    };

    const collabInvites = (((collabRows as any[])[0] as any[]) || []).map(row => ({
      id: row.id,
      playlistId: row.playlist_id,
      playlistName: row.playlist_name,
      hostId: row.host_id,
      hostName: row.host_name,
      guestId: row.guest_id,
      status: row.status
    }));

    const queueRequests = (((queueRows as any[])[0] as any[]) || []).map(row => ({
      id: row.id,
      hostId: row.host_id,
      guestId: row.guest_id,
      guestName: row.guest_name,
      songData: safeJsonParse(row.song_data, null),
      status: row.status
    }));

    return {
      onlineUsers,
      joinRequests,
      collabInvites,
      queueRequests
    };
  } catch (error) {
    console.error('unified-presence-sync error:', error);
    return {
      onlineUsers: [],
      joinRequests: { incoming: [], outgoing: [] },
      collabInvites: [],
      queueRequests: [],
      syncError: true
    };
  }
});

// SET CUSTOM STATUS IPC
ipcMain.handle('set-custom-status', async (_event, { discordId, customStatus }: { discordId: string, customStatus: string }) => {
  try {
    if (!db || !discordId) return false;
    await db.execute('UPDATE online_users SET custom_status = ? WHERE discord_id = ?', [customStatus || null, discordId]);
    return true;
  } catch (error) {
    console.error('Error setting custom status:', error);
    return false;
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
    // Auto-clean old queue requests (5% chance per request to reduce load)
    if (Math.random() < 0.05) {
      await db.execute('DELETE FROM queue_requests WHERE created_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)');
    }

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

ipcMain.handle('kick-user', async (event, hostId, guestId) => {
  if (!db) return false;
  try {
    // Insert a kick event that the guest will poll and handle
    await db.execute(
      `INSERT INTO join_requests (host_id, guest_id, guest_name, status) VALUES (?, ?, ?, 'kicked')`,
      [hostId, guestId, '']
    );
    // Actively remove them from the party in online_users table immediately
    await db.execute(
      `UPDATE online_users SET party_id = NULL WHERE discord_id = ?`,
      [guestId]
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
    // Clean up old requests (older than 2 minutes, 5% chance per request to reduce load)
    if (Math.random() < 0.05) {
      await db.execute('DELETE FROM join_requests WHERE created_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)');
    }

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

ipcMain.handle('send-collab-invite', async (event, playlistId, playlistName, hostId, hostName, guestId) => {
  if (!db) return false;
  try {
    const [existing] = await db.execute('SELECT id FROM collab_invites WHERE playlist_id = ? AND guest_id = ? AND status = "pending"', [playlistId, guestId]);
    if ((existing as any[]).length > 0) return true;

    await db.execute(
      'INSERT INTO collab_invites (playlist_id, playlist_name, host_id, host_name, guest_id) VALUES (?, ?, ?, ?, ?)',
      [playlistId, playlistName, hostId, hostName, guestId]
    );
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
});

ipcMain.handle('poll-collab-invites', async (event, userId) => {
  if (!db) return [];
  try {
    const [rows] = await db.execute('SELECT * FROM collab_invites WHERE guest_id = ? AND status = "pending"', [userId]);
    return (rows as any[]).map(row => ({
      id: row.id,
      playlistId: row.playlist_id,
      playlistName: row.playlist_name,
      hostId: row.host_id,
      hostName: row.host_name,
      guestId: row.guest_id,
      status: row.status
    }));
  } catch (error) {
    console.error(error);
    return [];
  }
});

ipcMain.handle('respond-collab-invite', async (event, inviteId, status) => {
  if (!db) return false;
  try {
    const [inviteRows] = await db.execute('SELECT * FROM collab_invites WHERE id = ?', [inviteId]);
    if ((inviteRows as any[]).length > 0) {
      const invite = (inviteRows as any[])[0];
      if (status === 'accepted') {
        const [playlistRows] = await db.execute('SELECT * FROM playlists WHERE id = ?', [invite.playlist_id]);
        if ((playlistRows as any[]).length > 0) {
          const playlist = (playlistRows as any[])[0];
          let collaborators = [];
          try {
            collaborators = JSON.parse(playlist.collaborators || '[]');
          } catch (e) { }
          if (!collaborators.includes(invite.guest_id)) {
            collaborators.push(invite.guest_id);
            await db.execute('UPDATE playlists SET collaborators = ? WHERE id = ?', [JSON.stringify(collaborators), invite.playlist_id]);
          }
        }
      }
      await db.execute('DELETE FROM collab_invites WHERE id = ?', [inviteId]);
      return true;
    }
    return false;
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
  let cleaned = title.replace(/\s*\(.*?\b(official|music video|mv|lyric|audio|live|performance|vizualizer|visualizer)\b.*?\)/ig, '');
  cleaned = cleaned.replace(/\s*\[.*?\b(official|music video|mv|lyric|audio|live|performance|vizualizer|visualizer)\b.*?\]/ig, '');
  cleaned = cleaned.replace(/\s*(official|music video|mv|lyric video|lyric|audio|live|performance|vizualizer|visualizer)\s*/ig, '');
  cleaned = cleaned.replace(/【.*?】/g, '');
  return cleaned.trim();
}

ipcMain.on('set-activity', (event, song, extraData) => {
  // extraData: { discordId, username, partyId, isGuest, hostUsername, progress, duration }
  const d = extraData || {};
  const VERCEL_URL = 'https://donpollo-music-desktop.vercel.app';
  const now = Date.now();

  if (!song) {
    // Idle / browsing state
    currentActivity = {
      type: 2, // Listening
      details: 'Don Pollo Music',
      state: 'Browsing...',
      startTimestamp: new Date(),
      largeImageKey: 'logo',
      largeImageText: 'Don Pollo Music',
      instance: false,
    };
  } else {
    const cleanTitle = cleanSongTitle(song.title);
    const progressMs = Math.floor((d.progress || 0) * 1000);
    const durationMs = Math.floor((d.duration || 0) * 1000);

    // Progress bar: Discord derives it from start/end timestamps automatically
    const startTimestamp = durationMs > 0 ? new Date(now - progressMs) : undefined;
    const VERCEL_URL = 'https://donpollo-music-desktop.vercel.app';
    const listenUrl = d.discordId
      ? `${VERCEL_URL}/listen?u=${d.discordId}${d.username ? '&name=' + encodeURIComponent(d.username) : ''}`
      : null;

    const isInParty = d.isGuest || (d.partyId && d.partyId === d.discordId);

    currentActivity = {
      type: 2, // 2 = Listening to
      details: cleanTitle,
      state: isInParty
        ? `🎧 with ${d.hostUsername || 'a friend'}`
        : (song.artist || 'Unknown Artist'),
      largeImageKey: song.thumbnail || 'logo',
      ...(song.album && song.album.trim().toLowerCase() !== cleanTitle.toLowerCase() ? { largeImageText: song.album } : {}),
      smallImageKey: 'logo',
      smallImageText: 'Don Pollo Music',
      ...(startTimestamp ? { startTimestamp } : {}),
      instance: false,
      ...(listenUrl && !d.isGuest ? {
        buttons: [
          { label: 'Listen Along', url: listenUrl },
        ]
      } : {}),
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

ipcMain.handle('fetch-url', async (event, url: string) => {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' } });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (err: any) {
    throw err;
  }
});
ipcMain.handle('fetch-text', async (event, url: string) => { try { const res = await fetch(url, { headers: { 'User-Agent': 'DonPollo/1.0' } }); return await res.text(); } catch (err: any) { throw err; } });

// ── YouTube Music Search via Innertube API ──────────────────────────────────
// Uses YouTube Music's internal API to return proper audio results (album art, 
// no MV thumbnails, correct studio durations)
ipcMain.handle('search-ytmusic', async (event, query: string, limit: number = 10) => {
  try {
    const YTMUSIC_API = 'https://music.youtube.com/youtubei/v1/search?prettyPrint=false';
    const payload = {
      context: {
        client: {
          clientName: 'WEB_REMIX',
          clientVersion: '1.20240101.01.00',
          hl: 'id',
          gl: 'ID',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
        }
      },
      query,
      params: 'EgWKAQIIAWoKEAMQBBAJEAoQBQ%3D%3D' // filter: songs only
    };

    const res = await fetch(YTMUSIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        'Origin': 'https://music.youtube.com',
        'Referer': 'https://music.youtube.com/',
        'X-Youtube-Client-Name': '67',
        'X-Youtube-Client-Version': '1.20240101.01.00'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`YTMusic API error: ${res.status}`);
    const data: any = await res.json();

    // Parse the nested response structure
    const results: any[] = [];
    const tabs = data?.contents?.tabbedSearchResultsRenderer?.tabs;
    if (!tabs) return { results: [] };

    for (const tab of tabs) {
      const sectionList = tab?.tabRenderer?.content?.sectionListRenderer?.contents;
      if (!sectionList) continue;
      for (const section of sectionList) {
        const items = section?.musicShelfRenderer?.contents || section?.musicCardShelfRenderer ? [section.musicCardShelfRenderer] : [];
        for (const item of items) {
          const renderer = item?.musicResponsiveListItemRenderer || item?.musicTwoRowItemRenderer;
          if (!renderer) continue;

          // Extract video ID
          const videoId = renderer.playlistItemData?.videoId ||
            renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
            renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
          if (!videoId) continue;

          // Extract title
          const titleRuns = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
          const title = titleRuns.map((r: any) => r.text).join('');

          // Extract artist
          const subRuns = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
          const artist = subRuns.filter((r: any) => r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === 'MUSIC_PAGE_TYPE_ARTIST').map((r: any) => r.text).join(', ') || subRuns.map((r: any) => r.text).join('').replace(/·.*$/, '').trim();

          // Extract duration
          const durationText = renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text || '';
          let duration = 0;
          if (durationText) {
            const parts = durationText.split(':').map(Number);
            if (parts.length === 2) duration = parts[0] * 60 + parts[1];
            else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }

          // Extract thumbnail - YouTube Music thumbnails are album art, not MV screenshots
          const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
            renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
          const thumbnail = thumbnails.sort((a: any, b: any) => (b.width || 0) - (a.width || 0))[0]?.url || '';

          if (title && videoId) {
            results.push({ id: videoId, title, artist, duration, thumbnail, source: 'ytmusic' });
          }
          if (results.length >= limit) break;
        }
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }

    return { results };
  } catch (err: any) {
    console.error('YTMusic search error:', err.message);
    return { results: [] };
  }
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
        const KuroshiroMod = require('kuroshiro');
        const KuromojiMod = require('kuroshiro-analyzer-kuromoji');
        // Handle both ESM default export and direct CJS export
        const Kuroshiro = KuroshiroMod.default || KuroshiroMod;
        const KuromojiAnalyzer = KuromojiMod.default || KuromojiMod;
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
let cacheDir = path.join(app.getPath('userData'), 'AudioCache');

const configPath = path.join(app.getPath('userData'), 'config.json');
try {
  if (fs.existsSync(configPath)) {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (configData.cacheDir) {
      cacheDir = configData.cacheDir;
    }
  }
} catch (e) {
  console.error('Failed to load config.json', e);
}

let metadataPath = path.join(cacheDir, 'metadata.json');

function ensureCacheDir() {
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  metadataPath = path.join(cacheDir, 'metadata.json');
}
ensureCacheDir();

function getCachedMetadata() {
  try {
    if (fs.existsSync(metadataPath)) {
      const data = fs.readFileSync(metadataPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) { }
  return [];
}

function saveCachedMetadata(data: any[]) {
  try {
    fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2));
  } catch (e) { }
}

function enforceCacheLimit() {
  fs.readdir(cacheDir, (err, files) => {
    if (err) return;
    let totalSize = 0;
    const fileStats = files
      .filter(file => file !== 'metadata.json')
      .map(file => {
        const filePath = path.join(cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        return { filePath, size: stats.size, mtime: stats.mtime.getTime(), songId: file.replace('.m4a', '') };
      });

    if (totalSize > CACHE_LIMIT_BYTES) {
      fileStats.sort((a, b) => a.mtime - b.mtime); // Oldest first
      let metadata = getCachedMetadata();
      for (const file of fileStats) {
        try {
          fs.unlink(file.filePath, () => { });
          totalSize -= file.size;
          metadata = metadata.filter((s: any) => s.id !== file.songId);
          if (totalSize <= CACHE_LIMIT_BYTES) break;
        } catch (e) { }
      }
      saveCachedMetadata(metadata);
    }
  });
}

function downloadToCache(songData: any, urlStr: string, sender: any, isTemp: boolean = false, maxRedirects: number = 5) {
  const songId = songData.id;
  const filePath = path.join(cacheDir, `${songId}.m4a`);
  const tempPath = path.join(cacheDir, `${songId}.tmp`);

  // If already fully cached, send completion event and ensure metadata is saved
  if (fs.existsSync(filePath)) {
    if (!isTemp) {
      const metadata = getCachedMetadata();
      if (!metadata.find((s: any) => s.id === songId)) {
        metadata.push(songData);
        saveCachedMetadata(metadata);
      }
    }
    if (sender) sender.send('download-cache-complete', songData);
    return;
  }

  // If tempPath exists, check if it's an abandoned/dead download (> 20s old)
  if (fs.existsSync(tempPath)) {
    try {
      const stats = fs.statSync(tempPath);
      if (Date.now() - stats.mtimeMs > 20000) {
        fs.unlinkSync(tempPath);
      } else {
        // Active download still in progress
        return;
      }
    } catch {
      return;
    }
  }

  const performDownload = (targetUrlStr: string, redirectsLeft: number) => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrlStr);
    } catch {
      if (fs.existsSync(tempPath)) fs.unlink(tempPath, () => { });
      return;
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.get(targetUrlStr, (response) => {
      // Follow redirects (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.statusCode || 0) && response.headers.location && redirectsLeft > 0) {
        response.resume();
        const nextUrl = new URL(response.headers.location, targetUrlStr).toString();
        performDownload(nextUrl, redirectsLeft - 1);
        return;
      }

      // Only save if status is OK
      if (response.statusCode === 200) {
        const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
        let downloadedBytes = 0;

        const fileStream = fs.createWriteStream(tempPath);
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes > 0 && sender) {
            const progress = Math.round((downloadedBytes / totalBytes) * 100);
            sender.send('download-cache-progress', { songId, progress, songData });
          }
        });
        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(async () => {
            try {
              await fs.promises.rename(tempPath, filePath);
              if (!isTemp) {
                const metadata = getCachedMetadata();
                if (!metadata.find((s: any) => s.id === songId)) {
                  metadata.push(songData);
                  saveCachedMetadata(metadata);
                }
              }
              enforceCacheLimit();
              if (sender) sender.send('download-cache-complete', songData);
            } catch (e) {
              if (fs.existsSync(tempPath)) fs.unlink(tempPath, () => { });
            }
          });
        });

        fileStream.on('error', () => {
          if (fs.existsSync(tempPath)) fs.unlink(tempPath, () => { });
        });
      } else {
        // Non-200 status: consume response data to free memory and clean temp
        response.resume();
        if (fs.existsSync(tempPath)) fs.unlink(tempPath, () => { });
      }
    });

    req.on('error', () => {
      if (fs.existsSync(tempPath)) fs.unlink(tempPath, () => { });
    });

    // 35s timeout safety against hanging connections
    req.setTimeout(35000, () => {
      req.destroy();
      if (fs.existsSync(tempPath)) fs.unlink(tempPath, () => { });
    });
  };

  performDownload(urlStr, maxRedirects);
}

ipcMain.handle('check-cache', async (event, songId) => {
  const filePath = path.join(cacheDir, `${songId}.m4a`);
  return fs.existsSync(filePath);
});

ipcMain.on('cache-audio', (event, songData, url, isSilent, isTemp) => {
  downloadToCache(songData, url, isSilent ? null : event.sender, isTemp);
});

ipcMain.handle('get-downloaded-songs', async () => {
  return getCachedMetadata();
});

ipcMain.handle('delete-downloaded-song', async (event, songId) => {
  try {
    const filePath = path.join(cacheDir, `${songId}.m4a`);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
    const metadata = getCachedMetadata();
    const updated = metadata.filter((s: any) => s.id !== songId);
    saveCachedMetadata(updated);
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('clear-temp-cache', async (event, currentSongId) => {
  try {
    const metadata = getCachedMetadata();
    const keepIds = new Set(metadata.map((s: any) => s.id));
    const files = await fs.promises.readdir(cacheDir);
    for (const file of files) {
      if (file.endsWith('.m4a') || file.endsWith('.tmp')) {
        const songId = file.replace('.m4a', '').replace('.tmp', '');
        if (!keepIds.has(songId) && songId !== currentSongId) {
          await fs.promises.unlink(path.join(cacheDir, file)).catch(() => { });
        }
      }
    }
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('clear-cache', async () => {
  try {
    const files = await fs.promises.readdir(cacheDir);
    for (const file of files) {
      await fs.promises.unlink(path.join(cacheDir, file)).catch(() => { });
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
      try {
        totalSize += fs.statSync(path.join(cacheDir, file)).size;
      } catch (err) {
        // Ignore files that no longer exist
      }
    }
    return totalSize;
  } catch (e) {
    return 0;
  }
});

ipcMain.handle('get-cache-path', () => {
  return cacheDir;
});

ipcMain.handle('select-cache-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('set-cache-dir', async (event, newPath) => {
  if (newPath === cacheDir) return true;

  try {
    // Save to config
    const configData = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {};
    configData.cacheDir = newPath;
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

    const oldCacheDir = cacheDir;
    cacheDir = newPath;
    ensureCacheDir();

    // Move existing files
    if (fs.existsSync(oldCacheDir)) {
      const files = fs.readdirSync(oldCacheDir);
      for (const file of files) {
        const oldFile = path.join(oldCacheDir, file);
        const newFile = path.join(newPath, file);
        if (oldFile !== newFile) {
          try {
            fs.copyFileSync(oldFile, newFile);
            fs.unlinkSync(oldFile);
          } catch (e) {
            console.error('Failed to move cache file', file, e);
          }
        }
      }
    }
    return true;
  } catch (e) {
    console.error('Failed to set new cache dir', e);
    return false;
  }
});

// APP LIFECYCLE
ipcMain.on('set-tray-labels', (event, labels) => {
  trayLabels = labels;
});

ipcMain.on('set-thumbar-icons', (event, icons) => {
  thumbarIcons = {
    play: nativeImage.createFromDataURL(icons.play),
    pause: nativeImage.createFromDataURL(icons.pause),
    next: nativeImage.createFromDataURL(icons.next),
    prev: nativeImage.createFromDataURL(icons.prev),
  };
});

ipcMain.on('notify-closing', async (event, discordId) => {
  if (discordId) currentActiveDiscordId = discordId;
  if (!db) return;
  try {
    await db.execute('DELETE FROM online_users WHERE discord_id = ?', [discordId]);
    await db.execute('DELETE FROM listen_parties WHERE host_discord_id = ?', [discordId]);
    await db.execute('DELETE FROM join_requests WHERE host_id = ? OR guest_id = ?', [discordId, discordId]);
  } catch (e) {
    console.error('Error cleaning up on closing', e);
  }
});

// --- Analytics & Wrapped IPC ---
const getAnalyticsPath = () => path.join(app.getPath('userData'), 'analytics.json');
const getMoodPath = () => path.join(app.getPath('userData'), 'mood.json');

ipcMain.on('track-song', (event, songData) => {
  try {
    const analyticsPath = getAnalyticsPath();
    let data: any[] = [];
    if (fs.existsSync(analyticsPath)) {
      data = JSON.parse(fs.readFileSync(analyticsPath, 'utf8'));
    }
    data.push({ ...songData, timestamp: Date.now() });
    fs.writeFileSync(analyticsPath, JSON.stringify(data));
  } catch (err) {
    console.error('Error tracking song:', err);
  }
});

ipcMain.on('track-mood', (event, mood) => {
  try {
    const moodPath = getMoodPath();
    let data: any[] = [];
    if (fs.existsSync(moodPath)) {
      data = JSON.parse(fs.readFileSync(moodPath, 'utf8'));
    }
    data.push({ mood, timestamp: Date.now() });
    fs.writeFileSync(moodPath, JSON.stringify(data));
  } catch (err) {
    console.error('Error tracking mood:', err);
  }
});

ipcMain.handle('get-analytics', async () => {
  try {
    const analyticsPath = getAnalyticsPath();
    const moodPath = getMoodPath();
    let history: any[] = [];
    let moods: any[] = [];
    if (fs.existsSync(analyticsPath)) history = JSON.parse(fs.readFileSync(analyticsPath, 'utf8'));
    if (fs.existsSync(moodPath)) moods = JSON.parse(fs.readFileSync(moodPath, 'utf8'));

    const totalListenSeconds = history.reduce((acc, s) => acc + (s.duration || 0), 0);

    const songCount: Record<string, any> = {};
    const artistCount: Record<string, { count: number, cover: string }> = {};

    history.forEach(s => {
      if (!s.title || !s.artist) return; // Skip invalid entries
      if (!songCount[s.id]) songCount[s.id] = { song: s, count: 0 };
      songCount[s.id].count++;

      if (!artistCount[s.artist]) artistCount[s.artist] = { count: 0, cover: s.cover || s.thumbnail || '' };
      artistCount[s.artist].count++;
    });

    const topSongs = Object.values(songCount).sort((a: any, b: any) => b.count - a.count).slice(0, 5);
    const topArtists = Object.keys(artistCount).map(artist => ({ artist, count: artistCount[artist].count, cover: artistCount[artist].cover })).sort((a, b) => b.count - a.count);

    const moodCount: Record<string, number> = {};
    moods.forEach(m => {
      moodCount[m.mood] = (moodCount[m.mood] || 0) + 1;
    });
    let topMood = null;
    let max = 0;
    Object.keys(moodCount).forEach(k => {
      if (moodCount[k] > max) { max = moodCount[k]; topMood = k; }
    });

    return {
      totalListenSeconds,
      topSongs,
      topArtists,
      topMood,
      historyCount: history.length,
      uniqueSongsCount: Object.keys(songCount).length,
      uniqueArtistsCount: Object.keys(artistCount).length
    };
  } catch (err) {
    console.error('Error getting analytics:', err);
    return null;
  }
});

const gotTheLock = app.requestSingleInstanceLock();
console.log("gotTheLock:", gotTheLock);

if (!gotTheLock && !isDev) {
  app.quit();
} else {
  // Handle deep-link on Windows/Linux (second-instance)
  app.on('second-instance', (_event, commandLine) => {
    // The URL will be the last element of commandLine
    const url = commandLine.find((arg: string) => arg.startsWith('donpollo://'));
    if (url) handleDeepLink(url);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'donpollo-cache',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        bypassCSP: true
      }
    }
  ]);

  app.whenReady().then(async () => {
    session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
      if (permission === 'media') return true;
      return false;
    });
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      if (permission === 'media') return callback(true);
      callback(false);
    });

    setMainWindowGetter(() => mainWindow);
    setupUpdater();

    const isUpdateCLI = process.argv.includes('--update');

    if (isUpdateCLI) {
      await checkUpdateCLI();
      return;
    }

    const iconPath = path.join(__dirname, isDev ? '../public/icon.png' : '../dist/icon.png');
    const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    updateTrayMenu('Not Playing', false);
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    });
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
    startAutoUpdateCheck(isDev);

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
}

