import { app, BrowserWindow, ipcMain, Menu, protocol, globalShortcut, Tray, nativeImage } from 'electron';
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
let minimizeToMiniPlayerEnabled = false; // kept for manual enter-mini-player IPC
let closeToTrayEnabled = false;
let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
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
    { label: trayLabels.quit, click: () => app.quit() }
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
      password: process.env.DB_PASSWORD || '3TRwKW!7KX^e!rQkUt0SNQ2@',
      database: process.env.DB_NAME || 's9206_database',
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 1,
      maxIdle: 1,
      idleTimeout: 60000,
      queueLimit: 0
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
  mainWindow.on('close', (event: any) => {
    if (closeToTrayEnabled && !isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
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
    const [rows] = await db.execute(`
      SELECT p.*, u.username as author_name, u.avatar_url as author_avatar
      FROM playlists p 
      LEFT JOIN user_profiles u ON p.discord_id = u.discord_id 
      WHERE p.discord_id = ? OR p.discord_id IS NULL OR p.discord_id = "" OR p.is_private = 0
    `, [discordId || '']);
    const playlists = await Promise.all((rows as any[]).map(async row => {
      const [saveRows] = await db!.execute('SELECT COUNT(*) as count FROM user_profiles WHERE saved_playlists LIKE ?', [`%"${row.id}"%`]);
      return {
        id: row.id,
        name: row.name,
        avatar: row.avatar,
        songs: JSON.parse(row.songs || '[]'),
        discordId: row.discord_id,
        authorName: row.author_name,
        authorAvatar: row.author_avatar,
        saveCount: (saveRows as any[])[0].count,
        isPrivate: row.is_private === 1
      };
    }));
    return playlists;
  } catch (error) {
    console.error(error);
    return [];
  }
});

ipcMain.handle('save-playlist', async (event, pl) => {
  if (!db) return false;
  try {
    const isPrivate = pl.isPrivate ? 1 : 0;
    await db.execute(
      'INSERT INTO playlists (id, name, avatar, songs, discord_id, is_private) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, avatar = ?, songs = ?, discord_id = ?, is_private = ?',
      [pl.id, pl.name, pl.avatar || '', JSON.stringify(pl.songs), pl.discordId || '', isPrivate, pl.name, pl.avatar || '', JSON.stringify(pl.songs), pl.discordId || '', isPrivate]
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
    // Run all queries in parallel for performance
    const [[rows], [playlistRows], [followerRows], [allSavedRows]] = await Promise.all([
      db.execute('SELECT * FROM user_profiles WHERE discord_id = ?', [discordId]),
      db.execute('SELECT id, name, avatar, songs, discord_id FROM playlists WHERE discord_id = ? AND (is_private = 0 OR is_private IS NULL)', [discordId]),
      db.execute('SELECT discord_id FROM user_profiles WHERE following LIKE ?', [`%"${discordId}"%`]),
      db.execute('SELECT saved_playlists FROM user_profiles WHERE saved_playlists IS NOT NULL AND saved_playlists != ?', ['[]'])
    ]);

    const username = (rows as any[]).length > 0 ? (rows as any[])[0].username : '';
    const avatarUrl = (rows as any[]).length > 0 ? (rows as any[])[0].avatar_url : '';
    const followers = (followerRows as any[]).map(r => r.discord_id);

    // Build saveCount map in memory (much faster than N queries)
    const saveCountMap: Record<string, number> = {};
    for (const row of (allSavedRows as any[])) {
      try {
        const saved: string[] = JSON.parse(row.saved_playlists || '[]');
        for (const pid of saved) saveCountMap[pid] = (saveCountMap[pid] || 0) + 1;
      } catch {}
    }

    const playlists = (playlistRows as any[]).map(r => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      songs: JSON.parse(r.songs || '[]'),
      discordId: r.discord_id,
      authorName: username,
      authorAvatar: avatarUrl,
      saveCount: saveCountMap[r.id] || 0,
      isPrivate: false
    }));

    if ((rows as any[]).length > 0) {
      const p = (rows as any[])[0];
      return {
        discordId: p.discord_id,
        username: p.username,
        avatarUrl: p.avatar_url,
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
    const [rows] = await db.execute('SELECT discord_id, stats FROM user_profiles');
    const users = (rows as any[]).map(r => {
      let time = 0;
      try {
        const statsObj = JSON.parse(r.stats || '{}');
        time = statsObj.totalListenSeconds || 0;
      } catch (e) {}
      return { id: r.discord_id, time };
    }).sort((a, b) => b.time - a.time);

    const totalUsers = users.length;
    if (totalUsers === 0) return 50;

    const userIndex = users.findIndex(u => u.id === discordId);
    if (userIndex === -1) return 50;

    // Percentile = (rank - 1) / totalUsers * 100
    // To make it fun: if you are rank 1 out of 1, you are 1%.
    let percentile = Math.floor((userIndex / totalUsers) * 100);
    if (percentile === 0 && totalUsers > 0) percentile = 1; // Top 1%
    
    // Normalize to standard badges
    if (percentile <= 1) return 1;
    if (percentile <= 2) return 2;
    if (percentile <= 5) return 5;
    if (percentile <= 10) return 10;
    if (percentile <= 20) return 20;
    if (percentile <= 50) return 50;
    return 100;
  } catch (error) {
    console.error('get-user-percentile error:', error);
    return 50;
  }
});

ipcMain.handle('update-profile', async (event, profileData) => {
  if (!db) return false;
  try {
    const { discordId, username, avatarUrl, likedSongs, stats, privacySettings, savedPlaylists, following, bannerUrl } = profileData;
    await db.execute(
      `INSERT INTO user_profiles (discord_id, username, avatar_url, liked_songs, stats, privacy_settings, saved_playlists, following, banner_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       username = VALUES(username), avatar_url = VALUES(avatar_url), liked_songs = VALUES(liked_songs), 
       stats = VALUES(stats), privacy_settings = VALUES(privacy_settings), saved_playlists = VALUES(saved_playlists), following = VALUES(following), banner_url = COALESCE(VALUES(banner_url), banner_url)`,
      [
        discordId, username, avatarUrl, 
        JSON.stringify(likedSongs || []), 
        JSON.stringify(stats || {}), 
        JSON.stringify(privacySettings || {}),
        JSON.stringify(savedPlaylists || []),
        JSON.stringify(following || []),
        bannerUrl || null
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
  } catch(e) {}
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
  } catch(e) {}
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
    const { discordId, username, avatarUrl, currentSong, partyId, status, queue } = data;

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
    // Delete users older than 30 seconds to clean up (5% chance per request to reduce load)
    if (Math.random() < 0.05) {
      await db.execute('DELETE FROM online_users WHERE last_seen < DATE_SUB(NOW(), INTERVAL 30 SECOND)');
    }

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
      details: cleanTitle,
      state: isInParty
        ? `🎧 with ${d.hostUsername || 'a friend'}`
        : (song.artist || 'Unknown Artist'),
      largeImageKey: song.thumbnail || 'logo',
      largeImageText: cleanTitle,
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

ipcMain.handle('fetch-url', async (event, url: string) => { try { const res = await fetch(url, { headers: { 'User-Agent': 'DonPollo/1.0' } }); return await res.json(); } catch (err: any) { throw err; } });
ipcMain.handle('fetch-text', async (event, url: string) => { try { const res = await fetch(url, { headers: { 'User-Agent': 'DonPollo/1.0' } }); return await res.text(); } catch (err: any) { throw err; } });
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
const cacheDir = path.join(app.getPath('userData'), 'AudioCache');
const metadataPath = path.join(cacheDir, 'metadata.json');


if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

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

function downloadToCache(songData: any, urlStr: string, sender: any, isTemp: boolean = false) {
  const songId = songData.id;
  const filePath = path.join(cacheDir, `${songId}.m4a`);
  const tempPath = path.join(cacheDir, `${songId}.tmp`);

  // If already fully cached, send completion event and ensure metadata is saved
  if (fs.existsSync(filePath)) {
    const metadata = getCachedMetadata();
    if (!metadata.find((s: any) => s.id === songId)) {
      metadata.push(songData);
      saveCachedMetadata(metadata);
    }
    if (sender) sender.send('download-cache-complete', songData);
    return;
  }

  // If currently downloading, just skip and let the active download finish
  if (fs.existsSync(tempPath)) return;

  const url = new URL(urlStr);
  const client = url.protocol === 'https:' ? https : http;

  client.get(urlStr, (response) => {
    // Only save if status is OK and content is audio/video
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
            const metadata = getCachedMetadata();
            if (!metadata.find((s: any) => s.id === songId)) {
              metadata.push(songData);
              saveCachedMetadata(metadata);
            }
            enforceCacheLimit();
            if (sender) sender.send('download-cache-complete', songData);
          } catch (e) { }
        });
      });

      fileStream.on('error', () => {
        fs.unlink(tempPath, () => { });
      });
    } else {
      // Consume response data to free up memory
      response.resume();
    }
  }).on('error', () => {
    fs.unlink(tempPath, () => { });
  });
}

ipcMain.handle('check-cache', async (event, songId) => {
  const filePath = path.join(cacheDir, `${songId}.m4a`);
  return fs.existsSync(filePath);
});

ipcMain.on('cache-audio', (event, songData, url, isSilent) => {
  downloadToCache(songData, url, isSilent ? null : event.sender);
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
  if (!db) return;
  try {
    await db.execute('DELETE FROM online_users WHERE discord_id = ?', [discordId]);
    await db.execute('DELETE FROM listen_parties WHERE host_discord_id = ?', [discordId]);
    await db.execute('DELETE FROM join_requests WHERE host_id = ? OR guest_id = ?', [discordId, discordId]);
  } catch (e) {
    console.error('Error cleaning up on closing', e);
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

  app.whenReady().then(async () => {
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

