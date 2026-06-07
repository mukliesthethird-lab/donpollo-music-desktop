import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Home, Library, Plus, Mic2, Settings, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX, ListMusic, UserCircle, ChevronRight, Search, AlertCircle, Headset, Loader2, Maximize2, X, ChevronLeft, ChevronUp, ChevronDown, Music, PanelRight, Trash2, Heart, LogIn, LogOut, Check, FolderPlus, Globe, Headphones, Download, DownloadCloud, Database, WifiOff, CheckCircle2, Paintbrush, Clock, Trophy, Zap, Radio, Timer, Repeat1 } from 'lucide-react';
import './index.css';
import './themes.css';
import { createTranslator } from './translations';
import type { Language } from './translations';

const API_BASE_URL = 'http://179.41.4.182:7097';
// ⚠️ Ganti dengan Client ID dari Discord Developer Portal Anda
const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '';
// Redirect URI: otomatis pilih localhost (dev) atau Vercel (installed app)
const DISCORD_REDIRECT_URI = window.location.hostname === 'localhost'
  ? 'http://localhost:5173/callback.html'
  : 'https://donpollo-music-desktop.vercel.app/callback';

type Page = 'home' | 'library' | 'playlist' | 'playlist-detail' | 'settings' | 'downloads' | 'artist';

interface Playlist {
  id: string;
  name: string;
  avatar?: string;
  songs: any[];
  createdAt: number;
  discordId?: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name: string | null;
}

const getHighResImage = (url: string | undefined) => {
  if (!url) return 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?auto=format&fit=crop&w=500&q=80';
  if (url.includes('i.ytimg.com')) {
    return url.replace('hqdefault.jpg', 'maxresdefault.jpg').replace('default.jpg', 'maxresdefault.jpg');
  }
  if (url.includes('mzstatic.com')) {
    // Apple Music/iTunes covers
    return url.replace(/\d+x\d+([a-zA-Z]*)\.jpg/i, '1000x1000$1.jpg');
  }
  if (url.includes('lh3.googleusercontent.com')) {
    // YouTube Music covers
    return url.replace(/=w\d+-h\d+/i, '=w1000-h1000').replace(/=s\d+/i, '=s1000');
  }
  return url;
};

const getCleanThumbnail = (url: string | undefined) => {
  if (!url) return '';
  if (url.includes('i.ytimg.com') && url.includes('hqdefault.jpg')) {
    return url.replace('hqdefault.jpg', 'mqdefault.jpg');
  }
  return url;
};

function App() {
  // ─── Page Navigation ────────────────────────────────────────
  const [activePage, setActivePage] = useState<Page>('home');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setActivePage(prev => (prev === 'home' || prev === 'artist' ? 'library' : prev));
    };
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    if (!navigator.onLine) handleOffline();
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);
  
  // ─── Artist Page State ──────────────────────────────────────
  const [activeArtist, setActiveArtist] = useState<string | null>(null);
  const [artistSongs, setArtistSongs] = useState<any[]>([]);
  const [artistFilter, setArtistFilter] = useState<'popular' | 'newest'>('popular');
  const [isArtistLoading, setIsArtistLoading] = useState(false);
  const [isRecentExpanded, setIsRecentExpanded] = useState(false);
  const [isRecsExpanded, setIsRecsExpanded] = useState(false);
  const [isIntExpanded, setIsIntExpanded] = useState(false);
  const [isIdExpanded, setIsIdExpanded] = useState(false);
  const [isJpExpanded, setIsJpExpanded] = useState(false);
  const [isKrExpanded, setIsKrExpanded] = useState(false);
  const [isLatinExpanded, setIsLatinExpanded] = useState(false);
  const [isLocalExpanded, setIsLocalExpanded] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  // ─── Search ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [toastData, setToastData] = useState<{ msg: string; icon: React.ReactNode; type: 'success' | 'error' } | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [updateInfo, setUpdateInfo] = useState<{ available: boolean, downloading: boolean, progress: number, ready: boolean, error: string, isChecking?: boolean, checkMsg?: string }>({ available: false, downloading: false, progress: 0, ready: false, error: '' });

  useEffect(() => {
    let unbind1: any, unbind2: any, unbind3: any, unbind4: any;
    if ((window as any).electronAPI && (window as any).electronAPI.onUpdateAvailable) {
       unbind1 = (window as any).electronAPI.onUpdateAvailable(() => {
          setUpdateInfo(prev => ({ ...prev, available: true }));
          setToastData({ msg: 'Versi baru Don Pollo Music tersedia! Cek Pengaturan.', type: 'success', icon: <DownloadCloud size={20} /> });
       });
       unbind2 = (window as any).electronAPI.onDownloadProgress((_e: any, progressObj: any) => {
          setUpdateInfo(prev => ({ ...prev, downloading: true, progress: progressObj.percent }));
       });
       unbind3 = (window as any).electronAPI.onUpdateDownloaded(() => {
          setUpdateInfo(prev => ({ ...prev, downloading: false, ready: true }));
          setToastData({ msg: 'Pembaruan siap diinstal!', type: 'success', icon: <CheckCircle2 size={20} /> });
       });
       unbind4 = (window as any).electronAPI.onUpdateError((_e: any, err: string) => {
          setUpdateInfo(prev => ({ ...prev, error: err, downloading: false }));
          setToastData({ msg: `Update Error: ${err}`, type: 'error', icon: <AlertCircle size={20} /> });
       });
    }
    return () => {
      if (unbind1) unbind1();
      if (unbind2) unbind2();
      if (unbind3) unbind3();
      if (unbind4) unbind4();
    };
  }, []);




  // ─── Debounced Search ───────────────────────────────────────
  const searchCacheRef = useRef<Record<string, any[]>>({});

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    if (searchCacheRef.current[searchQuery]) {
      setSuggestions(searchCacheRef.current[searchQuery]);
      return;
    }

    const controller = new AbortController();
    const handler = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}`, { signal: controller.signal });
        const data = await res.json();
        const results = data.results?.slice(0, 5) || [];
        setSuggestions(results);
        searchCacheRef.current[searchQuery] = results;
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsFetchingSuggestions(false);
        }
      }
    }, 500);
    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [searchQuery]);

  // ─── Updater State ──────────────────────────────────────────
  const [updateStatus, setUpdateStatus] = useState<'none' | 'available' | 'downloading' | 'downloaded' | 'error'>('none');
  const [updateProgress, setUpdateProgress] = useState<number>(0);

  // ─── Listen Along State ─────────────────────────────────────
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [activePartyId, setActivePartyId] = useState<string | null>(null);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [isGuest, setIsGuest] = useState(false);

  // ─── Real Data ──────────────────────────────────────────────
  const [playHistory, setPlayHistory] = useState<any[]>(() => {
    try { 
      const user = JSON.parse(localStorage.getItem('donpollo_user') || 'null');
      const suffix = user ? `_${user.id}` : '';
      return JSON.parse(localStorage.getItem(`donpollo_history${suffix}`) || '[]'); 
    } catch { return []; }
  });
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // ─── Discord Auth ────────────────────────────────────────────
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(() => {
    try { return JSON.parse(localStorage.getItem('donpollo_user') || 'null'); } catch { return null; }
  });



  // ─── Playlists ──────────────────────────────────────────────
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try { 
      const user = JSON.parse(localStorage.getItem('donpollo_user') || 'null');
      const suffix = user ? `_${user.id}` : '';
      return JSON.parse(localStorage.getItem(`donpollo_playlists${suffix}`) || '[]'); 
    } catch { return []; }
  });
  const [hitsInternational, setHitsInternational] = useState<any[]>([]);
  const [hitsIndonesia, setHitsIndonesia] = useState<any[]>([]);
  const [hitsJapan, setHitsJapan] = useState<any[]>([]);
  const [hitsKorean, setHitsKorean] = useState<any[]>([]);
  const [hitsLatin, setHitsLatin] = useState<any[]>([]);
  const [hitsLocal, setHitsLocal] = useState<any[]>([]);
  const [localCountry, setLocalCountry] = useState<{name: string, code: string, flag: string} | null>(null);
  const intScrollRef = useRef<HTMLDivElement>(null);
  const idScrollRef = useRef<HTMLDivElement>(null);
  const jpScrollRef = useRef<HTMLDivElement>(null);
  const krScrollRef = useRef<HTMLDivElement>(null);
  const latinScrollRef = useRef<HTMLDivElement>(null);
  const localScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHits = async () => {
      try {
        const fetchItunesRSS = async (countryCode: string) => {
          try {
            const targetUrl = `https://rss.applemarketingtools.com/api/v2/${countryCode}/music/most-played/25/songs.json`;
            const data = (window as any).electronAPI 
              ? await (window as any).electronAPI.fetchUrl(targetUrl)
              : await (await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`)).json();

            let feedData = data;
            if (data && data.contents) {
              try { feedData = JSON.parse(data.contents); } catch {}
            }

            if (feedData && feedData.feed && feedData.feed.results) {
              const songs = feedData.feed.results.map((t: any) => ({
                id: null,
                title: t.name,
                artist: t.artistName,
                thumbnail: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg') : '',
                duration: 0,
                originalQuery: `${t.artistName} ${t.name} official audio`
              }));
              return songs;
            }
          } catch (e) { console.error('RSS fetch failed', e); }
          return [];
        };

        const loadCategory = async (countryCode: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
          const songs = await fetchItunesRSS(countryCode);
          if (songs.length > 0) {
            setter(songs);
            
            // Background Mapping for YouTube ID (Sequentially to prevent congestion)
            (async () => {
              for (let idx = 0; idx < songs.length; idx++) {
                const song = songs[idx];
                const url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(song.originalQuery)}`;
                try {
                  const data = (window as any).electronAPI
                    ? await (window as any).electronAPI.fetchUrl(url)
                    : await (await fetch(url)).json();
                  
                  if (data && data.results) {
                    const validYt = data.results.find((item: any) => item.duration >= 60 && item.duration <= 480);
                    if (validYt) {
                      setter(prev => {
                        const next = [...prev];
                        if (next[idx] && next[idx].title === song.title) {
                          next[idx] = { ...next[idx], id: validYt.id, duration: validYt.duration };
                        }
                        return next;
                      });
                    }
                  }
                } catch (e) {
                  console.error('BG mapping error:', e);
                }
                // Yield to allow on-the-fly requests to take priority
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            })();
          }
        };

        let localCountryCode = 'us';
        try {
          const ipRes = await fetch('http://ip-api.com/json/');
          const ipData = await ipRes.json();
          if (ipData && ipData.country && ipData.countryCode) {
            localCountryCode = ipData.countryCode.toLowerCase();
            const getFlagEmoji = (code: string) => {
              const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
              return String.fromCodePoint(...codePoints);
            };
            setLocalCountry({
              name: ipData.country,
              code: ipData.countryCode,
              flag: getFlagEmoji(ipData.countryCode)
            });
          }
        } catch (err) {}

        loadCategory(localCountryCode, setHitsLocal);
        loadCategory('us', setHitsInternational); 
        loadCategory('id', setHitsIndonesia);
        loadCategory('jp', setHitsJapan);
        loadCategory('kr', setHitsKorean);
        loadCategory('mx', setHitsLatin);

      } catch (e) {
        console.error("fetchHits error", e);
      }
    };
    fetchHits();
  }, []);

  useEffect(() => {
    let unsubs: any[] = [];
    if ((window as any).electronAPI) {
      if ((window as any).electronAPI.onUpdateAvailable) {
        unsubs.push((window as any).electronAPI.onUpdateAvailable(() => {
          setUpdateStatus('available');
        }));
      }
      if ((window as any).electronAPI.onUpdateDownloaded) {
        unsubs.push((window as any).electronAPI.onUpdateDownloaded(() => {
          setUpdateStatus('downloaded');
        }));
      }
      if ((window as any).electronAPI.onDownloadProgress) {
        unsubs.push((window as any).electronAPI.onDownloadProgress((_event: any, progressObj: any) => {
          if (progressObj && progressObj.percent) {
            setUpdateProgress(Math.floor(progressObj.percent));
          }
        }));
      }
      if ((window as any).electronAPI.onUpdateError) {
        unsubs.push((window as any).electronAPI.onUpdateError((_event: any, errorMsg: string) => {
          console.error('Update error:', errorMsg);
          // Abaikan error palsu jika update sudah berhasil diunduh atau terjadi saat background check
          setUpdateStatus(prev => {
            if (prev === 'downloading') return 'error';
            return prev;
          });
        }));
      }
    }
    return () => unsubs.forEach(unsub => unsub && unsub());
  }, []);

  useEffect(() => {
    let unsub: any;
    const api = (window as any).electronAPI;
    if (api && api.onDiscordOAuthToken) {
      unsub = api.onDiscordOAuthToken(async (token: string) => {
        try {
          const res = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const user = await res.json();
          localStorage.setItem('donpollo_user', JSON.stringify(user));
          localStorage.setItem('donpollo_discord_token', token);
          setDiscordUser(user);
          showToast('Login Discord berhasil! 🎉', 'success');
        } catch (e) {
          console.error('Discord deep-link login error:', e);
        }
      });
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        if ((window as any).electronAPI) {
          const dbPlaylists = await (window as any).electronAPI.getPlaylists(discordUser?.id);
          if (dbPlaylists) {
            setPlaylists(dbPlaylists);
          }
        }
      } catch (e) {
        console.error("Gagal mengambil playlist dari database", e);
      }
    };
    if (discordUser) fetchPlaylists();
  }, [discordUser]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistAvatar, setNewPlaylistAvatar] = useState('');
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<any | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);
  const [isEditingPlaylistName, setIsEditingPlaylistName] = useState(false);
  const [editPlaylistNameValue, setEditPlaylistNameValue] = useState('');
  const [showImportPlaylist, setShowImportPlaylist] = useState(false);
  const [importPlaylistUrl, setImportPlaylistUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [showAvatarPrompt, setShowAvatarPrompt] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [playlistSearchResults, setPlaylistSearchResults] = useState<any[]>([]);
  const [isPlaylistSearching, setIsPlaylistSearching] = useState(false);
  const [likedSongs, setLikedSongs] = useState<any[]>(() => {
    try { 
      const user = JSON.parse(localStorage.getItem('donpollo_user') || 'null');
      const suffix = user ? `_${user.id}` : '';
      return JSON.parse(localStorage.getItem(`donpollo_liked${suffix}`) || '[]'); 
    } catch { return []; }
  });

  // ─── Language ─────────────────────────────────────────────────
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('donpollo_language') as Language) || 'id';
  });
  const t = createTranslator(language);

  useEffect(() => {
    localStorage.setItem('donpollo_language', language);
  }, [language]);

  // ─── Settings ────────────────────────────────────────────────
  const [settings, setSettings] = useState<any>(() => {
    try { 
      const saved = JSON.parse(localStorage.getItem('donpollo_settings') || '{}');
      return { theme: 'default', ...saved };
    } catch { return { theme: 'default' }; }
  });

  useEffect(() => {
    if ((window as any).electronAPI) {
      if ((window as any).electronAPI.setCloseToTray) {
        (window as any).electronAPI.setCloseToTray(!!settings.closeToTray);
      }
    }
  }, []);

  // ─── Player State ────────────────────────────────────────────
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(settings.volume ?? 1);
  const [isMuted, setIsMuted] = useState(false);
  const [loopMode, setLoopMode] = useState<'off' | 'all' | 'one'>('off');
  const [showLyrics, setShowLyrics] = useState(false);
  const [isWidgetMode, setIsWidgetMode] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const [userStatus, setUserStatus] = useState<'online' | 'idle' | 'dnd'>(localStorage.getItem('donpollo_status') as any || 'online');
  const [joinRequests, setJoinRequests] = useState<{incoming: any[], outgoing: any[]}>({ incoming: [], outgoing: [] });
  const [showProfileStats, setShowProfileStats] = useState(false);
  const [totalListenSeconds, setTotalListenSeconds] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('donpollo_listen_seconds') || '0', 10); } catch { return 0; }
  });

  const [downloadedSongs, setDownloadedSongs] = useState<any[]>([]);
  // const [activeDownloads, setActiveDownloads] = useState<Record<string, { progress: number, songData: any }>>({});

  useEffect(() => {
    if ((window as any).electronAPI?.getDownloadedSongs) {
      (window as any).electronAPI.getDownloadedSongs().then(setDownloadedSongs);
    }
  }, [cacheSize, activePage]);

  useEffect(() => {
    const handleProgress = (_event: any, _data: { songId: string, progress: number, songData: any }) => {
      // setActiveDownloads(prev => ({ ...prev, [data.songId]: { progress: data.progress, songData: data.songData } }));
    };
    
    const handleComplete = (_event: any, songData: any) => {
      /* setActiveDownloads(prev => {
        const next = { ...prev };
        delete next[songData.id];
        return next;
      }); */
      if ((window as any).electronAPI?.getDownloadedSongs) {
        (window as any).electronAPI.getDownloadedSongs().then(setDownloadedSongs);
      }
      showToast(`${t('toastDownloadComplete')}: ${songData.title}`, 'success');
    };

    let unsub1: any;
    let unsub2: any;

    if ((window as any).electronAPI?.onDownloadCacheProgress) {
      unsub1 = (window as any).electronAPI.onDownloadCacheProgress(handleProgress);
    }
    if ((window as any).electronAPI?.onDownloadCacheComplete) {
      unsub2 = (window as any).electronAPI.onDownloadCacheComplete(handleComplete);
    }

    return () => {
      if (unsub1) unsub1();
      if (unsub2) unsub2();
    };
  }, []);

  // ─── System Tray & Lifecycle ──────────────────────────────────
  useEffect(() => {
    let unsub: any;
    if ((window as any).electronAPI?.onTrayControl) {
      unsub = (window as any).electronAPI.onTrayControl((action: string) => {
        if (action === 'play' || action === 'pause') {
          togglePlayRef.current();
        } else if (action === 'next') {
          handleNextRef.current();
        } else if (action === 'prev') {
          handlePrevRef.current();
        }
      });
    }

    const handleBeforeUnload = () => {
      if (discordUser && (window as any).electronAPI?.notifyClosing) {
        (window as any).electronAPI.notifyClosing(discordUser.id);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (unsub) unsub();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [discordUser]);

  useEffect(() => {
    // Generate Thumbar Icons via Canvas
    const createIcon = (type: 'play' | 'pause' | 'next' | 'prev') => {
      const canvas = document.createElement('canvas');
      canvas.width = 32; canvas.height = 32;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      ctx.fillStyle = 'white';
      
      if (type === 'play') {
        ctx.beginPath(); ctx.moveTo(8, 6); ctx.lineTo(26, 16); ctx.lineTo(8, 26); ctx.fill();
      } else if (type === 'pause') {
        ctx.fillRect(8, 6, 6, 20); ctx.fillRect(18, 6, 6, 20);
      } else if (type === 'next') {
        ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(20, 16); ctx.lineTo(6, 26); ctx.fill();
        ctx.fillRect(20, 6, 4, 20);
      } else if (type === 'prev') {
        ctx.beginPath(); ctx.moveTo(26, 6); ctx.lineTo(12, 16); ctx.lineTo(26, 26); ctx.fill();
        ctx.fillRect(8, 6, 4, 20);
      }
      return canvas.toDataURL('image/png');
    };

    if ((window as any).electronAPI?.setThumbarIcons) {
      (window as any).electronAPI.setThumbarIcons({
        play: createIcon('play'),
        pause: createIcon('pause'),
        next: createIcon('next'),
        prev: createIcon('prev')
      });
    }
  }, []);

  useEffect(() => {
    if ((window as any).electronAPI?.setTrayLabels) {
      (window as any).electronAPI.setTrayLabels({
        play: t('trayPlay' as any),
        pause: t('trayPause' as any),
        next: t('trayNext' as any),
        prev: t('trayPrev' as any),
        showApp: t('trayShow' as any),
        quit: t('trayQuit' as any)
      });
    }
  }, [language]);


  // ─── Queue ───────────────────────────────────────────────────
  const [queue, setQueue] = useState<any[]>([]);
  const [originalQueue, setOriginalQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isShuffled, setIsShuffled] = useState(false);

  // ─── Pre-fetch (Pre-cache) Next Song ───
  useEffect(() => {
    if (queue.length > 0 && currentIndex >= 0 && currentIndex < queue.length - 1) {
      const nextSong = queue[currentIndex + 1];
      if (!nextSong) return;
      
      const prefetch = async () => {
        if ((window as any).electronAPI?.checkCache) {
          const isCached = await (window as any).electronAPI.checkCache(nextSong.id);
          if (!isCached) {
            console.log(`[Prefetch] Memulai download diam-diam untuk lagu berikutnya: ${nextSong.title}`);
            const streamUrl = `${API_BASE_URL}/api/stream?id=${nextSong.id}`;
            (window as any).electronAPI.cacheAudio(nextSong, streamUrl, true);
          }
        }
      };
      // Delay sedikit agar tidak mengganggu proses load lagu utama
      const timer = setTimeout(prefetch, 8000); 
      return () => clearTimeout(timer);
    }
  }, [currentIndex, queue]);

  // ─── Listen Along & Presence Sync ───
  useEffect(() => {
    if (!discordUser) return;
    
    const syncPresence = async () => {
      if ((window as any).electronAPI) {
        try {
          const avatar = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null;
          await (window as any).electronAPI.updatePresence({
            discordId: discordUser.id,
            username: discordUser.global_name || discordUser.username,
            avatarUrl: avatar,
            currentSong: currentSong ? {
              ...currentSong,
              currentTime: audioRef.current?.currentTime || 0,
              isPlaying: audioRef.current ? !audioRef.current.paused : false,
              timestamp: Date.now()
            } : null,
            partyId: activePartyId,
            status: userStatus,
            queue: queue
          });
          const users = await (window as any).electronAPI.getOnlineUsers(discordUser.id);
          setOnlineUsers(users);

          // Poll requests
          const reqs = await (window as any).electronAPI.pollJoinRequests(discordUser.id);
          setJoinRequests(reqs);

          // Handle Guest acceptance automatically
          if (reqs.outgoing && reqs.outgoing.length > 0) {
            const allAccepted = reqs.outgoing.filter((r: any) => r.status === 'accepted');
            const allRejected = reqs.outgoing.filter((r: any) => r.status === 'rejected');
            
            if (allAccepted.length > 0) {
              if (!isGuest) {
                setActivePartyId(allAccepted[0].hostId);
                setIsGuest(true);
                showToast(`Request accepted! Listening along...`, 'success');
              }
              for (const req of allAccepted) {
                await (window as any).electronAPI.respondJoinRequest(req.id, 'consumed');
              }
            }
            
            if (allRejected.length > 0) {
              showToast(t('joinRequestRejected'), 'error');
              for (const req of allRejected) {
                await (window as any).electronAPI.respondJoinRequest(req.id, 'consumed');
              }
            }
          }

          // Poll Queue requests
          if (!isGuest) {
            const queueReqs = await (window as any).electronAPI.pollQueueRequests(discordUser.id);
            if (queueReqs && queueReqs.length > 0) {
              const newSongs = queueReqs.map((r: any) => r.songData);
              
              setQueue((prevQueue: any[]) => [...prevQueue, ...newSongs]);
              setOriginalQueue((prevQueue: any[]) => [...prevQueue, ...newSongs]);
              
              for (const req of queueReqs) {
                showToast(`${req.guestName} menambahkan lagu ke antrean!`, 'success');
                (window as any).electronAPI.respondQueueRequest(req.id, 'consumed');
              }
            }
          }

        } catch (e) {
          console.error('Failed to sync presence', e);
        }
      }
    };

    syncPresence();
    const intervalMs = 1000;
    const presenceInterval = setInterval(syncPresence, intervalMs);
    return () => clearInterval(presenceInterval);
  }, [discordUser, currentSong, activePartyId, userStatus, isGuest, queue]);

  // ─── Lyrics ──────────────────────────────────────────────────
  const [lyricsData, setLyricsData] = useState<{ time: number, text: string, romanizedText?: string, isInstrumental?: boolean }[] | null>(null);
  const [showRomanized, setShowRomanized] = useState(true);
  const [plainLyrics, setPlainLyrics] = useState<string>('');
  const [lyricsOffset, setLyricsOffset] = useState<number>(0);
  const sidebarLyricsRef = useRef<HTMLDivElement>(null);
  const widgetLyricsRef = useRef<HTMLDivElement>(null);

  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWidgetOverlay, setShowWidgetOverlay] = useState(false);

  // ─── Queue State Moved Up

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeAudioRef = useRef<HTMLAudioElement | null>(null);
  const isCrossfadingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setupAudioContext = (audio: HTMLAudioElement) => {
    if (!audioContextRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const source = ctx.createMediaElementSource(audio);
        sourceNodeRef.current = source;

        // Create 5-band EQ
        const freqs = [60, 230, 910, 3600, 14000];
        const newFilters = freqs.map(freq => {
          const filter = ctx.createBiquadFilter();
          filter.type = 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1.0;
          filter.gain.value = 0;
          return filter;
        });
        filtersRef.current = newFilters;

        let prevNode: AudioNode = source;
        for (const filter of newFilters) {
          prevNode.connect(filter);
          prevNode = filter;
        }
        prevNode.connect(ctx.destination);
      } catch (e) {
        console.error('AudioContext setup failed', e);
      }
    }
  };
  const recentScrollRef = useRef<HTMLDivElement>(null);
  const recsScrollRef = useRef<HTMLDivElement>(null);

  const scrollSlider = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const amount = direction === 'right' ? 480 : -480;
      ref.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // ─── Context Menu ──────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, song: any } | null>(null);

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, []);

  // ─── Persist Data ────────────────────────────────────────────
  const userRef = useRef(discordUser);
  userRef.current = discordUser;

  useEffect(() => {
    const suffix = discordUser ? `_${discordUser.id}` : '';
    
    try {
      const hist = localStorage.getItem(`donpollo_history${suffix}`);
      setPlayHistory(hist ? JSON.parse(hist) : []);
    } catch { setPlayHistory([]); }

    try {
      const liked = localStorage.getItem(`donpollo_liked${suffix}`);
      setLikedSongs(liked ? JSON.parse(liked) : []);
    } catch { setLikedSongs([]); }
    
    // Only load playlists from localStorage for guest mode (no DB connection).
    // When logged in with electronAPI, the DB fetch effect (above) handles loading.
    if (!(window as any).electronAPI || !discordUser) {
      try {
        const pl = localStorage.getItem(`donpollo_playlists${suffix}`);
        setPlaylists(pl ? JSON.parse(pl) : []);
      } catch { setPlaylists([]); }
    }
    
  }, [discordUser]);

  useEffect(() => {
    const suffix = userRef.current ? `_${userRef.current.id}` : '';
    localStorage.setItem(`donpollo_history${suffix}`, JSON.stringify(playHistory));
  }, [playHistory]);

  useEffect(() => {
    const suffix = userRef.current ? `_${userRef.current.id}` : '';
    localStorage.setItem(`donpollo_playlists${suffix}`, JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    const suffix = userRef.current ? `_${userRef.current.id}` : '';
    localStorage.setItem(`donpollo_liked${suffix}`, JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('donpollo_settings', JSON.stringify({ ...settings, volume }));
  }, [settings, volume]);

  //   // --- Listen time tracker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTotalListenSeconds(prev => {
        const next = prev + 1;
        localStorage.setItem('donpollo_listen_seconds', String(next));
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // ─── Recommendations ─────────────────────────────────────────
  useEffect(() => {
    const fetchRecs = async () => {
      let query = 'Pop Hits 2024';
      if (playHistory.length > 0) {
        const item = playHistory[0];
        let realArtist = item.artist || '';
        if (item.title && item.title.includes(' - ')) {
          realArtist = item.title.split(' - ')[0].trim();
        }
        query = realArtist || item.title;
      }
      try {
        const queries = [
          `${query} official audio`,
          `${query} popular songs`,
          `${query} best hits`,
          `${query} music video`,
          `${query} acoustic`
        ];
        const responses = await Promise.all(queries.map(q => fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(q)}`).catch(() => null)));
        const dataArrays = await Promise.all(responses.filter(r => r !== null).map((r: any) => r.json().catch(() => ({}))));
        
        let combined: any[] = [];
        dataArrays.forEach(data => {
          if (data && data.results) combined = [...combined, ...data.results];
        });
        
        // Remove duplicates by id
        const unique = combined.filter((item, index, self) => index === self.findIndex((t) => t.id === item.id));
        setRecommendations(unique.slice(0, 25));
      } catch { }
    };
    fetchRecs();
  }, [playHistory]);

  // ─── Discord OAuth Callback Handler ─────────────────────────
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      if (token) {
        fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.json())
          .then((user: DiscordUser) => {
            setDiscordUser(user);
            localStorage.setItem('donpollo_user', JSON.stringify(user));
            localStorage.setItem('donpollo_discord_token', token);
            showToast(`${t('toastWelcome')}, ${user.global_name || user.username}!`, 'user');
            window.history.replaceState(null, '', window.location.pathname);
            setActivePage('home');
          })
          .catch(() => showToast(t('toastDiscordError'), 'error'));
      }
    }
  }, []);

  // ─── Audio Setup ─────────────────────────────────────────────
  const setupAudioListeners = useCallback((audio: HTMLAudioElement) => {
    const handleTimeUpdate = () => {
      if (audioRef.current !== audio) return;
      setProgress(audio.currentTime);
    };
    const handleEnded = () => {
      if (audioRef.current !== audio) return;
      handleNextRef.current();
    };
    const handleError = () => {
      if (audioRef.current !== audio) return;
      setIsPlaying(false);
    };
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
  }, []);

  useEffect(() => {
    const audio = new Audio();
    // audio.crossOrigin = "anonymous"; // Dicomment sementara agar tidak error CORS di mode Dev
    audio.volume = isMuted ? 0 : volume;
    audio.loop = loopMode === 'one';
    audioRef.current = audio;
    setupAudioContext(audio);
    setupAudioListeners(audio);
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, [setupAudioListeners]);

  useEffect(() => {
    if (filtersRef.current.length === 5) {
      const isEqEnabled = settings.eqEnabled;
      const bands = settings.eqBands || [0, 0, 0, 0, 0];
      filtersRef.current.forEach((f, i) => {
        f.gain.value = isEqEnabled ? bands[i] : 0;
      });
    }
  }, [settings.eqEnabled, settings.eqBands]);

  // ─── Crossfade Monitor ───
  useEffect(() => {
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || isGuest || isCrossfadingRef.current || queue.length <= currentIndex + 1) return;
      
      const cfDurStr = localStorage.getItem('donpollo_crossfade');
      const cfDuration = cfDurStr ? parseInt(cfDurStr) : 0;
      
      if (cfDuration > 0 && audio.duration > 0 && audio.currentTime >= audio.duration - cfDuration) {
        isCrossfadingRef.current = true;
        const oldAudio = audio;
        fadeAudioRef.current = oldAudio;
        
        const fadeStep = oldAudio.volume / (cfDuration * 10);
        const fadeOutInt = setInterval(() => {
          if (oldAudio.volume - fadeStep > 0) {
            oldAudio.volume -= fadeStep;
          } else {
            oldAudio.volume = 0;
            oldAudio.pause();
            oldAudio.src = '';
            clearInterval(fadeOutInt);
            if (fadeAudioRef.current === oldAudio) fadeAudioRef.current = null;
          }
        }, 100);

        const newAudio = new Audio();
        audioRef.current = newAudio;
        setupAudioListeners(newAudio);
        newAudio.volume = 0;
        newAudio.loop = loopMode === 'one';

        const targetVol = isMuted ? 0 : volume;
        // Fade in new audio gradually
        if (targetVol > 0) {
          const fadeInStep = targetVol / (cfDuration * 10);
          const fadeInInt = setInterval(() => {
            if (newAudio.volume + fadeInStep < targetVol) {
              newAudio.volume = Math.min(newAudio.volume + fadeInStep, targetVol);
            } else {
              newAudio.volume = targetVol;
              clearInterval(fadeInInt);
            }
          }, 100);
        } else {
          newAudio.volume = 0;
        }
        isCrossfadingRef.current = false;

        handleNextRef.current();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isGuest, queue, currentIndex, volume, isMuted, loopMode, setupAudioListeners]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.loop = loopMode === 'one';
    }
  }, [volume, isMuted, loopMode]);

  useEffect(() => {
    if (activePage === 'settings' && (window as any).electronAPI?.getCacheSize) {
      (window as any).electronAPI.getCacheSize().then(setCacheSize);
    }
  }, [activePage]);

  useEffect(() => {
    let unsub: any;
    const api = (window as any).electronAPI;
    if (api && api.onMiniPlayerMode) {
      unsub = api.onMiniPlayerMode((_event: any, mode: boolean) => {
         setIsWidgetMode(mode);
         if (mode) setActivePage('home');
      });
    }
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // ─── Lyrics Auto-Scroll ──────────────────────────────────────
  useEffect(() => {
    if (!isUserScrolling && lyricsData) {
      const activeIndex = lyricsData.findIndex((line, i) => {
        const nextTime = i < lyricsData.length - 1 ? lyricsData[i + 1].time : duration;
        return (progress - lyricsOffset) >= line.time && (progress - lyricsOffset) < nextTime;
      });
      if (activeIndex !== -1) {
        if (showLyrics && sidebarLyricsRef.current) {
          const c = sidebarLyricsRef.current;
          const el = c.querySelector(`[data-lyric-idx="${activeIndex}"]`) as HTMLElement;
          if (el) c.scrollTo({ top: el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
        }
        if (isWidgetMode && widgetLyricsRef.current) {
          const c = widgetLyricsRef.current;
          const el = c.querySelector(`[data-lyric-idx="${activeIndex}"]`) as HTMLElement;
          if (el) c.scrollTo({ top: el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2, behavior: 'smooth' });
        }
      }
    }
  }, [progress, lyricsData, duration, showLyrics, lyricsOffset, isWidgetMode, isUserScrolling]);

  // ─── Helpers ─────────────────────────────────────────────────
  const showToast = (msg: string, iconType: 'success' | 'error' | 'music' | 'playlist' | 'user' = 'success') => {
    let IconComponent = <Check size={20} />;
    let type: 'success' | 'error' = 'success';

    if (msg.toLowerCase().includes('gagal') || msg.toLowerCase().includes('error')) {
      IconComponent = <AlertCircle size={20} />;
      type = 'error';
    } else if (iconType === 'error') {
      IconComponent = <AlertCircle size={20} />;
      type = 'error';
    } else if (iconType === 'music') {
      IconComponent = <Music size={20} />;
    } else if (iconType === 'playlist') {
      IconComponent = <ListMusic size={20} />;
    } else if (iconType === 'user') {
      IconComponent = <UserCircle size={20} />;
    }

    setToastData({ msg, icon: IconComponent, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastData(null), 4000);
  };

  const handleUserScroll = () => {
    userScrollingRef.current = true;
    setIsUserScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      userScrollingRef.current = false;
      setIsUserScrolling(false);
    }, 3000);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 17) return t('goodAfternoon');
    return t('goodEvening');
  };

  const isLiked = (songId: string) => likedSongs.some(s => s.id === songId);

  const toggleLike = (song: any) => {
    setLikedSongs(prev =>
      prev.some(s => s.id === song.id)
        ? prev.filter(s => s.id !== song.id)
        : [song, ...prev]
    );
  };

  // ─── Playlist Functions ──────────────────────────────────────
  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const newPl: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      avatar: newPlaylistAvatar.trim() || undefined,
      songs: [],
      createdAt: Date.now(),
      discordId: discordUser?.id || '',
    };

    if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(newPl);

    setPlaylists(prev => [newPl, ...prev]);
    setNewPlaylistName('');
    setNewPlaylistAvatar('');
    setShowCreatePlaylist(false);
    showToast(`Playlist "${newPl.name}" ${t('toastPlaylistCreated')}`, 'playlist');
  };

  const handleLogout = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentSong(null);
    setQueue([]);
    setOriginalQueue([]);
    setCurrentIndex(-1);
    setLyricsData(null);
    setDiscordUser(null);
    localStorage.removeItem('donpollo_user');
    setShowLogoutDropdown(false);
    setActivePage('home');
    showToast(t('toastLogout'), 'success');
  };

  const addSongToPlaylist = async (playlistId: string, song: any) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl || pl.songs.some(s => s.id === song.id)) {
      setAddToPlaylistSong(null);
      return;
    }

    const updated = { ...pl, songs: [...pl.songs, song] };
    if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(updated);

    setPlaylists(prev => prev.map(p => p.id === playlistId ? updated : p));
    setAddToPlaylistSong(null);
    showToast(t('toastAddedToPlaylist'), 'playlist');
  };

  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;

    const updated = { ...pl, songs: pl.songs.filter(s => s.id !== songId) };
    if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(updated);

    setPlaylists(prev => prev.map(p => p.id === playlistId ? updated : p));
  };

  const deletePlaylist = async (playlistId: string) => {
    if ((window as any).electronAPI) await (window as any).electronAPI.deletePlaylist(playlistId);
    setPlaylists(prev => prev.filter(pl => pl.id !== playlistId));
    setActivePage('playlist');
    setPlaylistToDelete(null);
    showToast(t('toastPlaylistDeleted'));
  };

  const handleClearCache = async () => {
    if ((window as any).electronAPI?.clearCache) {
      await (window as any).electronAPI.clearCache();
      setCacheSize(0);
      showToast(t('toastCacheCleared'));
    }
  };

  const handleImportPlaylist = async () => {
    if (!importPlaylistUrl.trim()) return;
    setIsImporting(true);
    showToast(t('importing'));
    try {
      const res = await fetch(`${API_BASE_URL}/api/playlist?url=${encodeURIComponent(importPlaylistUrl)}`);
      if (!res.ok) throw new Error('Failed to connect to backend');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const newPlaylist: Playlist = {
        id: `playlist-${Date.now()}`,
        name: data.name || 'Imported Playlist',
        avatar: data.cover || '',
        songs: data.songs || [],
        createdAt: Date.now(),
        discordId: discordUser?.id || '',
      };
      
      if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(newPlaylist);
      setPlaylists((prev: any) => [...prev, newPlaylist]);
      showToast(`"${newPlaylist.name}" ${t('toastImportSuccess')}`);
      setShowImportPlaylist(false);
      setImportPlaylistUrl('');
      setActivePlaylistId(newPlaylist.id);
      setActivePage('playlist');
    } catch (e: any) {
      showToast(e.message || 'Import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleEditPlaylistName = async (playlistId: string) => {
    if (!editPlaylistNameValue.trim()) {
      setIsEditingPlaylistName(false);
      return;
    }
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;

    const updated = { ...pl, name: editPlaylistNameValue.trim() };
    if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(updated);

    setPlaylists(prev => prev.map(p => p.id === playlistId ? updated : p));
    setIsEditingPlaylistName(false);
  };

  const handleUpdatePlaylistAvatar = async (playlistId: string) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;

    const updated = { ...pl, avatar: avatarUrlInput.trim() };
    if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(updated);

    setPlaylists(prev => prev.map(p => p.id === playlistId ? updated : p));
    setShowAvatarPrompt(false);
    setAvatarUrlInput('');
  };

  const handlePlaylistSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistSearchQuery.trim()) return;
    setIsPlaylistSearching(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(playlistSearchQuery + ' official audio')}`);
      const data = await response.json();
      if (data.results) setPlaylistSearchResults(data.results);
    } catch (err) {
      console.error(err);
      showToast(t('toastSearchFail'), 'error');
    }
    setIsPlaylistSearching(false);
  };

  // ─── Discord Auth Functions ──────────────────────────────────
  const loginWithDiscord = async () => {
    const scope = encodeURIComponent('identify');
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=token&scope=${scope}`;

    const api = (window as any).electronAPI;
    if (api && api.discordLogin) {
      // Electron: open a popup window, never navigate away from main window
      const token = await api.discordLogin(authUrl);
      if (token) {
        try {
          const res = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) { showToast('Gagal mengambil info Discord.', 'error'); return; }
          const user = await res.json();
          localStorage.setItem('donpollo_user', JSON.stringify(user));
          localStorage.setItem('donpollo_discord_token', token);
          setDiscordUser(user);
          showToast(`Selamat datang, ${user.global_name || user.username}! 🎉`, 'success');
        } catch (e) {
          showToast('Login gagal, coba lagi.', 'error');
        }
      }
    } else {
      // Browser fallback (dev without Electron)
      window.location.href = authUrl;
    }
  };

  const logoutDiscord = () => {
    setDiscordUser(null);
    localStorage.removeItem('donpollo_user');
    localStorage.removeItem('donpollo_discord_token');
    showToast(t('toastLogout'));
  };

  const getDiscordAvatar = (user: DiscordUser) => {
    if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    return null;
  };

  // ─── Audio Functions ─────────────────────────────────────────
  const parseLRC = (lrc: string) => {
    const lines = lrc.split('\n');
    const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
    const result = [];
    const rawLines = [];
    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        const min = parseInt(match[1]);
        const sec = parseInt(match[2]);
        const ms = parseInt(match[3].padEnd(3, '0'));
        const time = min * 60 + sec + ms / 1000;
        const text = match[4].trim();
        rawLines.push({ time, text });
      }
    }
    if (rawLines.length === 0) return null;
    for (let i = 0; i < rawLines.length; i++) {
      const { time, text } = rawLines[i];
      if (text === '' || text === '♪' || text === '♩') {
        result.push({ time, text: '', isInstrumental: true });
      } else {
        result.push({ time, text });
      }
    }
    return result;
  };

  const fetchLyrics = async (title: string, artist: string, songDuration = 0) => {
    setPlainLyrics(t('lyricsSearching'));
    setLyricsData(null);
    try {
      let cleanTitle = title.replace(/\(.*?\)|\[.*?\]|【.*?】/g, '').replace(/(official|music|video|audio|lyric|lyrics|remastered|remaster|hd|hq|m\/v|mv|live|performance|teaser|dance|practice)/gi, '').replace(/\|/g, '').trim();
      let finalArtist = artist.replace(/VEVO|Official|Topic/gi, '').trim();
      if (cleanTitle.includes('-')) {
        const parts = cleanTitle.split('-');
        finalArtist = parts[0].trim();
        cleanTitle = parts[1].trim();
      } else {
        const quoteMatch = cleanTitle.match(/(.+?)\s*['"“”‘’](.+?)['"“”‘’]/);
        if (quoteMatch) {
          finalArtist = quoteMatch[1].trim();
          cleanTitle = quoteMatch[2].trim();
        }
      }
      cleanTitle = cleanTitle.replace(/['"“”‘’]/g, '').trim();
      if (!cleanTitle) cleanTitle = title.replace(/['"“”‘’]/g, '').trim();
      const query = encodeURIComponent(`${cleanTitle} ${finalArtist}`);
      const data = await (await fetch(`https://lrclib.net/api/search?q=${query}`)).json();
      if (data && data.length > 0) {
        const syncedMatches = data.filter((item: any) => item.syncedLyrics);
        
        // 1. Filter by Artist Name
        let artistMatches = syncedMatches.filter((item: any) => {
          if (!item.artistName) return false;
          const apiArtist = item.artistName.toLowerCase();
          const qArtist = finalArtist.toLowerCase();
          return apiArtist.includes(qArtist) || qArtist.includes(apiArtist);
        });

        // 2. Filter by Title Match
        let titleMatches = artistMatches.filter((item: any) => {
          if (!item.trackName) return false;
          const apiTitle = item.trackName.toLowerCase();
          const qTitle = cleanTitle.toLowerCase();
          return apiTitle.includes(qTitle) || qTitle.includes(apiTitle);
        });

        // 3. Fallback hierarchy
        let candidateMatches = titleMatches.length > 0 ? titleMatches : (artistMatches.length > 0 ? artistMatches : (syncedMatches.length > 0 ? syncedMatches : data));

        let bestMatch = candidateMatches[0];
        if (songDuration > 0 && candidateMatches.length > 0) {
          candidateMatches.sort((a: any, b: any) => Math.abs((a.duration || 0) - songDuration) - Math.abs((b.duration || 0) - songDuration));
          bestMatch = candidateMatches[0];
          if (bestMatch.duration) {
            const diff = songDuration - bestMatch.duration;
            if (diff > 4 && diff < 30) setLyricsOffset(diff);
          }
        }
        
        if (bestMatch && bestMatch.syncedLyrics) {
          const parsed = parseLRC(bestMatch.syncedLyrics);
          if (parsed) {
            setLyricsData(parsed);
            
            // Auto Romanization
            setTimeout(async () => {
              try {
                const textSample = parsed.map((p: any) => p.text).join(' ');
                let lang: 'ko' | 'ja' | null = null;
                if (/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/.test(textSample)) lang = 'ko';
                else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(textSample)) lang = 'ja';
                
                if (lang && (window as any).electronAPI) {
                  const combinedText = parsed.map((p: any) => p.text || '').join('\n');
                  const romText = await (window as any).electronAPI.romanizeLyrics(combinedText, lang);
                  if (romText) {
                    const romLines = romText.split('\n');
                    setLyricsData(prev => {
                      if (!prev) return prev;
                      return prev.map((item, i) => ({
                        ...item,
                        romanizedText: romLines[i] ? romLines[i].trim() : undefined
                      }));
                    });
                  }
                }
              } catch (e) {
                console.error('Romanization failed', e);
              }
            }, 100);
          } else {
            setPlainLyrics(bestMatch.plainLyrics || t('lyricsNotLRC'));
          }
        } else if (bestMatch && bestMatch.plainLyrics) {
          setPlainLyrics(bestMatch.plainLyrics);
        } else {
          setPlainLyrics(t('lyricsNotFound'));
        }
      } else {
        setPlainLyrics(t('lyricsNotFound'));
      }
    } catch {
      setPlainLyrics(t('lyricsFailed'));
    }
  };

  const executePlay = async (song: any, startTime?: number) => {
    try {
      setLyricsData(null);
      setLyricsOffset(0);
      
      // 1. Update UI langsung agar terasa lebih cepat
      setCurrentSong(song);
      setDuration(song.duration || 0);
      setIsPlaying(true);
      
      // 2. Fetch lyrics berjalan di background
      fetchLyrics(song.title, song.artist, song.duration || 0);

      // 3. Cek cache lokal atau stream langsung
      if (audioRef.current) {
        let streamUrl = `${API_BASE_URL}/api/stream?id=${song.id}`;
        let isCached = false;
        
        if ((window as any).electronAPI?.checkCache) {
           isCached = await (window as any).electronAPI.checkCache(song.id);
        }

        if ((window as any).electronAPI?.clearTempCache) {
           (window as any).electronAPI.clearTempCache(song.id);
        }

        const cacheMode = settings.cacheMode || 'smart';

        if (isCached) {
          audioRef.current.src = `donpollo-cache://${song.id}`;
        } else {
          audioRef.current.src = streamUrl;
          if (cacheMode !== 'stream') {
            if ((window as any).electronAPI?.cacheAudio) {
               const isTemp = cacheMode === 'temp';
               (window as any).electronAPI.cacheAudio(song, streamUrl, true, isTemp);
            }
          }
        }
        
        if (startTime !== undefined) {
          audioRef.current.currentTime = startTime;
        }
        
        audioRef.current.play().catch(async (err) => {
          console.error("PLAY ERROR:", err.name, err.message, err);
          if (err.name === 'AbortError') return;
          showToast(`Error Play: ${err.message || err.name}`, 'error');
          try {
            // Fallback Piped API
            const pipedData = await (await fetch(`https://pipedapi.kavin.rocks/streams/${song.id}`)).json();
            if (pipedData.error) throw new Error(pipedData.error);
            const bestAudio = pipedData.audioStreams?.find((s: any) => s.mimeType?.includes('audio/mp4')) || pipedData.audioStreams?.[0];
            if (bestAudio?.url) {
              audioRef.current!.src = bestAudio.url;
              await audioRef.current!.play();
              setIsPlaying(true);
              showToast(t('toastServerFallback'), 'music');
            } else throw new Error('Format tidak didukung.');
          } catch {
            showToast(t('toastVideoLocked'), 'error');
            setIsPlaying(false);
          }
        });
      }
    } catch (err: any) {
      showToast(err.message, 'error');
      setIsPlaying(false);
    }
  };

  // ─── Listen Along Sync Effect ───
  useEffect(() => {
    if (isGuest && activePartyId) {
      const hostUser = onlineUsers.find(u => u.discordId === activePartyId);
      if (hostUser && hostUser.currentSong) {
        const hs = hostUser.currentSong;
        
        // Calculate exact time based on elapsed time since host reported it
        const elapsed = hs.timestamp ? (Date.now() - hs.timestamp) / 1000 : 0;
        let targetTime = (hs.currentTime || 0);
        if (hs.isPlaying) {
          targetTime += elapsed;
        }

        if (!currentSong || currentSong.id !== hs.id) {
          // Abaikan broadcast host jika host masih tertinggal (lagging) dari eager advance kita
          const lastAdvance = (window as any).lastGuestAdvance || 0;
          const isStaleHost = (Date.now() - lastAdvance < 15000) && queue[currentIndex - 1]?.id === hs.id;
          
          if (!isStaleHost) {
            executePlay(hs, targetTime);
          }
        } else {
          // If already playing the same song, check if we need to sync time or play/pause state
          if (audioRef.current) {
            if (hs.isPlaying && audioRef.current.paused) {
              audioRef.current.play().catch(()=>{});
            } else if (!hs.isPlaying && !audioRef.current.paused) {
              audioRef.current.pause();
            }

            // If we are out of sync by more than 3 seconds, forcefully seek to catch up
            if (Math.abs(audioRef.current.currentTime - targetTime) > 3) {
              audioRef.current.currentTime = targetTime;
            }
          }
        }
        
        // Sync queue for guest
        if (hostUser.queue && hostUser.queue.length > 0) {
           setQueue(hostUser.queue);
           setOriginalQueue(hostUser.queue);
        }
      }
    }
  }, [onlineUsers, isGuest, activePartyId, currentSong]);

  const addToHistory = (song: any) => {
    if (!song || !song.id) return;
    const cleanSong = { id: song.id, title: song.title, artist: song.artist, thumbnail: song.thumbnail, duration: song.duration };
    setPlayHistory(prev => {
      const filtered = prev.filter(item => item.id !== cleanSong.id);
      return [cleanSong, ...filtered].slice(0, 20);
    });
  };

  const startPlayingFromList = async (list: any[], startIndex: number) => {
    if (!list || list.length === 0) return;
    let song = list[startIndex];
    
    if (!song.id) {
       showToast(`Menautkan "${song.title}" ke YouTube...`, 'user');
       try {
         const url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(song.originalQuery)}`;
         const data = (window as any).electronAPI ? await (window as any).electronAPI.fetchUrl(url) : await (await fetch(url)).json();
         const validYt = data?.results?.find((item: any) => item.duration >= 60 && item.duration <= 480);
         if (validYt) {
           song = { ...song, id: validYt.id, duration: validYt.duration };
           list[startIndex] = song; // Update in list
         } else throw new Error("Not found");
       } catch (err) {
         showToast(`Gagal menautkan "${song.title}".`, 'error');
         return;
       }
    }

    if (isGuest && activePartyId) {
       await (window as any).electronAPI.sendQueueRequest(activePartyId, discordUser?.id, discordUser?.global_name || discordUser?.username, song);
       showToast(`Berhasil meminta Host untuk menambahkan "${song.title}" ke antrean!`, 'success');
       return;
    }

    setQueue(list);
    setOriginalQueue(list);
    if (isShuffled) {
      const shuffled = [...list].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setCurrentIndex(0);
    } else {
      setCurrentIndex(startIndex);
    }
    addToHistory(song);
    executePlay(song);
  };

  const handleNextRef = useRef<() => void>(() => { });
  const handlePrevRef = useRef<() => void>(() => { });
  const togglePlayRef = useRef<() => void>(() => { });
  const handleNext = async () => {
    if (currentIndex < queue.length - 1) {
      if (isGuest) {
        (window as any).lastGuestAdvance = Date.now();
      }
      
      // On-the-fly fetch for next song if id is null
      let nextSong = queue[currentIndex + 1];
      if (!nextSong.id) {
        try {
          const url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(nextSong.originalQuery)}`;
          const data = (window as any).electronAPI ? await (window as any).electronAPI.fetchUrl(url) : await (await fetch(url)).json();
          const validYt = data?.results?.find((item: any) => item.duration >= 60 && item.duration <= 480);
          if (validYt) {
            nextSong = { ...nextSong, id: validYt.id, duration: validYt.duration };
            setQueue(prev => prev.map((s, i) => i === currentIndex + 1 ? nextSong : s));
          } else throw new Error("Not found");
        } catch (err) {
          showToast(`Gagal menautkan lagu berikutnya.`, 'error');
          return;
        }
      }

      setCurrentIndex(currentIndex + 1);
      executePlay(nextSong);
    } else if (loopMode === 'all' && queue.length > 0) {
      if (isGuest) {
        (window as any).lastGuestAdvance = Date.now();
      }
      setCurrentIndex(0);
      executePlay(queue[0]);
    } else {
      setIsPlaying(false);
    }
  };

  const toggleLoopMode = () => {
    if (loopMode === 'off') setLoopMode('one');
    else if (loopMode === 'one') setLoopMode('all');
    else setLoopMode('off');
  };
  handleNextRef.current = handleNext;

  const playSingleSong = async (song: any) => {
    let finalSong = song;
    if (!song.id) {
       showToast(`Menautkan "${song.title}" ke YouTube...`, 'user');
       try {
         const url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(song.originalQuery)}`;
         const data = (window as any).electronAPI ? await (window as any).electronAPI.fetchUrl(url) : await (await fetch(url)).json();
         const validYt = data?.results?.find((item: any) => item.duration >= 60 && item.duration <= 480);
         if (validYt) {
           finalSong = { ...song, id: validYt.id, duration: validYt.duration };
         } else throw new Error("Not found");
       } catch (err) {
         showToast(`Gagal menautkan "${song.title}".`, 'error');
         return;
       }
    }

    if (isGuest && activePartyId) {
       await (window as any).electronAPI.sendQueueRequest(activePartyId, discordUser?.id, discordUser?.global_name || discordUser?.username, finalSong);
       showToast(`Berhasil meminta Host untuk menambahkan "${finalSong.title}" ke antrean!`, 'success');
       return;
    }

    setQueue([finalSong]);
    setOriginalQueue([finalSong]);
    setCurrentIndex(0);
    addToHistory(finalSong);
    executePlay(finalSong);
  };

  const handleContextMenu = (e: React.MouseEvent, song: any) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, song });
  };

  const handlePrev = () => {
    if (progress > 3) { if (audioRef.current) audioRef.current.currentTime = 0; }
    else if (currentIndex > 0) { setCurrentIndex(currentIndex - 1); executePlay(queue[currentIndex - 1]); }
  };

  const togglePlay = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        if (fadeAudioRef.current) fadeAudioRef.current.pause();
      } else {
        audioRef.current.play();
        if (fadeAudioRef.current) fadeAudioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  handlePrevRef.current = handlePrev;
  togglePlayRef.current = togglePlay;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const toggleShuffle = () => {
    if (!isShuffled) {
      if (queue.length > 0) {
        const current = queue[currentIndex];
        const others = queue.filter((_, i) => i !== currentIndex);
        for (let i = others.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [others[i], others[j]] = [others[j], others[i]];
        }
        setQueue([current, ...others]);
        setCurrentIndex(0);
      }
    } else {
      setQueue([...originalQueue]);
      if (currentSong) {
        const idx = originalQueue.findIndex(s => s.id === currentSong.id);
        setCurrentIndex(idx !== -1 ? idx : 0);
      }
    }
    setIsShuffled(!isShuffled);
  };

  const jumpToLyric = (time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time + lyricsOffset;
  };

  const goHome = () => { setActivePage('home'); setSearchQuery(''); setSearchResults([]); };

  const fetchArtistSongs = async (artist: string, filter: 'popular' | 'newest') => {
    setIsArtistLoading(true);
    setArtistSongs([]);
    try {
      let queries: string[] = [];
      try {
        const targetUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=song&limit=100`;
        const itunesData = (window as any).electronAPI 
          ? await (window as any).electronAPI.fetchUrl(targetUrl)
          : await (await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`)).json();
        
        if (itunesData.results && itunesData.results.length > 0) {
          let tracks = itunesData.results.filter((t: any) => t.artistName && t.artistName.toLowerCase().includes(artist.toLowerCase()));
          
          if (filter === 'newest') {
            tracks.sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
          }
          
          const uniqueTracks = new Map<string, any>();
          for (const t of tracks) {
            if (!uniqueTracks.has(t.trackName)) uniqueTracks.set(t.trackName, t);
          }
          
          const topTracks = Array.from(uniqueTracks.values()).slice(0, 30);
          
          // 1. INSTANT LOAD using iTunes metadata
          const initialSongs = topTracks.map((t: any) => ({
            id: null,
            title: t.trackName,
            artist: t.artistName,
            thumbnail: t.artworkUrl100 ? t.artworkUrl100.replace('100x100bb.jpg', '500x500bb.jpg') : '',
            duration: Math.round((t.trackTimeMillis || 0) / 1000),
            originalQuery: `${t.artistName} ${t.trackName} official audio`
          }));
          
          setArtistSongs(initialSongs);
          setIsArtistLoading(false); // Stop loader instantly!
          
          // 2. BACKGROUND MAPPING using high-speed IPC (Sequentially)
          (async () => {
            for (let idx = 0; idx < initialSongs.length; idx++) {
              const song = initialSongs[idx];
              const url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(song.originalQuery)}`;
              try {
                const data = (window as any).electronAPI
                  ? await (window as any).electronAPI.fetchUrl(url)
                  : await (await fetch(url)).json();
                  
                if (data && data.results) {
                  const validYt = data.results.find((item: any) => item.duration >= 60 && item.duration <= 480);
                  if (validYt) {
                    setArtistSongs(prev => {
                      const next = [...prev];
                      if (next[idx] && next[idx].title === song.title) {
                        next[idx] = { ...next[idx], id: validYt.id }; // Insert the real YouTube ID
                      }
                      return next;
                    });
                  }
                }
              } catch (e) {
                console.error('BG mapping error:', e);
              }
              // Yield to allow on-the-fly requests to take priority
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          })();
          
          return; // Early return, success!
        }
      } catch (err) {
        console.error('iTunes API fallback', err);
      }

      // Fallback if iTunes fails
      if (queries.length === 0) {
        queries = filter === 'popular' 
          ? [`${artist} popular songs`, `${artist} hit songs`, `${artist} best songs`, `${artist} top hits`]
          : [`${artist} newest songs 2024`, `${artist} new release`, `${artist} comeback`, `${artist} latest mv`];
      }

      // Progressive loading for fallback
      let firstBatchLoaded = false;

      const fetchPromises = queries.map((query) => {
        return fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`)
          .then(res => res.json())
          .then(data => {
            if (data.results) {
              const validSong = data.results.find((item: any) => item.duration >= 60 && item.duration <= 480);
              
              if (validSong) {
                if (!firstBatchLoaded) {
                  setIsArtistLoading(false);
                  firstBatchLoaded = true;
                }
                
                setArtistSongs(prev => {
                  if (!prev.find(s => s.id === validSong.id)) {
                    return [...prev, validSong].slice(0, 30);
                  }
                  return prev;
                });
              }
            }
          })
          .catch(err => {
            console.error('Error fetching query:', query, err);
          });
      });

      await Promise.all(fetchPromises);
    } catch (e) {
      console.error('Failed to fetch artist songs', e);
    } finally {
      setIsArtistLoading(false);
    }
  };

  const openArtistPage = (artistName: string) => {
    setActiveArtist(artistName);
    setActivePage('artist');
    setArtistFilter('popular');
    setShowSuggestions(false);
    fetchArtistSongs(artistName, 'popular');
  };

  // ═══════════════════════════════════════════════════════════════
  // PAGE RENDERERS
  // ═══════════════════════════════════════════════════════════════

  const renderLibraryPage = () => (
    <div className="page-content library-mode" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <div style={{ padding: '32px 32px 16px 32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '24px', color: 'var(--text-primary)' }}>{t('myLibrary')}</h1>
        
        {/* Dashboard Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          
          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff6b9d' }}>
               <Heart size={20} fill="currentColor" />
               <h3 style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('likedSongs')}</h3>
             </div>
             <div style={{ fontSize: '36px', fontWeight: '800' }}>{likedSongs.length} <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>Lagu</span></div>
             <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('favoriteCollectionDesc')}</div>
          </div>
          
          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
               <ListMusic size={20} />
               <h3 style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('recentlyPlayed')}</h3>
             </div>
             <div style={{ fontSize: '36px', fontWeight: '800' }}>{playHistory.length} <span style={{fontSize: '16px', color: 'var(--text-secondary)', fontWeight: '600'}}>Lagu</span></div>
             <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('recentPlaybackDesc')}</div>
          </div>
          
          <div style={{ background: 'linear-gradient(135deg, #ff6b9d, #ff4785)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
             <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.15 }}>
               <Headphones size={100} />
             </div>
             <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', zIndex: 1, letterSpacing: '0.5px' }}>{t('myPersonalCollection').split('\n').map((line, i) => <span key={i}>{line}{i === 0 ? <br/> : ''}</span>)}</h3>
             <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', zIndex: 1, margin: 0, marginTop: '4px', lineHeight: '1.4' }}>{t('personalCollectionDesc')}</p>
          </div>
        </div>

        {likedSongs.length === 0 && playHistory.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '24px', color: 'var(--text-muted)' }}>
            <Music size={64} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <h3 style={{ color: 'var(--text-secondary)' }}>{t('noHistory')}</h3>
            <p style={{ fontSize: '13px' }}>{t('noHistoryDesc')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Liked Songs List */}
            {likedSongs.length > 0 && (
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}><Heart size={20} fill="#ff6b9d" color="#ff6b9d" /> {t('likedSongs')}</h2>
                  <span style={{ fontSize: '12px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '600' }} onClick={() => startPlayingFromList(likedSongs, 0)}>{t('playAll')}</span>
                </div>
                
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                    <span>#</span>
                    <span>{t('songDetail')}</span>
                    <span>{t('duration')}</span>
                    <span></span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                     {likedSongs.map((song, i) => (
                       <div key={i} className={`offline-row ${currentSong?.id === song.id ? 'active-row' : ''}`} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', padding: '12px 24px', alignItems: 'center', transition: 'background 0.2s', cursor: 'pointer', borderBottom: i === likedSongs.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)' }} onClick={() => startPlayingFromList(likedSongs, i)}>
                          <span style={{ color: currentSong?.id === song.id ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>{currentSong?.id === song.id ? <Play size={14} fill="currentColor" /> : String(i + 1).padStart(2, '0')}</span>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                             <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                               <img src={getCleanThumbnail(song.thumbnail)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cover" />
                               <div className="play-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                                 <Play fill="currentColor" size={16} />
                               </div>
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <span style={{ fontWeight: '600', fontSize: '14px', color: currentSong?.id === song.id ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {song.title}
                                  {downloadedSongs.some(ds => ds.id === song.id) && <span title="Tersedia Offline"><CheckCircle2 size={14} color="#23a559" /></span>}
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{song.artist}</span>
                             </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatTime(song.duration)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); toggleLike(song); }} style={{ color: '#ff6b9d' }}>
                              <Heart size={16} fill="currentColor" />
                            </button>
                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setAddToPlaylistSong(song); }} style={{ color: 'var(--text-secondary)' }}>
                              <FolderPlus size={16} />
                            </button>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
              </section>
            )}

            {/* Recently Played List */}
            {playHistory.length > 0 && (
              <section>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{t('recentlyPlayed')}</h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '600' }} onClick={() => { setPlayHistory([]); showToast(t('toastHistoryCleared')); }}>{t('clearHistory')}</span>
                </div>
                
                <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                    <span>#</span>
                    <span>{t('songDetail')}</span>
                    <span>{t('duration')}</span>
                    <span></span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                     {playHistory.map((song, i) => (
                       <div key={i} className={`offline-row ${currentSong?.id === song.id ? 'active-row' : ''}`} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', padding: '12px 24px', alignItems: 'center', transition: 'background 0.2s', cursor: 'pointer', borderBottom: i === playHistory.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)' }} onClick={() => playSingleSong(song)}>
                          <span style={{ color: currentSong?.id === song.id ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>{currentSong?.id === song.id ? <Play size={14} fill="currentColor" /> : String(i + 1).padStart(2, '0')}</span>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                             <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                               <img src={getCleanThumbnail(song.thumbnail)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cover" />
                               <div className="play-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                                 <Play fill="currentColor" size={16} />
                               </div>
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <span style={{ fontWeight: '600', fontSize: '14px', color: currentSong?.id === song.id ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{song.title}</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{song.artist}</span>
                             </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatTime(song.duration)}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); toggleLike(song); }} style={{ color: isLiked(song.id) ? '#ff6b9d' : 'var(--text-secondary)' }}>
                              <Heart size={16} fill={isLiked(song.id) ? 'currentColor' : 'none'} />
                            </button>
                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setAddToPlaylistSong(song); }} style={{ color: 'var(--text-secondary)' }}>
                              <FolderPlus size={16} />
                            </button>
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <style>{`
        .offline-row:hover { background: var(--bg-card-hover) !important; }
        .offline-row:hover .play-overlay { opacity: 1 !important; }
        .active-row { background: rgba(var(--accent-primary-rgb), 0.05); }
      `}</style>
    </div>
  );

  const renderPlaylistPage = () => {
    if (activePage === 'playlist-detail' && activePlaylistId) {
      const pl = playlists.find(p => p.id === activePlaylistId);
      if (!pl) return null;
      return (
        <div className="page-content">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <div
                className="playlist-avatar-large"
                style={{ width: '120px', height: '120px', borderRadius: '8px', backgroundColor: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
                onClick={() => { setAvatarUrlInput(pl.avatar || ''); setShowAvatarPrompt(true); }}
              >
                {pl.avatar ? (
                  <img 
                    src={pl.avatar} 
                    alt="Avatar" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    onError={(e) => {
                      if (pl.songs.length > 0) {
                        e.currentTarget.src = getCleanThumbnail(pl.songs[0].thumbnail);
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                ) : (
                  <ListMusic size={48} color="var(--text-muted)" />
                )}
                <div className="avatar-overlay" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('changeImage')}</span>
                </div>
              </div>

              <div>
                {isEditingPlaylistName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="text"
                      value={editPlaylistNameValue}
                      onChange={e => setEditPlaylistNameValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEditPlaylistName(pl.id)}
                      autoFocus
                      className="modal-input"
                      style={{ fontSize: '24px', fontWeight: 'bold', width: '300px', marginBottom: 0 }}
                    />
                    <button className="btn-primary" onClick={() => handleEditPlaylistName(pl.id)}>{t('save')}</button>
                    <button className="btn-secondary" onClick={() => setIsEditingPlaylistName(false)}>{t('cancel')}</button>
                  </div>
                ) : (
                  <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {pl.name}
                    <button className="btn-icon" onClick={() => { setEditPlaylistNameValue(pl.name); setIsEditingPlaylistName(true); }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                  </h1>
                )}
                <p className="page-subtitle">{pl.songs.length} {t('songs')}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
              {pl.songs.length > 0 && (
                <button className="btn-primary" onClick={() => startPlayingFromList(pl.songs, 0)}>
                  <Play size={16} fill="currentColor" /> {t('playAll')}
                </button>
              )}
              <button className="btn-secondary" onClick={() => setPlaylistToDelete(pl.id)} style={{ color: '#ff5555' }}>
                <Trash2 size={16} /> {t('deletePlaylist')}
              </button>
            </div>
          </div>
          {pl.songs.length > 0 ? (
            <div className="library-list">
              {pl.songs.map((song, i) => (
                <div key={i} className={`library-item ${currentSong?.id === song.id ? 'playing' : ''}`}>
                  <div className="library-item-art" onClick={() => startPlayingFromList(pl.songs, i)}>
                    <img src={getCleanThumbnail(song.thumbnail)} alt={song.title} />
                    <div className="library-item-play"><Play size={16} fill="currentColor" /></div>
                  </div>
                  <div className="library-item-info" onClick={() => startPlayingFromList(pl.songs, i)}>
                    <div className="library-item-title" title={song.title}>{song.title}</div>
                    <div className="library-item-artist">{song.artist}</div>
                  </div>
                  <div className="library-item-duration">{formatTime(song.duration)}</div>
                  <button className="library-item-action" onClick={() => removeSongFromPlaylist(pl.id, song.id)} title="Hapus dari playlist">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <ListMusic size={64} color="var(--text-muted)" />
              <h3>{t('noPlaylists')}</h3>
              <p>{t('addSongs')}</p>
            </div>
          )}

          {/* Search bar inside playlist */}
          <div className="playlist-search-section" style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>{t('addSongToPlaylistLabel')}</h2>
            <form onSubmit={handlePlaylistSearch} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={playlistSearchQuery}
                onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                className="search-input"
                style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
              />
              <button type="submit" className="btn-primary" disabled={isPlaylistSearching}>
                {isPlaylistSearching ? '...' : t('addSongs')}
              </button>
            </form>

            {playlistSearchResults.length > 0 && (
              <div className="library-list">
                {playlistSearchResults.map((song, i) => (
                  <div key={i} className="library-item">
                    <div className="library-item-art">
                      <img src={getCleanThumbnail(song.thumbnail)} alt={song.title} />
                    </div>
                    <div className="library-item-info">
                      <div className="library-item-title" title={song.title}>{song.title}</div>
                      <div className="library-item-artist">{song.artist}</div>
                    </div>
                    <div className="library-item-duration">{formatTime(song.duration)}</div>
                    <button
                      className="btn-secondary"
                      onClick={() => addSongToPlaylist(pl.id, song)}
                      disabled={pl.songs.some(s => s.id === song.id)}
                    >
                      {pl.songs.some(s => s.id === song.id) ? t('toastAddedToPlaylist') : t('addSongs')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      );
    }

    return (
      <div className="page-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>{t('myLibrary')}</h1>
            <p className="page-subtitle">{playlists.length} {t('playlist')}</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreatePlaylist(true)}>
            <Plus size={16} /> {t('createPlaylist')}
          </button>
        </div>
        {playlists.length > 0 ? (
          <div className="playlist-grid">
            {playlists.map(pl => (
              <div key={pl.id} className="playlist-card" onClick={() => { setActivePlaylistId(pl.id); setActivePage('playlist-detail'); }}>
                <div className="playlist-card-art">
                  {pl.avatar ? (
                    <img src={pl.avatar} alt={pl.name} />
                  ) : pl.songs.length > 0 ? (
                    <img src={getCleanThumbnail(pl.songs[0].thumbnail)} alt={pl.name} />
                  ) : (
                    <div className="playlist-card-empty-art"><ListMusic size={32} color="var(--text-muted)" /></div>
                  )}
                  <div className="playlist-card-play"><Play size={20} fill="currentColor" /></div>
                </div>
                <div className="playlist-card-name">{pl.name}</div>
                <div className="playlist-card-count">{pl.songs.length} {t('songs')}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <ListMusic size={64} color="var(--text-muted)" />
            <h3>{t('noPlaylists')}</h3>
            <p>{t('noPlaylistsDesc')}</p>
          </div>
        )}
      </div>
    );
  };

  const renderSettingsPage = () => (
    <div className="page-content">
      <div className="page-header">
        <h1>{t('settingsTitle')}</h1>
      </div>

      {updateInfo.available && (
        <div className="settings-section" style={{ background: 'rgba(35, 165, 89, 0.1)', border: '1px solid rgba(35, 165, 89, 0.3)' }}>
          <div className="settings-section-title" style={{ color: '#23a559' }}>
            <DownloadCloud size={20} style={{ marginRight: 8 }} /> Pembaruan Tersedia
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <div style={{ color: 'var(--text-secondary)' }}>
              {updateInfo.error ? (
                <span style={{ color: '#f23f43' }}>Error: {updateInfo.error}</span>
              ) : updateInfo.ready ? (
                'Pembaruan telah selesai diunduh dan siap dipasang!'
              ) : updateInfo.downloading ? (
                `Mengunduh pembaruan... ${Math.round(updateInfo.progress)}%`
              ) : (
                'Versi terbaru Don Pollo Music telah tersedia.'
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              {updateInfo.downloading ? (
                <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${updateInfo.progress}%`, height: '100%', background: '#23a559', transition: 'width 0.2s' }} />
                </div>
              ) : updateInfo.ready ? (
                <button className="btn-primary" style={{ background: '#23a559' }} onClick={() => (window as any).electronAPI.installUpdate()}>
                  Mulai Ulang Aplikasi
                </button>
              ) : (
                <button className="btn-primary" onClick={() => { (window as any).electronAPI.downloadUpdate(); setUpdateInfo(prev => ({ ...prev, downloading: true })); }}>
                  Unduh Sekarang
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!updateInfo.available && !updateInfo.downloading && !updateInfo.ready && (
        <div className="settings-section">
          <div className="settings-section-title">
            <DownloadCloud size={18} style={{ marginRight: 8 }} /> Pembaruan Aplikasi
          </div>
          <div className="settings-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="settings-item-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div className="settings-item-title">{t('manualUpdateCheck')}</div>
              <div className="settings-item-desc" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {t('manualUpdateDesc')}
                {updateInfo.checkMsg && (
                   <span style={{ 
                     color: updateInfo.checkMsg.includes('Error') ? '#f23f43' : 'var(--accent-primary)',
                     fontSize: '0.95em',
                     fontWeight: 500
                   }}>
                     {updateInfo.checkMsg}
                   </span>
                )}
              </div>
            </div>
            <button className="btn-secondary" style={{ whiteSpace: 'nowrap' }} disabled={updateInfo.isChecking} onClick={async () => {
              try {
                setUpdateInfo(prev => ({ ...prev, isChecking: true, checkMsg: t('checkingUpdate') }));
                const hasUpdate = await (window as any).electronAPI.checkForUpdates();
                if (!hasUpdate) {
                   setUpdateInfo(prev => ({ ...prev, isChecking: false, checkMsg: t('alreadyLatest') }));
                } else {
                   setUpdateInfo(prev => ({ ...prev, isChecking: false, checkMsg: '' }));
                }
              } catch (err: any) {
                let errorMsg = err.message || err;
                if (typeof errorMsg === 'string' && errorMsg.includes('No published versions on GitHub')) {
                   errorMsg = t('noPublishedVersions');
                }
                setUpdateInfo(prev => ({ ...prev, isChecking: false, checkMsg: `Error: ${errorMsg}` }));
              }
            }}>
              {t('manualUpdateCheck')}
            </button>
          </div>
        </div>
      )}

      {/* Tema Tampilan */}
      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Paintbrush size={20} color="var(--accent-primary)" /> {t('themeDisplay')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
          {[
            { id: 'default', name: t('themeDefault'), desc: t('themeDefaultDesc') },
            { id: 'minimalist', name: t('themeMinimalist'), desc: t('themeMinimalistDesc') }
          ].map(theme => (
            <button 
              key={theme.id}
              onClick={() => {
                const newSettings = { ...settings, theme: theme.id };
                setSettings(newSettings);
                localStorage.setItem('donpollo_settings', JSON.stringify(newSettings));
              }}
              style={{ 
                background: settings.theme === theme.id ? 'var(--accent-primary)' : 'var(--bg-card)', 
                color: settings.theme === theme.id ? 'var(--accent-text, #ffffff)' : 'var(--text-primary)',
                border: `1px solid ${settings.theme === theme.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{theme.name}</div>
              <div style={{ fontSize: '11px', opacity: 0.8 }}>{theme.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Akun Discord */}
      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserCircle size={20} color="var(--accent-primary)" /> {t('accountSection')}</div>
        {discordUser ? (
          <div className="settings-account-card">
            {getDiscordAvatar(discordUser) ? (
              <img src={getDiscordAvatar(discordUser)!} alt="avatar" className="settings-avatar" />
            ) : (
              <div className="settings-avatar-placeholder">{(discordUser.global_name || discordUser.username).charAt(0).toUpperCase()}</div>
            )}
            <div className="settings-account-info">
              <div className="settings-account-name">{discordUser.global_name || discordUser.username}</div>
              <div className="settings-account-sub">@{discordUser.username}#{discordUser.discriminator} • Disocrd</div>
            </div>
            <button className="btn-secondary" onClick={logoutDiscord} style={{ marginLeft: 'auto' }}>
              <LogOut size={16} /> {t('logout')}
            </button>
          </div>
        ) : (
          <div className="settings-account-card">
            <div className="settings-avatar-placeholder" style={{ background: '#5865F2' }}>
              <svg width="24" height="24" viewBox="0 0 127.14 96.36" fill="white">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
              </svg>
            </div>
            <div className="settings-account-info">
              <div className="settings-account-name">{t('notLoggedIn')}</div>
              <div className="settings-account-sub">{t('loginToSync')}</div>
            </div>
            <button className="btn-primary" onClick={loginWithDiscord} style={{ marginLeft: 'auto' }}>
              <LogIn size={16} /> {t('loginDiscord')}
            </button>
          </div>
        )}
      </div>

      {/* Bahasa */}
      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Globe size={20} color="var(--accent-primary)" /> {t('languageSection')}</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">{t('languageLabel')}</div>
            <div className="settings-desc">{t('languageDesc')}</div>
          </div>
          <div className="language-picker">
            {(['id', 'en', 'ja'] as Language[]).map(lang => (
              <button
                key={lang}
                className={`lang-btn ${language === lang ? 'active' : ''}`}
                onClick={() => setLanguage(lang)}
              >
                <img src={lang === 'id' ? 'https://flagcdn.com/id.svg' : lang === 'en' ? 'https://flagcdn.com/us.svg' : 'https://flagcdn.com/jp.svg'} alt={lang} />
                {lang === 'id' ? 'Indonesia' : lang === 'en' ? 'English' : '日本語'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audio */}
      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Volume2 size={20} color="var(--accent-primary)" /> {t('audioSection')}</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">{t('defaultVolume')}</div>
            <div className="settings-desc">{t('defaultVolumeDesc')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{Math.round(volume * 100)}%</span>
            <input type="range" min="0" max="1" step="0.01" value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              style={{ width: '120px', accentColor: 'var(--accent-primary)' }} />
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">{t('audioQuality')}</div>
            <div className="settings-desc">{t('audioQualityDesc')}</div>
          </div>
          <select className="settings-select"
            value={settings.audioQuality || 'auto'}
            onChange={e => setSettings((p: any) => ({ ...p, audioQuality: e.target.value }))}>
            <option value="auto">{t('qualityAuto')}</option>
            <option value="high">{t('qualityHigh')}</option>
            <option value="medium">{t('qualityMedium')}</option>
          </select>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">{t('crossfadeLabel')}</div>
            <div className="settings-desc">{t('crossfadeDesc')}</div>
          </div>
          <select className="settings-select"
            value={localStorage.getItem('donpollo_crossfade') || '0'}
            onChange={e => {
              localStorage.setItem('donpollo_crossfade', e.target.value);
              setSettings((p: any) => ({ ...p, crossfade: e.target.value }));
            }}>
            <option value="0">{t('crossfadeOff')}</option>
            <option value="3">3 {t('crossfadeSec')}</option>
            <option value="5">5 {t('crossfadeSec')}</option>
            <option value="7">7 {t('crossfadeSec')}</option>
            <option value="10">10 {t('crossfadeSec')}</option>
          </select>
        </div>
      </div>

      {/* Tampilan */}
      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} color="var(--accent-primary)" /> {t('displaySection')}</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">{t('autoLyrics')}</div>
            <div className="settings-desc">{t('autoLyricsDesc')}</div>
          </div>
          <button className={`settings-toggle ${settings.autoLyrics ? 'on' : ''}`}
            onClick={() => setSettings((p: any) => ({ ...p, autoLyrics: !p.autoLyrics }))}>
            {settings.autoLyrics && <Check size={14} />}
          </button>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">{t('autoSidebar')}</div>
            <div className="settings-desc">{t('autoSidebarDesc')}</div>
          </div>
          <button className={`settings-toggle ${settings.autoSidebar !== false ? 'on' : ''}`}
            onClick={() => setSettings((p: any) => ({ ...p, autoSidebar: !(p.autoSidebar !== false) }))}>
            {settings.autoSidebar !== false && <Check size={14} />}
          </button>
        </div>

        <div className="settings-row">
          <div>
            <div className="settings-label">{t('closeToTray')}</div>
            <div className="settings-desc">{t('closeToTrayDesc')}</div>
          </div>
          <button className={`settings-toggle ${settings.closeToTray ? 'on' : ''}`}
            onClick={() => {
              const newVal = !settings.closeToTray;
              setSettings((p: any) => ({ ...p, closeToTray: newVal }));
              if ((window as any).electronAPI?.setCloseToTray) {
                 (window as any).electronAPI.setCloseToTray(newVal);
              }
            }}>
            {settings.closeToTray && <Check size={14} />}
          </button>
        </div>
      </div>

      {/* Audio & Equalizer */}
      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Headphones size={20} color="var(--accent-primary)" /> {t('equalizer')}</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">{t('eqEnabled')}</div>
            <div className="settings-desc">{t('eqEnabledDesc')}</div>
          </div>
          <button className={`settings-toggle ${settings.eqEnabled ? 'on' : ''}`}
            onClick={() => setSettings((p: any) => ({ ...p, eqEnabled: !p.eqEnabled }))}>
            {settings.eqEnabled && <Check size={14} />}
          </button>
        </div>
        {settings.eqEnabled && (
          <div className="settings-eq-container" style={{ position: 'relative', marginTop: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                 <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Preset</span>
                 <select 
                    className="settings-select"
                    style={{ padding: '4px 8px', fontSize: '12px', minWidth: '120px' }}
                    value={
                      (() => {
                        const b = (settings.eqBands || [0,0,0,0,0]).join(',');
                        if (b === '0,0,0,0,0') return 'default';
                        if (b === '6,4,0,-2,-4') return 'bass_booster';
                        if (b === '-2,2,4,3,-1') return 'pop';
                        if (b === '4,3,-1,2,5') return 'electronic';
                        if (b === '3,1,0,1,3') return 'acoustic';
                        return 'custom';
                      })()
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      let newBands = [...(settings.eqBands || [0,0,0,0,0])];
                      if (v === 'default') newBands = [0,0,0,0,0];
                      if (v === 'bass_booster') newBands = [6,4,0,-2,-4];
                      if (v === 'pop') newBands = [-2,2,4,3,-1];
                      if (v === 'electronic') newBands = [4,3,-1,2,5];
                      if (v === 'acoustic') newBands = [3,1,0,1,3];
                      setSettings((p: any) => ({ ...p, eqBands: newBands }));
                    }}
                 >
                    <option value="custom">Custom</option>
                    <option value="default">Default (Flat)</option>
                    <option value="bass_booster">Bass Booster</option>
                    <option value="pop">Pop</option>
                    <option value="electronic">Electronic</option>
                    <option value="acoustic">Acoustic</option>
                 </select>
               </div>
               <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>+12dB</span>
            </div>
            
            <div style={{ position: 'relative', height: '180px', width: '100%', marginBottom: '8px' }}>
              {/* SVG Background Curve */}
              <svg viewBox="0 0 1000 180" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }} preserveAspectRatio="none">
                <defs>
                  <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1db954" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#1db954" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={(() => {
                  const bands = settings.eqBands || [0,0,0,0,0];
                  let path = "";
                  const points = bands.map((val: number, i: number) => ({
                    x: 100 + (i * 200),
                    y: 90 - (val / 12) * 75
                  }));
                  path += `M 0,180 L 0,${points[0].y} L ${points[0].x},${points[0].y} `;
                  for (let i = 1; i < points.length; i++) {
                    const p0 = points[i-1];
                    const p1 = points[i];
                    const dx = (p1.x - p0.x) / 2;
                    path += `C ${p0.x + dx},${p0.y} ${p1.x - dx},${p1.y} ${p1.x},${p1.y} `;
                  }
                  path += `L 1000,${points[points.length-1].y} L 1000,180 Z`;
                  return path;
                })()} fill="url(#eqGrad)" />
                <path d={(() => {
                  const bands = settings.eqBands || [0,0,0,0,0];
                  let path = "";
                  const points = bands.map((val: number, i: number) => ({
                    x: 100 + (i * 200),
                    y: 90 - (val / 12) * 75
                  }));
                  path += `M 0,${points[0].y} L ${points[0].x},${points[0].y} `;
                  for (let i = 1; i < points.length; i++) {
                    const p0 = points[i-1];
                    const p1 = points[i];
                    const dx = (p1.x - p0.x) / 2;
                    path += `C ${p0.x + dx},${p0.y} ${p1.x - dx},${p1.y} ${p1.x},${p1.y} `;
                  }
                  path += `L 1000,${points[points.length-1].y}`;
                  return path;
                })()} fill="none" stroke="#1db954" strokeWidth="3" />
                
                {/* Reference lines */}
                <line x1="0" y1="90" x2="1000" y2="90" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                {Array.from({length: 5}).map((_, i) => (
                  <line key={i} x1={100 + (i * 200)} y1="0" x2={100 + (i * 200)} y2="180" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                ))}
              </svg>
              
              {/* Sliders Overlaid */}
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2 }}>
                {['60Hz', '150Hz', '400Hz', '1kHz', '15kHz'].map((label, i) => (
                  <div key={label} style={{ position: 'absolute', left: `${10 + i * 20}%`, transform: 'translateX(-50%)', height: '100%', width: '30px' }}>
                    <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
                      <input type="range" min="-12" max="12" step="0.1" 
                        value={(settings.eqBands || [0,0,0,0,0])[i]}
                        onChange={(e) => {
                           const newBands = [...(settings.eqBands || [0,0,0,0,0])];
                           newBands[i] = parseFloat(e.target.value);
                           setSettings((p: any) => ({ ...p, eqBands: newBands }));
                        }}
                        style={{ 
                          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)',
                          width: '180px', height: '20px', margin: 0, opacity: 0, cursor: 'pointer', zIndex: 3
                        }} 
                      />
                      {/* Fake Knob */}
                      <div style={{ 
                        position: 'absolute', left: '50%', transform: 'translate(-50%, -50%)',
                        top: `${(1 - (((settings.eqBands || [0,0,0,0,0])[i] + 12) / 24)) * 100}%`,
                        width: '14px', height: '14px', borderRadius: '50%', background: '#fff', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)', pointerEvents: 'none'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
               <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>-12dB</span>
            </div>
            <div style={{ position: 'relative', width: '100%', height: '20px' }}>
              {['60Hz', '150Hz', '400Hz', '1kHz', '15kHz'].map((label, i) => (
                <span key={label} style={{ position: 'absolute', left: `${10 + i * 20}%`, transform: 'translateX(-50%)', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: '600' }}>{label}</span>
              ))}
            </div>
          </div>
        )}
      </div>



      {/* Data */}
      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Library size={20} color="var(--accent-primary)" /> {t('dataSection')}</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">{t('playHistory')}</div>
            <div className="settings-desc">{playHistory.length} {t('savedSongs')}</div>
          </div>
          <button className="btn-secondary" onClick={() => { setPlayHistory([]); showToast(t('toastHistoryCleared')); }}>
            <Trash2 size={14} /> {t('clearHistory')}
          </button>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">{t('playlist')}</div>
            <div className="settings-desc">{playlists.length} {t('playlistCount')}</div>
          </div>
          <button className="btn-secondary" onClick={() => { setPlaylists([]); showToast(t('toastHistoryCleared')); }}>
            <Trash2 size={14} /> {t('deleteAllPlaylists')}
          </button>
        </div>
        <div className="settings-row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, paddingRight: '16px' }}>
            <div className="settings-label">{t('cacheModeLabel')}</div>
            <div className="settings-desc">{t('cacheModeDesc')}</div>
            
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="cacheMode" value="smart" 
                  checked={!settings.cacheMode || settings.cacheMode === 'smart'}
                  onChange={() => {
                    setSettings((p: any) => ({...p, cacheMode: 'smart'}));
                    localStorage.setItem('donpollo_settings', JSON.stringify({...settings, cacheMode: 'smart'}));
                  }} 
                  style={{ marginTop: '4px' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={16} color="var(--accent-primary)" /> {t('cacheModeSmartCache')}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('cacheModeSmartCacheDesc')}</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="cacheMode" value="stream" 
                  checked={settings.cacheMode === 'stream'}
                  onChange={() => {
                    setSettings((p: any) => ({...p, cacheMode: 'stream'}));
                    localStorage.setItem('donpollo_settings', JSON.stringify({...settings, cacheMode: 'stream'}));
                  }} 
                  style={{ marginTop: '4px' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Radio size={16} color="var(--accent-primary)" /> {t('cacheModeStream')}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('cacheModeStreamDesc')}</div>
                </div>
              </label>
              
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="cacheMode" value="temp" 
                  checked={settings.cacheMode === 'temp'}
                  onChange={() => {
                    setSettings((p: any) => ({...p, cacheMode: 'temp'}));
                    localStorage.setItem('donpollo_settings', JSON.stringify({...settings, cacheMode: 'temp'}));
                  }} 
                  style={{ marginTop: '4px' }}
                />
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Timer size={16} color="var(--accent-primary)" /> {t('cacheModeTemp')}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('cacheModeTempDesc')}</div>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">{t('clearAudioCache')}</div>
            <div className="settings-desc">{t('audioCacheDesc')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              {(cacheSize / (1024 * 1024)).toFixed(1)} MB
            </span>
            <button className="btn-secondary" onClick={handleClearCache}>
              <Trash2 size={14} /> {t('delete')}
            </button>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">{t('appVersion')}</div>
            <div className="settings-desc">Don Pollo Music Desktop</div>
          </div>
          {/* @ts-ignore */}
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>v{__APP_VERSION__ || '1.0.0-BETA'}</span>
        </div>
      </div>
    </div>
  );


  const renderDownloadsPage = () => (
    <div className="page-content offline-mode" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <div style={{ padding: '32px 32px 16px 32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '24px', color: 'var(--text-primary)' }}>{t('offlineVault')}</h1>
        
        {/* Dashboard Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          
          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
               <DownloadCloud size={20} />
               <h3 style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('localCollection')}</h3>
             </div>
             <div style={{ fontSize: '36px', fontWeight: '800' }}>{downloadedSongs.length} <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>{t('songs')}</span></div>
             <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('availableOffline')}</div>
          </div>
          
          <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
               <Database size={20} />
               <h3 style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('storage')}</h3>
             </div>
             <div style={{ fontSize: '36px', fontWeight: '800' }}>{(cacheSize / (1024 * 1024)).toFixed(1)} <span style={{fontSize: '16px', color: 'var(--text-secondary)', fontWeight: '600'}}>MB</span></div>
             <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('totalStorageUsed')}</div>
          </div>
          
          <div style={{ background: 'linear-gradient(135deg, #00c6ff, #0072ff)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
             <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.15 }}>
               <WifiOff size={100} />
             </div>
             <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', zIndex: 1, letterSpacing: '0.5px' }}>{t('listenUnlimited').split('\n').map((line, i) => <span key={i}>{line}{i === 0 ? <br/> : ''}</span>)}</h3>
             <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', zIndex: 1, margin: 0, marginTop: '4px', lineHeight: '1.4' }}>{t('listenUnlimitedDesc')}</p>
          </div>

        </div>

        {/* List Section */}
        {downloadedSongs.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '24px', color: 'var(--text-muted)' }}>
            <FolderPlus size={64} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <h3 style={{ color: 'var(--text-secondary)' }}>Belum ada unduhan</h3>
            <p style={{ fontSize: '13px' }}>Lagu yang selesai diputar akan ter-cache dan muncul di sini.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <section>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}><FolderPlus size={20} color="#00c6ff" /> Unduhan Offline</h2>
                <span style={{ fontSize: '12px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '600' }} onClick={() => startPlayingFromList(downloadedSongs, 0)}>{t('playAll')}</span>
              </div>
              
              <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                  <span>#</span>
                  <span>{t('songDetail')}</span>
                  <span>{t('duration')}</span>
                  <span></span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                   {downloadedSongs.map((song, i) => (
                     <div key={i} className={`offline-row ${currentSong?.id === song.id ? 'active-row' : ''}`} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', padding: '12px 24px', alignItems: 'center', transition: 'background 0.2s', cursor: 'pointer', borderBottom: i === downloadedSongs.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)' }} onClick={() => startPlayingFromList(downloadedSongs, i)}>
                        <span style={{ color: currentSong?.id === song.id ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>{currentSong?.id === song.id ? <Play size={14} fill="currentColor" /> : String(i + 1).padStart(2, '0')}</span>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                           <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                             <img src={getCleanThumbnail(song.thumbnail) || getHighResImage(song.cover)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cover" />
                             <div className="play-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                               <Play fill="currentColor" size={16} />
                             </div>
                           </div>
                           <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                              <span style={{ fontWeight: '600', fontSize: '14px', color: currentSong?.id === song.id ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {song.title}
                                <span title="Tersedia Offline"><CheckCircle2 size={14} color="#23a559" /></span>
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{song.artist}</span>
                           </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatTime(song.duration)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-icon delete-btn" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if ((window as any).electronAPI) {
                                (window as any).electronAPI.deleteDownloadedSong(song.id).then(() => {
                                  setDownloadedSongs(prev => prev.filter(s => s.id !== song.id));
                                });
                              }
                            }}
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4d4d'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      <style>{`
        .offline-row:hover { background: var(--bg-card-hover); }
        .offline-row:hover .play-overlay { opacity: 1 !important; }
      `}</style>
    </div>
  );

  const renderArtistPage = () => {
    return (
      <div className="main-scroll artist-page" style={{ position: 'relative' }}>
        {artistSongs.length > 0 && (
          <div className="artist-hero-mosaic">
            <div className="mosaic-grid">
              {artistSongs.slice(0, 30).map((song, i) => (
                <img key={i} src={getCleanThumbnail(song.thumbnail)} alt="" />
              ))}
            </div>
            <div className="mosaic-overlay" />
          </div>
        )}
        <div className="artist-hero" style={{ position: 'relative', zIndex: 1 }}>
        <div className="artist-hero-info">
          <h1 className="artist-hero-name">{activeArtist}</h1>
          <p className="artist-hero-label">{t('artistPage')}</p>
          <div className="artist-hero-actions">
            <button className="btn-primary" onClick={() => {
              if (artistSongs.length > 0) startPlayingFromList(artistSongs, 0);
            }}>
              <Play size={20} fill="currentColor" /> {t('playAll')}
            </button>
            <div className="artist-filters">
              <button 
                className={`filter-btn ${artistFilter === 'popular' ? 'active' : ''}`}
                onClick={() => {
                  setArtistFilter('popular');
                  if (activeArtist) fetchArtistSongs(activeArtist, 'popular');
                }}
              >
                {t('filterPopular')}
              </button>
              <button 
                className={`filter-btn ${artistFilter === 'newest' ? 'active' : ''}`}
                onClick={() => {
                  setArtistFilter('newest');
                  if (activeArtist) fetchArtistSongs(activeArtist, 'newest');
                }}
              >
                {t('filterNewest')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="artist-content" style={{ position: 'relative', zIndex: 1 }}>
        {isArtistLoading ? (
          <div className="loading-state">
            <Loader2 size={48} className="spin-icon" />
            <p>{t('loadingSongs')}</p>
          </div>
        ) : artistSongs.length > 0 ? (
          <div className="song-list-container">
            {artistSongs.map((song, idx) => (
              <div 
                key={idx} 
                className={`song-row ${currentSong?.id === song.id ? 'active' : ''}`}
                onClick={() => playSingleSong(song)}
                onContextMenu={(e) => handleContextMenu(e, song)}
              >
                <div className="song-index">
                  {currentSong?.id === song.id && isPlaying ? (
                    <div className="playing-eq"><div/><div/><div/></div>
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                  <div className="play-overlay"><Play size={12} fill="currentColor"/></div>
                </div>
                <div className="song-thumb-wrapper">
                  <img src={getCleanThumbnail(song.thumbnail)} alt={song.title} className="song-thumb" />
                </div>
                <div className="song-info">
                  <div className="song-title">{song.title}</div>
                  <div className="song-artist" onClick={(e) => {
                    e.stopPropagation();
                  }}>{song.artist}</div>
                </div>
                <div className="song-duration">{song.duration ? formatTime(song.duration) : ''}</div>
                <div className="song-actions">
                  <button className={`action-btn ${isLiked(song.id) ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleLike(song); }}>
                    <Heart size={16} fill={isLiked(song.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : !isArtistLoading ? (
          <div className="empty-state">
            <Music size={40} />
            <p>{t('noResults')}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

  const renderHomePage = () => (
    <div className="main-scroll">
      {searchResults.length === 0 ? (
        <div className="home-dashboard">

          {/* ── Greeting ─────────────────────────────── */}
          <div className="home-greeting">
            <span className="greeting-text">{getGreeting()}</span>
            <span className="greeting-date">
              {new Date().toLocaleDateString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* ── Bento Featured Grid (Daily Mix) ──────── */}
          {(() => {
            const getDailyMix = () => {
              const mix: any[] = [];
              if (playHistory.length > 0) mix.push({ ...playHistory[0], bentoTag: 'JUMP BACK IN', tagClass: 'tag-hero' });
              else if (hitsInternational.length > 0) mix.push({ ...hitsInternational[0], bentoTag: 'TOP PICK', tagClass: 'tag-hero' });

              const favs = likedSongs.filter(s => s.id !== mix[0]?.id).slice(0, 2);
              favs.forEach(s => mix.push({ ...s, bentoTag: 'FAVORITE', tagClass: 'tag-fav' }));

              const recs = playHistory.length > 0 ? recommendations : hitsInternational;
              const usableRecs = recs.filter(s => !mix.some(m => m.id === s.id)).slice(0, 2);
              usableRecs.forEach(s => mix.push({ ...s, bentoTag: 'SUGGESTED', tagClass: 'tag-sug' }));

              const historyFill = playHistory.length > 0 ? playHistory.filter(s => !mix.some(m => m.id === s.id)) : hitsInternational.filter(s => !mix.some(m => m.id === s.id));
              while (mix.length < 5 && historyFill.length > 0) {
                mix.push({ ...historyFill.shift(), bentoTag: playHistory.length > 0 ? 'RECENTLY PLAYED' : 'TRENDING', tagClass: 'tag-recent' });
              }
              return mix;
            };

            const dailyMix = getDailyMix();
            if (dailyMix.length === 0) return null;

            return (
              <div className="bento-grid">
                {/* Hero card */}
                <div
                  className={`bento-card bento-hero ${currentSong?.id === dailyMix[0].id ? 'bento-active' : ''}`}
                  onClick={() => startPlayingFromList(dailyMix, 0)}
                  onContextMenu={(e) => handleContextMenu(e, dailyMix[0])}
                >
                  <img src={getCleanThumbnail(dailyMix[0].thumbnail)} alt={dailyMix[0].title} className="bento-img" />
                  <div className="bento-gradient" />
                  <div className={`bento-tag ${dailyMix[0].tagClass}`}>{dailyMix[0].bentoTag}</div>
                  <div className="bento-meta">
                    <div className="bento-title-lg">{dailyMix[0].title}</div>
                    <div className="bento-artist-lg">{dailyMix[0].artist}</div>
                  </div>
                  <button className="bento-play-btn" onClick={(e) => { e.stopPropagation(); startPlayingFromList(dailyMix, 0); }}>
                    {currentSong?.id === dailyMix[0].id && isPlaying
                      ? <Pause size={20} fill="currentColor" />
                      : <Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} />}
                  </button>
                </div>

                {/* Mini cards */}
                {dailyMix.slice(1, 5).map((item, i) => (
                  <div
                    key={i}
                    className={`bento-card bento-mini ${currentSong?.id === item.id ? 'bento-active' : ''}`}
                    onClick={() => startPlayingFromList(dailyMix, i + 1)}
                    onContextMenu={(e) => handleContextMenu(e, item)}
                  >
                    <img src={getCleanThumbnail(item.thumbnail)} alt={item.title} className="bento-img" />
                    <div className="bento-gradient" />
                    <div className={`bento-tag ${item.tagClass}`}>{item.bentoTag}</div>
                    <div className="bento-meta bento-meta-sm">
                      <div className="bento-title-sm">{item.title}</div>
                      <div className="bento-artist-sm">{item.artist}</div>
                    </div>
                    {currentSong?.id === item.id && isPlaying && (
                      <div className="bento-eq-badge">
                        <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── Recently Played ──────────────────────── */}
          {playHistory.length > 0 && (
            <section className="home-section">
              <div className="section-header-v2">
                <div className="section-header-left">
                  <div className="section-dot" />
                  <h2 className="section-title-v2">{t('recentlyPlayed')}</h2>
                </div>
                <span className="show-all" onClick={() => setIsRecentExpanded(!isRecentExpanded)}>
                  {isRecentExpanded ? t('showLess') : t('viewAll')}
                </span>
              </div>
              
              {isRecentExpanded ? (
                <div className="card-expanded-grid">
                  {playHistory.map((item, i) => (
                    <div
                      key={i}
                      className={`music-card-v2 ${currentSong?.id === item.id ? 'music-card-v2-playing' : ''}`}
                      onClick={() => playSingleSong(item)}
                      onContextMenu={(e) => handleContextMenu(e, item)}
                    >
                      <div className="card-v2-art">
                        <img src={getCleanThumbnail(item.thumbnail)} alt={item.title} />
                        {currentSong?.id === item.id && isPlaying ? (
                          <div className="card-v2-eq">
                            <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                          </div>
                        ) : (
                          <button className="card-v2-play-btn">
                            <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />
                          </button>
                        )}
                      </div>
                      <div className="card-v2-info">
                        <div className="card-v2-title" title={item.title}>{item.title}</div>
                        <div className="card-v2-artist">{item.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="slider-wrapper">
                  <button className="slider-nav-btn slider-nav-left" onClick={() => scrollSlider(recentScrollRef, 'left')} aria-label="Scroll left">
                    <ChevronLeft size={20} />
                  </button>
                  <div className="card-scroll-container" ref={recentScrollRef}>
                    {playHistory.map((item, i) => (
                      <div
                        key={i}
                        className={`music-card-v2 ${currentSong?.id === item.id ? 'music-card-v2-playing' : ''}`}
                        onClick={() => playSingleSong(item)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                      >
                        <div className="card-v2-art">
                          <img src={getCleanThumbnail(item.thumbnail)} alt={item.title} />
                          {currentSong?.id === item.id && isPlaying ? (
                            <div className="card-v2-eq">
                              <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                            </div>
                          ) : (
                            <button className="card-v2-play-btn">
                              <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />
                            </button>
                          )}
                        </div>
                        <div className="card-v2-info">
                          <div className="card-v2-title" title={item.title}>{item.title}</div>
                          <div className="card-v2-artist">{item.artist}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="slider-nav-btn slider-nav-right" onClick={() => scrollSlider(recentScrollRef, 'right')} aria-label="Scroll right">
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ── Discover / Recommendations ───────────── */}
          {playHistory.length > 0 && recommendations.length > 0 && (
            <section className="home-section">
              <div className="section-header-v2">
                <div className="section-header-left">
                  <div className="section-dot section-dot-cyan" />
                  <h2 className="section-title-v2">
                    {(() => {
                      if (playHistory.length === 0) return t('recommendations');
                      const item = playHistory[0];
                      let realArtist = item.artist || '';
                      if (item.title && item.title.includes(' - ')) {
                        realArtist = item.title.split(' - ')[0].trim();
                      }
                      return `${t('recommendations')} ${realArtist}`;
                    })()}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span className="show-all" onClick={() => setIsRecsExpanded(!isRecsExpanded)}>
                    {isRecsExpanded ? t('showLess') : t('viewAll')}
                  </span>
                  <span className="show-all" onClick={() => startPlayingFromList(recommendations, 0)}>{t('playAll')}</span>
                </div>
              </div>
              
              {isRecsExpanded ? (
                <div className="card-expanded-grid">
                  {recommendations.map((item, i) => (
                    <div
                      key={i}
                      className="music-card-circle"
                      onClick={() => startPlayingFromList(recommendations, i)}
                      onContextMenu={(e) => handleContextMenu(e, item)}
                    >
                      <div className="card-circle-art">
                        <img src={getCleanThumbnail(item.thumbnail)} alt={item.title} />
                        <div className="card-circle-overlay">
                          <button className="card-circle-play">
                            <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />
                          </button>
                        </div>
                      </div>
                      <div className="card-v2-info" style={{ textAlign: 'center' }}>
                        <div className="card-v2-title" style={{ justifyContent: 'center' }} title={item.title}>{item.title}</div>
                        <div className="card-v2-artist">{item.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="slider-wrapper">
                  <button className="slider-nav-btn slider-nav-left" onClick={() => scrollSlider(recsScrollRef, 'left')} aria-label="Scroll left">
                    <ChevronLeft size={20} />
                  </button>
                  <div className="card-scroll-container" ref={recsScrollRef}>
                    {recommendations.map((item, i) => (
                      <div
                        key={i}
                        className="music-card-circle"
                        onClick={() => startPlayingFromList(recommendations, i)}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                      >
                        <div className="card-circle-art">
                          <img src={getCleanThumbnail(item.thumbnail)} alt={item.title} />
                          <div className="card-circle-overlay">
                            <button className="card-circle-play">
                              <Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} />
                            </button>
                          </div>
                        </div>
                        <div className="card-v2-info" style={{ textAlign: 'center' }}>
                          <div className="card-v2-title" style={{ justifyContent: 'center' }} title={item.title}>{item.title}</div>
                          <div className="card-v2-artist">{item.artist}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="slider-nav-btn slider-nav-right" onClick={() => scrollSlider(recsScrollRef, 'right')} aria-label="Scroll right">
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ── Hits Sections ───────────── */}
          {(() => {
            const renderHitsSection = (title: string, songs: any[], ref: React.RefObject<HTMLDivElement | null>, dotClass: string, isExpanded: boolean, setIsExpanded: (val: boolean) => void) => {
              if (songs.length === 0) return null;
              return (
                <section className="home-section">
                  <div className="section-header-v2">
                    <div className="section-header-left">
                      <div className={`section-dot ${dotClass}`} />
                      <h2 className="section-title-v2">{title}</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span className="show-all" onClick={() => setIsExpanded(!isExpanded)}>{isExpanded ? t('showLess') : t('viewAll')}</span>
                      <span className="show-all" onClick={() => startPlayingFromList(songs, 0)}>{t('playAll')}</span>
                    </div>
                  </div>
                  
                  {isExpanded ? (
                    <div className="card-expanded-grid">
                      {songs.map((item, i) => (
                        <div key={i} className={`music-card-v2 ${currentSong?.id === item.id ? 'music-card-v2-playing' : ''}`} onClick={() => playSingleSong(item)} onContextMenu={(e) => handleContextMenu(e, item)}>
                          <div className="card-v2-art">
                            <img src={getCleanThumbnail(item.thumbnail)} alt={item.title} />
                            {currentSong?.id === item.id && isPlaying ? (
                              <div className="card-v2-eq"><div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" /></div>
                            ) : (
                              <button className="card-v2-play-btn"><Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} /></button>
                            )}
                          </div>
                          <div className="card-v2-info">
                            <div className="card-v2-title" title={item.title}>{item.title}</div>
                            <div className="card-v2-artist">{item.artist}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="slider-wrapper">
                      <button className="slider-nav-btn slider-nav-left" onClick={() => scrollSlider(ref, 'left')} aria-label="Scroll left"><ChevronLeft size={20} /></button>
                      <div className="card-scroll-container" ref={ref}>
                        {songs.map((item, i) => (
                          <div key={i} className={`music-card-v2 ${currentSong?.id === item.id ? 'music-card-v2-playing' : ''}`} onClick={() => playSingleSong(item)} onContextMenu={(e) => handleContextMenu(e, item)}>
                            <div className="card-v2-art">
                              <img src={getCleanThumbnail(item.thumbnail)} alt={item.title} />
                              {currentSong?.id === item.id && isPlaying ? (
                                <div className="card-v2-eq"><div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" /></div>
                              ) : (
                                <button className="card-v2-play-btn"><Play size={18} fill="currentColor" style={{ marginLeft: '2px' }} /></button>
                              )}
                            </div>
                            <div className="card-v2-info">
                              <div className="card-v2-title" title={item.title}>{item.title}</div>
                              <div className="card-v2-artist">{item.artist}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="slider-nav-btn slider-nav-right" onClick={() => scrollSlider(ref, 'right')} aria-label="Scroll right"><ChevronRight size={20} /></button>
                    </div>
                  )}
                </section>
              );
            };

            return (
              <>
                {localCountry && hitsLocal.length > 0 &&
                  renderHitsSection(`${t('trendingLocal')} ${localCountry.name} ${localCountry.flag}`, hitsLocal, localScrollRef, 'section-dot-cyan', isLocalExpanded, setIsLocalExpanded)}
                {renderHitsSection(t('hitsInt'), hitsInternational, intScrollRef, '', isIntExpanded, setIsIntExpanded)}
                {renderHitsSection(t('hitsId'), hitsIndonesia, idScrollRef, 'section-dot-green', isIdExpanded, setIsIdExpanded)}
                {renderHitsSection(t('hitsJp'), hitsJapan, jpScrollRef, 'section-dot-cyan', isJpExpanded, setIsJpExpanded)}
                {renderHitsSection(t('hitsKr'), hitsKorean, krScrollRef, 'section-dot-pink', isKrExpanded, setIsKrExpanded)}
                {renderHitsSection(t('hitsLatin'), hitsLatin, latinScrollRef, 'section-dot-yellow', isLatinExpanded, setIsLatinExpanded)}
              </>
            );
          })()}

        </div>
      ) : (
        <>
          <div className="hero-section">
            <div className="hero-art-container">
              <div className="hero-glow"></div>
              {currentSong ? (
                <img src={getCleanThumbnail(currentSong.thumbnail)} className="hero-art" alt="album art" />
              ) : searchResults.length > 0 ? (
                <img src={getCleanThumbnail(currentSong.thumbnail)} className="hero-art" alt="album art" />
              ) : (
                <div className="hero-art" style={{ backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Music size={64} color="var(--text-muted)" />
                </div>
              )}
            </div>
            <div className="hero-info">
              <div className="hero-tag">ALBUM</div>
              {currentSong ? (
                <>
                  <h1 className="hero-title" title={currentSong.title}>{currentSong.title}</h1>
                  <div className="hero-artist-row">
                    <UserCircle size={24} color="var(--accent-primary)" />
                    <span className="hero-artist-name">{currentSong.artist}</span>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                  <div className="hero-meta">YouTube Audio • 1 Song • {formatTime(currentSong.duration)}</div>
                  <div className="hero-buttons">
                    <button className="btn-primary" onClick={togglePlay}>
                      {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />} {isPlaying ? 'Pause' : 'Play'}
                    </button>
                    <button className="btn-secondary" onClick={toggleShuffle}>
                      <Shuffle size={16} color={isShuffled ? 'var(--accent-primary)' : 'currentColor'} /> Shuffle
                    </button>
                    <button className={`btn-secondary ${isLiked(currentSong.id) ? 'liked-btn' : ''}`} onClick={() => toggleLike(currentSong)}>
                      <Heart size={16} fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button className="btn-secondary" onClick={() => setAddToPlaylistSong(currentSong)}>
                      <FolderPlus size={16} />
                    </button>
                  </div>
                </>
              ) : searchResults.length > 0 ? (
                <>
                  <h1 className="hero-title">Search Results</h1>
                  <div className="hero-artist-row"><span className="hero-artist-name">YouTube</span></div>
                  <div className="hero-meta">{searchResults.length} Songs found</div>
                  <div className="hero-buttons">
                    <button className="btn-primary" onClick={() => startPlayingFromList(searchResults, 0)}>
                      <Play size={18} fill="currentColor" /> Play All
                    </button>
                    <button className="btn-secondary" onClick={toggleShuffle}><Shuffle size={16} /> Shuffle</button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
          {searchResults.length > 0 && (
            <div className="tracklist-container">
              {searchResults.map((song, idx) => (
                <div key={idx} className={`tracklist-item ${currentSong?.id === song.id ? 'playing' : ''}`} onClick={() => playSingleSong(song)} onContextMenu={(e) => handleContextMenu(e, song)}>
                  <div className="track-index">{currentSong?.id === song.id && isPlaying ? <Headset size={16} /> : (idx + 1)}</div>
                  <div className="track-title" title={song.title}>{song.title}</div>
                  <button className={`library-item-action ${isLiked(song.id) ? 'liked' : ''}`} style={{ marginLeft: 'auto', marginRight: '8px' }}
                    onClick={e => { e.stopPropagation(); toggleLike(song); }}>
                    <Heart size={14} fill={isLiked(song.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button className="library-item-action" style={{ marginRight: '12px' }}
                    onClick={e => { e.stopPropagation(); setAddToPlaylistSong(song); }}>
                    <FolderPlus size={14} />
                  </button>
                  <div className="track-duration">{formatTime(song.duration)}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );




  // ─── LOGIN SCREEN ────────────────────────────────────────────
  if (!discordUser) {
    return (
      <div className="login-screen">
        {toastData && (
          <div className={`toast-popup ${toastData.type === 'error' ? 'toast-error' : 'toast-success'}`}>
            {toastData.icon}
            {toastData.msg}
          </div>
        )}
        <div className="login-hero">
          <div className="login-hero-overlay" />
          <div className="login-lang-picker">
            <button className={`lang-flag ${language === 'id' ? 'active' : ''}`} onClick={() => setLanguage('id')} title="Bahasa Indonesia">
              <img src="https://flagcdn.com/id.svg" alt="ID" />
            </button>
            <button className={`lang-flag ${language === 'en' ? 'active' : ''}`} onClick={() => setLanguage('en')} title="English">
              <img src="https://flagcdn.com/us.svg" alt="EN" />
            </button>
            <button className={`lang-flag ${language === 'ja' ? 'active' : ''}`} onClick={() => setLanguage('ja')} title="日本語">
              <img src="https://flagcdn.com/jp.svg" alt="JA" />
            </button>
          </div>
          <div className="login-hero-content">
            <div className="login-hero-title">Don Pollo Music.</div>
            <div className="login-hero-subtitle">
              {t('loginHeroSubtitle')}
            </div>
          </div>
        </div>
        <div className="login-form-container">
          <div className="login-card">
            <div className="login-logo">
              <img src="https://donpollobot.vercel.app/donpollo-icon.jpg" alt="Don Pollo" />
            </div>
            <div className="login-title">{t('loginWelcome')}</div>
            <div className="login-subtitle">
              {t('loginWelcomeDesc')}
            </div>
            <div className="login-features">
              <div className="login-feature"><Music size={20} color="var(--accent-primary)" /> {t('loginFeat1')}</div>
              <div className="login-feature"><Mic2 size={20} color="var(--accent-primary)" /> {t('loginFeat2')}</div>
              <div className="login-feature"><ListMusic size={20} color="var(--accent-primary)" /> {t('loginFeat3')}</div>
            </div>
            <button className="login-btn-discord" onClick={loginWithDiscord}>
              <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="white" style={{ flexShrink: 0 }}>
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
              </svg>
              {t('loginBtn')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const glassBgUrl = currentSong ? (currentSong.cover || currentSong.thumbnail) : 'https://donpollobot.vercel.app/donpollo-icon.jpg';

  return (
    <div className={`app-layout theme-${settings.theme || 'default'}`} style={{ '--glass-bg': `url(${glassBgUrl})` } as any}>
      {/* Toast Container */}
      <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 9999 }}>
        {toastData && (
          <div className={`toast-popup ${toastData.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ position: 'relative', top: 0, left: 0, transform: 'none' }}>
            {toastData.icon}
            {toastData.msg}
          </div>
        )}

        {/* 
        {Object.values(activeDownloads).map((active, i) => (
          <div key={`dt-${i}`} className="toast-popup toast-success" style={{ position: 'relative', top: 0, left: 0, transform: 'none', flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <DownloadCloud size={16} />
              <span>{t('toastDownloadStarted')} {active.songData?.title}...</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
              <div style={{ width: `${active.progress}%`, height: '100%', background: 'currentColor', transition: 'width 0.2s ease-out' }}></div>
            </div>
          </div>
        ))}
        */}
      </div>

      {/* Modal: Hapus Playlist */}
      {playlistToDelete && (
        <div className="modal-overlay" onClick={() => setPlaylistToDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('confirmDeletePlaylist')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{t('cannotUndo')}</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setPlaylistToDelete(null)}>{t('cancel')}</button>
              <button className="btn-primary" style={{ backgroundColor: '#ff5555', color: 'white' }} onClick={() => deletePlaylist(playlistToDelete)}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ubah Avatar Playlist */}
      {showAvatarPrompt && (
        <div className="modal-overlay" onClick={() => setShowAvatarPrompt(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('changeImage')}</h3>
            <input
              className="modal-input"
              type="text"
              placeholder={t('imageUrlPlaceholder')}
              value={avatarUrlInput}
              onChange={e => setAvatarUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && activePlaylistId && handleUpdatePlaylistAvatar(activePlaylistId)}
              autoFocus
            />
            {avatarUrlInput.trim() && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <img
                  src={avatarUrlInput.trim()}
                  alt="Preview"
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  onLoad={e => { (e.currentTarget as HTMLImageElement).style.display = 'block'; }}
                />
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAvatarPrompt(false)}>{t('cancel')}</button>
              <button className="btn-primary" onClick={() => activePlaylistId && handleUpdatePlaylistAvatar(activePlaylistId)}>{t('save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Stats Popup */}
      {showProfileStats && discordUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start', padding: '0 0 80px 80px' }} onClick={() => setShowProfileStats(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg-card, #1c1c1c)',
            borderRadius: '16px',
            padding: '24px',
            width: '380px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button onClick={() => setShowProfileStats(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '50%' }}>
              <X size={18} />
            </button>

            {/* User Profile Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--bg-card, #1c1c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', border: '2px solid var(--border-color)' }}>
                {getDiscordAvatar(discordUser) ? (
                  <img src={getDiscordAvatar(discordUser)!} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span>{(discordUser.global_name || discordUser.username).charAt(0).toUpperCase()}</span>
                )}
                {/* Status indicator on bottom right */}
                <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <div className={`status-dot ${userStatus}`} style={{ width: '12px', height: '12px', margin: 0 }}></div>
                </div>
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{discordUser.global_name || discordUser.username}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>@{discordUser.username}</div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>

            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('profileStats')}</div>
            
            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
               {[
                { label: t('totalSongsPlayed'), value: playHistory.length, icon: <ListMusic size={16} /> },
                { label: t('listeningTime'), value: totalListenSeconds >= 3600 ? `${Math.floor(totalListenSeconds/3600)}${t('listeningTimeHours')} ${Math.floor((totalListenSeconds%3600)/60)}${t('listeningTimeMins')}` : `${Math.floor(totalListenSeconds/60)}${t('listeningTimeMins')}`, icon: <Clock size={16} /> },
                { label: t('songsLikedStat'), value: likedSongs.length, icon: <Heart size={16} /> },
                { label: t('playlistsCreated'), value: playlists.length, icon: <FolderPlus size={16} /> },
                { label: t('songsDownloaded'), value: downloadedSongs.length, icon: <Download size={16} /> },
                { label: t('topArtist'), value: (() => { const freq: Record<string, number> = {}; playHistory.forEach((s: any) => { const a = s.artist || (s.title?.split(' - ')[0]) || ''; if (a) freq[a] = (freq[a] || 0) + 1; }); const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]); return sorted[0]?.[0] || t('noneYet'); })(), icon: <Mic2 size={16} /> },
              ].map(({ label, value, icon }, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Top song */}
            {playHistory.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px', marginTop: '4px' }}>
                <div style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={24} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Last Played</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{playHistory[0]?.title || '-'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{playHistory[0]?.artist || ''}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Impor Playlist YouTube */}
      {showImportPlaylist && (
        <div className="modal-overlay" onClick={() => !isImporting && setShowImportPlaylist(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('importPlaylist')}</h3>
            <input
              className="modal-input"
              type="text"
              placeholder={t('importPlaylistPlaceholder')}
              value={importPlaylistUrl}
              onChange={e => setImportPlaylistUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isImporting && handleImportPlaylist()}
              autoFocus
              disabled={isImporting}
              style={{ marginBottom: '16px' }}
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowImportPlaylist(false)} disabled={isImporting}>{t('cancel')}</button>
              <button className="btn-primary" onClick={handleImportPlaylist} disabled={isImporting}>
                {isImporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
                {isImporting ? t('importing') : t('importPlaylist')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Buat Playlist */}
      {showCreatePlaylist && (
        <div className="modal-overlay" onClick={() => setShowCreatePlaylist(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('newPlaylistTitle')}</h3>
            <input
              className="modal-input"
              type="text"
              placeholder={t('playlistNamePlaceholder')}
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createPlaylist()}
              autoFocus
              style={{ marginBottom: '12px' }}
            />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t('coverOptional')}</p>
            <input
              className="modal-input"
              type="text"
              placeholder={t('imageUrlPlaceholder')}
              value={newPlaylistAvatar}
              onChange={e => setNewPlaylistAvatar(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createPlaylist()}
              style={{ marginBottom: '8px' }}
            />
            <input type="file" className="modal-file-input" accept="image/*" onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                const p = (e.target.files[0] as any).path;
                if (p) setNewPlaylistAvatar(`file:///${p.replace(/\\/g, '/')}`);
                else setNewPlaylistAvatar(URL.createObjectURL(e.target.files[0]));
              }
            }} />

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreatePlaylist(false)}>{t('cancel')}</button>
              <button className="btn-primary" onClick={createPlaylist} disabled={!newPlaylistName.trim()}>{t('create')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah ke Playlist */}
      {addToPlaylistSong && (
        <div className="modal-overlay" onClick={() => setAddToPlaylistSong(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('addToPlaylist')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>"{addToPlaylistSong.title}"</p>
            {playlists.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: 'var(--text-muted)' }}>Belum ada playlist.</p>
                <button className="btn-primary" style={{ marginTop: '12px' }} onClick={() => { setAddToPlaylistSong(null); setShowCreatePlaylist(true); }}>
                  <Plus size={16} /> {t('createPlaylist')}
                </button>
              </div>
            ) : (
              <div className="modal-playlist-list">
                {playlists.map(pl => (
                  <div key={pl.id} className="modal-playlist-item" onClick={() => addSongToPlaylist(pl.id, addToPlaylistSong)}>
                    <div className="modal-playlist-art">
                      {pl.avatar ? (
                        <img src={pl.avatar} alt="" />
                      ) : pl.songs[0] ? (
                        <img src={getCleanThumbnail(pl.songs[0].thumbnail)} alt="" />
                      ) : (
                        <ListMusic size={16} color="var(--text-muted)" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{pl.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{pl.songs.length} {t('songs')}</div>
                    </div>
                    {pl.songs.some(s => s.id === addToPlaylistSong.id) && (
                      <Check size={16} color="var(--accent-primary)" style={{ marginLeft: 'auto' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setAddToPlaylistSong(null)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* TOP SECTION */}
      <div className="app-top-section" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT SIDEBAR */}
        <div className="nav-sidebar">
          <div className="nav-top-box">
            <div className="nav-logo-container">
              <img src="https://donpollobot.vercel.app/donpollo-icon.jpg" alt="Don Pollo" className="nav-logo-img" />
              <span className="nav-logo-text">Don Pollo Music</span>
            </div>
            <div className="nav-menu">
              <div className={`nav-item ${activePage === 'home' ? 'active' : ''}`} onClick={goHome}>
                <Home size={24} /> <span className="nav-label">{t('home')}</span>
              </div>
              <div className={`nav-item ${activePage === 'settings' ? 'active' : ''}`} onClick={() => setActivePage('settings')}>
                <Settings size={24} /> <span className="nav-label">{t('settings')}</span>
              </div>
            </div>
          </div>

          <div className="library-section">
            <div className="library-header">
              <div className="library-header-left">
                <ListMusic size={24} />
                <span>{t('yourLibrary')}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button className="library-header-btn" onClick={() => setShowCreatePlaylist(true)} title={t('createPlaylist')}>
                  <Plus size={20} />
                </button>
                <button className="library-header-btn" onClick={() => setShowImportPlaylist(true)} title={t('importPlaylist')}>
                  <Download size={20} />
                </button>
              </div>
            </div>

            <div className="library-pills">
              <button className="library-pill">{t('playlists')}</button>
            </div>

            <div className="library-list-container">
              {/* Liked Songs Fixed Item */}
              <button className={`sidebar-list-item ${activePage === 'library' ? 'active' : ''}`} onClick={() => setActivePage('library')}>
                <div className="sidebar-item-img" style={{ background: 'linear-gradient(135deg, var(--accent-primary), #2a2a2a)' }}>
                  <Heart size={20} color="white" fill="white" />
                </div>
                <div className="sidebar-item-info">
                  <div className="sidebar-item-title">{t('liked')}</div>
                  <div className="sidebar-item-subtitle">{t('playlist')} • {likedSongs.length} {t('songs')}</div>
                </div>
              </button>

              <button className={`sidebar-list-item ${activePage === 'downloads' ? 'active' : ''}`} onClick={() => setActivePage('downloads')}>
                <div className="sidebar-item-img" style={{ background: 'linear-gradient(135deg, #00c6ff, #0072ff)' }}>
                  <FolderPlus size={20} color="white" />
                </div>
                <div className="sidebar-item-info">
                  <div className="sidebar-item-title">{t('offlineVault')}</div>
                  <div className="sidebar-item-subtitle">{downloadedSongs.length} {t('songsAvailable')}</div>
                </div>
              </button>

              {/* Playlists */}
              {playlists.map(pl => (
                <button key={pl.id} className={`sidebar-list-item ${(activePage === 'playlist-detail' && activePlaylistId === pl.id) ? 'active' : ''}`} onClick={() => {
                  setActivePlaylistId(pl.id);
                  setActivePage('playlist-detail');
                }}>
                  <div className="sidebar-item-img">
                    {pl.avatar ? (
                      <img 
                        src={pl.avatar} 
                        alt="cover" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} 
                        onError={(e) => {
                          if (pl.songs.length > 0) {
                            e.currentTarget.src = getCleanThumbnail(pl.songs[0].thumbnail);
                          } else {
                            e.currentTarget.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      pl.songs.length > 0 ? (
                        <img src={getCleanThumbnail(pl.songs[0].thumbnail)} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <Music size={24} color="var(--text-secondary)" />
                      )
                    )}
                  </div>
                  <div className="sidebar-item-info">
                    <div className="sidebar-item-title">{pl.name}</div>
                    <div className="sidebar-item-subtitle">{t('playlist')} • {discordUser ? (discordUser.global_name || discordUser.username) : t('guest')}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

        {/* FRIEND ACTIVITY SIDEBAR - DEFAULT THEME */}
        {discordUser && settings.theme !== 'minimalist' && (
          <div className="friend-activity-section">
            <div className="friend-activity-inner">
            <div className="sidebar-header" style={{ padding: '0 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '8px' }}>
              <div className="sidebar-title" style={{ fontSize: '12px' }}>{t('friendActivityTitle')}</div>
              <div className="sidebar-subtitle" style={{ fontSize: '11px' }}>{t('friendActivitySubtitle')}</div>
            </div>
            
            {joinRequests.incoming && joinRequests.incoming.length > 0 && (
              <div className="join-requests-container" style={{ marginBottom: '12px', padding: '8px', backgroundColor: 'rgba(240, 178, 50, 0.1)', border: '1px solid rgba(240, 178, 50, 0.3)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#f0b232', fontWeight: 700, marginBottom: '8px' }}>{t('pendingRequests')}</div>
                {joinRequests.incoming.map((req: any) => (
                  <div key={req.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                      <strong>{req.guestName}</strong> {t('joinRequestReceived')}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={async () => {
                        await (window as any).electronAPI.respondJoinRequest(req.id, 'accepted');
                        setJoinRequests(prev => ({ ...prev, incoming: prev.incoming.filter(r => r.id !== req.id) }));
                      }} style={{ flex: 1, padding: '4px 0', backgroundColor: '#23a559', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>{t('accept')}</button>
                      
                      <button onClick={async () => {
                        await (window as any).electronAPI.respondJoinRequest(req.id, 'rejected');
                        setJoinRequests(prev => ({ ...prev, incoming: prev.incoming.filter(r => r.id !== req.id) }));
                      }} style={{ flex: 1, padding: '4px 0', backgroundColor: '#f23f43', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>{t('reject')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="friend-list">
              {(() => {
                const effectivePartyId = activePartyId || (discordUser && onlineUsers.some(u => u.partyId === discordUser.id) ? discordUser.id : null);
                const currentPartyMembers = onlineUsers.filter(u => effectivePartyId && (u.partyId === effectivePartyId || u.discordId === effectivePartyId));
                const otherFriends = onlineUsers.filter(u => !effectivePartyId || (u.partyId !== effectivePartyId && u.discordId !== effectivePartyId));
                
                const partyAvatars = [];
                if (effectivePartyId && discordUser) {
                  partyAvatars.push({
                    id: discordUser.id,
                    url: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : `https://ui-avatars.com/api/?name=${discordUser.username}`,
                    name: discordUser.username
                  });
                  currentPartyMembers.forEach(u => {
                    partyAvatars.push({
                      id: u.discordId,
                      url: u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}`,
                      name: u.username
                    });
                  });
                }

                return (
                  <>
                    {effectivePartyId && partyAvatars.length > 0 && (
                      <div className="friend-item current-party-block" style={{ flexDirection: 'row', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', position: 'relative', marginBottom: '8px', width: '100%', boxSizing: 'border-box' }}>
                        <div className="party-avatars" style={{ display: 'flex', marginRight: '12px' }}>
                          {partyAvatars.map((av, idx) => (
                            <img 
                              key={av.id} 
                              src={av.url} 
                              alt={av.name} 
                              title={av.name}
                              style={{ 
                                width: '28px', 
                                height: '28px', 
                                borderRadius: '50%', 
                                border: '2px solid var(--background-secondary)',
                                marginLeft: idx === 0 ? '0' : '-10px',
                                zIndex: partyAvatars.length - idx,
                                objectFit: 'cover'
                              }} 
                            />
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                          <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '2px', letterSpacing: '0.5px' }}>
                            {t('listenAlong')}
                          </span>
                          {currentPartyMembers.length > 0 && currentPartyMembers[0].currentSong ? (
                            <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }} title={currentPartyMembers[0].currentSong.title}>
                              ♫ {currentPartyMembers[0].currentSong.title}
                            </div>
                          ) : currentSong ? (
                            <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }} title={currentSong.title}>
                              ♫ {currentSong.title}
                            </div>
                          ) : (
                            <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Browsing...</div>
                          )}
                        </div>
                        {isGuest && (
                          <button 
                            className="leave-party-icon-btn" 
                            onClick={() => {
                              setIsGuest(false);
                              setActivePartyId(null);
                              if (audioRef.current) audioRef.current.pause();
                              setIsPlaying(false);
                            }}
                            title={t('leaveParty')}
                            style={{ marginLeft: '8px' }}
                          >
                            <LogOut size={16} />
                          </button>
                        )}
                      </div>
                    )}

                    {otherFriends.length === 0 && !effectivePartyId ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', marginTop: '12px' }}>{t('noFriendsOnline')}</div>
                    ) : (
                      otherFriends.map(user => (
                        <div key={user.discordId} className="friend-item">
                          <div className="friend-avatar-container" style={{ position: 'relative' }}>
                            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}`} alt={user.username} className="friend-avatar" />
                            <div className={`status-dot-avatar status-dot ${user.status || 'online'}`}></div>
                          </div>
                          <div className="friend-info">
                            <div className="friend-name">{user.username}</div>
                            {user.currentSong ? (
                              <>
                                <div className="friend-song" title={user.currentSong.title}>♫ {user.currentSong.title}</div>
                                {user.status !== 'dnd' && (
                                  <button className="listen-along-btn" onClick={async () => {
                                    if (user.status === 'idle') {
                                      const success = await (window as any).electronAPI.sendJoinRequest(user.partyId || user.discordId, discordUser.id, discordUser.global_name || discordUser.username);
                                      if (success) {
                                        showToast(t('joinRequestSent'), 'success');
                                      }
                                    } else {
                                      setActivePartyId(user.partyId || user.discordId);
                                      setIsGuest(true);
                                      showToast(`Listening along with ${user.username}...`, 'success');
                                    }
                                  }}><Headphones size={12} style={{ marginRight: '4px' }}/> {user.status === 'idle' ? t('askToJoin') : t('listenAlong')}</button>
                                )}
                                {user.status === 'dnd' && (
                                  <button className="listen-along-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                    <Headphones size={12} style={{ marginRight: '4px' }}/> {t('joinDisabled')}
                                  </button>
                                )}
                              </>
                            ) : (
                              <div className="friend-song" style={{ color: 'var(--text-muted)' }}>Browsing...</div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                );
              })()}
            </div>
            </div>
          </div>
        )}

          <div className="nav-bottom" style={{ position: 'relative' }}>
            {showLogoutDropdown && (
              <div className="logout-dropdown">
                {discordUser ? (
                  <>
                    <div className="dropdown-item" onClick={() => { setUserStatus('online'); localStorage.setItem('donpollo_status', 'online'); setShowLogoutDropdown(false); }}>
                      <div className="status-dot online"></div> {t('statusOnline')}
                    </div>
                    <div className="dropdown-item" onClick={() => { setUserStatus('idle'); localStorage.setItem('donpollo_status', 'idle'); setShowLogoutDropdown(false); }}>
                      <div className="status-dot idle"></div> {t('statusIdle')}
                    </div>
                    <div className="dropdown-item" onClick={() => { setUserStatus('dnd'); localStorage.setItem('donpollo_status', 'dnd'); setShowLogoutDropdown(false); }}>
                      <div className="status-dot dnd"></div> {t('statusDnd')}
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="logout-item" onClick={handleLogout}>
                      <LogOut size={16} /> {t('logoutDropdown')}
                    </div>
                  </>
                ) : (
                  <div className="logout-item" onClick={() => { setShowLogoutDropdown(false); setActivePage('settings'); }} style={{ color: 'var(--text-primary)' }}>
                    <Settings size={16} /> {t('goToSettings')}
                  </div>
                )}
              </div>
            )}
            <button className="user-profile-btn" onClick={() => { if (discordUser) { setShowProfileStats(true); setShowLogoutDropdown(false); } else { setShowLogoutDropdown(!showLogoutDropdown); } }} onContextMenu={(e) => { e.preventDefault(); setShowLogoutDropdown(!showLogoutDropdown); setShowProfileStats(false); }} title={discordUser ? `` : 'Login'}>
              <div className="user-avatar" style={{ position: 'relative' }}>
                {discordUser && getDiscordAvatar(discordUser) ? (
                  <img src={getDiscordAvatar(discordUser)!} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span>{discordUser ? (discordUser.global_name || discordUser.username).charAt(0).toUpperCase() : 'DP'}</span>
                )}
                {discordUser && (
                  <div className={`status-dot-avatar status-dot ${userStatus}`}></div>
                )}
              </div>
              <span className="nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {discordUser ? (discordUser.global_name || discordUser.username) : t('guest')}
              </span>
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-area">
          {isOffline && (
            <div className="offline-banner" style={{ background: 'var(--accent-primary)', color: 'black', textAlign: 'center', padding: '10px', fontWeight: 'bold', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <WifiOff size={18} /> Anda sedang dalam Mode Offline. Fitur pencarian dan rekomendasi dinonaktifkan.
            </div>
          )}
          {/* Top Bar */}
          <div className="top-bar" style={settings.theme === 'minimalist' ? { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } : {}}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {settings.theme === 'minimalist' && (
                <div className="minimalist-nav" style={{ display: 'flex', gap: '8px', marginRight: '8px', alignItems: 'center' }}>
                  <button className="btn-icon" onClick={goHome} disabled={isOffline} style={{ 
                    color: activePage === 'home' ? (settings.theme === 'minimalist' ? 'var(--accent-text, black)' : 'var(--accent-primary)') : 'var(--text-primary)',
                    background: activePage === 'home' && settings.theme === 'minimalist' ? 'var(--accent-primary)' : '',
                    opacity: isOffline ? 0.5 : 1
                  }} title="Home"><Home size={20} /></button>
                  <button className="btn-icon" onClick={() => setActivePage('library')} style={{ 
                    color: activePage === 'library' ? (settings.theme === 'minimalist' ? 'var(--accent-text, black)' : 'var(--accent-primary)') : 'var(--text-primary)',
                    background: activePage === 'library' && settings.theme === 'minimalist' ? 'var(--accent-primary)' : ''
                  }} title={t('likedSongs') || 'Liked Songs'}><Heart size={20} /></button>
                  <button className="btn-icon" onClick={() => setActivePage('playlist')} style={{ 
                    color: (activePage === 'playlist' || activePage === 'playlist-detail') ? (settings.theme === 'minimalist' ? 'var(--accent-text, black)' : 'var(--accent-primary)') : 'var(--text-primary)',
                    background: (activePage === 'playlist' || activePage === 'playlist-detail') && settings.theme === 'minimalist' ? 'var(--accent-primary)' : ''
                  }} title={t('playlist') || 'Playlists'}><ListMusic size={20} /></button>
                  <button className="btn-icon" onClick={() => setActivePage('settings')} style={{ 
                    color: activePage === 'settings' ? (settings.theme === 'minimalist' ? 'var(--accent-text, black)' : 'var(--accent-primary)') : 'var(--text-primary)',
                    background: activePage === 'settings' && settings.theme === 'minimalist' ? 'var(--accent-primary)' : ''
                  }} title="Pengaturan"><Settings size={20} /></button>
                  <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>
                </div>
              )}
              <div className="nav-arrows" style={settings.theme === 'minimalist' ? { margin: 0 } : {}}>
                <button className="arrow-btn" onClick={goHome}><ChevronLeft size={20} /></button>
                <button className="arrow-btn"><ChevronRight size={20} /></button>
              </div>
            </div>
            
            <div className="search-container" ref={searchContainerRef} style={settings.theme === 'minimalist' ? { marginLeft: 'auto' } : { position: 'relative' }}>
              <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', alignItems: 'center', position: 'relative', opacity: isOffline ? 0.5 : 1, pointerEvents: isOffline ? 'none' : 'auto' }}>
                <Search size={16} className="search-icon" />
                <input
                  disabled={isOffline}
                  type="text"
                  className="search-input"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => { if (searchQuery.length >= 2) setShowSuggestions(true); }}
                />
              </form>

              {/* Live Search Dropdown */}
              {showSuggestions && searchQuery.length >= 2 && (
                <div className="search-suggestions-dropdown">
                  <div 
                    className="suggestion-intent-row" 
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      openArtistPage(searchQuery);
                    }}
                  >
                    <div className="intent-icon"><UserCircle size={18} /></div>
                    <div className="intent-text">
                      <span className="intent-prefix">{t('seeAllSongsBy')}</span>
                      <span className="intent-keyword">"{searchQuery}"</span>
                    </div>
                  </div>

                  {isFetchingSuggestions ? (
                    <div className="suggestion-loading">
                      <Loader2 size={14} className="spin-icon" />
                      <span>Mencari...</span>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="suggestion-empty">Tidak ada hasil untuk "{searchQuery}"</div>
                  ) : (
                    <>
                      {suggestions.map((song, i) => (
                        <div
                          key={i}
                          className="suggestion-item no-hover-play"
                          onMouseDown={e => e.preventDefault()}
                        >
                          <div className="suggestion-thumb">
                            <img src={getCleanThumbnail(song.thumbnail)} alt={song.title} />
                          </div>
                          <div className="suggestion-info">
                            <div className="suggestion-title">{song.title}</div>
                            <div className="suggestion-artist">{song.artist}</div>
                          </div>
                          <div className="suggestion-actions">
                            <button
                              className="suggestion-btn"
                              title={t('playSong')}
                              onClick={(e) => {
                                e.stopPropagation();
                                playSingleSong(song);
                                setSearchQuery(song.title);
                                setShowSuggestions(false);
                              }}
                            >
                              <Play size={15} fill="currentColor" />
                            </button>
                            <button
                              className={`suggestion-btn ${isLiked(song.id) ? 'liked' : ''}`}
                              title={isLiked(song.id) ? t('unlikeSong') : t('likeSong')}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLike(song);
                              }}
                            >
                              <Heart size={15} fill={isLiked(song.id) ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              className="suggestion-btn"
                              title={t('addToQueue')}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (isGuest && activePartyId) {
                                  await (window as any).electronAPI.sendQueueRequest(activePartyId, discordUser?.id, discordUser?.global_name || discordUser?.username, song);
                                  showToast(`Berhasil meminta Host untuk menambahkan "${song.title}" ke antrean!`, 'success');
                                  setShowSuggestions(false);
                                  return;
                                }
                                setQueue(prev => [...prev, song]);
                                setOriginalQueue(prev => [...prev, song]);
                                if (currentIndex === -1) {
                                  setCurrentIndex(0);
                                  executePlay(song);
                                } else {
                                  showToast(t('toastAddedToQueue'));
                                }
                                setShowSuggestions(false);
                              }}
                            >
                              <ListMusic size={16} />
                            </button>
                            <button
                              className="suggestion-btn"
                              title={t('addToPlaylist')}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddToPlaylistSong(song);
                                setShowSuggestions(false);
                              }}
                            >
                              <Plus size={16} />
                            </button>
                            <button
                              className="suggestion-btn"
                              title="Unduh Lagu"
                              onClick={(e) => {
                                e.stopPropagation();
                                if ((window as any).electronAPI) {
                                  const streamUrl = `${API_BASE_URL}/api/stream?id=${song.id}`;
                                  (window as any).electronAPI.cacheAudio(song, streamUrl);
                                  showToast(`Mulai mengunduh "${song.title}"...`, 'success');
                                }
                                setShowSuggestions(false);
                              }}
                            >
                              <Download size={16} />
                            </button>
                          </div>
                          <div className="suggestion-duration">{formatTime(song.duration)}</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="topbar-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '60px', justifyContent: 'flex-end' }}>
              {updateStatus !== 'none' && (
                <button 
                  className={`update-badge ${updateStatus === 'downloaded' ? 'ready' : ''}`}
                  onClick={() => {
                    if (updateStatus === 'available') {
                      setUpdateStatus('downloading');
                      if ((window as any).electronAPI.downloadUpdate) (window as any).electronAPI.downloadUpdate();
                    } else if (updateStatus === 'downloaded') {
                      if ((window as any).electronAPI.installUpdate) (window as any).electronAPI.installUpdate();
                    }
                  }}
                  disabled={updateStatus === 'downloading'}
                >
                  <Download size={16} />
                  <span>
                    {updateStatus === 'available' ? t('updateAvailable') : 
                     updateStatus === 'downloading' ? `${t('updateDownloading')} (${updateProgress}%)` : 
                     updateStatus === 'error' ? 'Update Gagal' :
                     t('updateReady')}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Page Router */}
          {activePage === 'home' && renderHomePage()}
          {activePage === 'artist' && renderArtistPage()}
          {activePage === 'library' && (
            <div className="main-scroll">{renderLibraryPage()}</div>
          )}
          {(activePage === 'playlist' || activePage === 'playlist-detail') && (
            <div className="main-scroll">{renderPlaylistPage()}</div>
          )}
          {activePage === 'settings' && (
            <div className="main-scroll">{renderSettingsPage()}</div>
          )}
          {activePage === 'downloads' && (
            <div className="main-scroll">{renderDownloadsPage()}</div>
          )}

          {/* BOTTOM PLAYER BAR */}
          {!isWidgetMode && (
            <div className="bottom-player-bar">
              <div className="player-left">
                {currentSong ? (
                  <>
                    <img 
                      src={getCleanThumbnail(currentSong.thumbnail)} 
                      className="player-cover" 
                      alt="cover" 
                      style={{
                        animation: isPlaying ? 'spin 12s linear infinite' : 'none',
                        borderRadius: '50%',
                        border: '2px solid var(--surface-tertiary)',
                        boxShadow: isPlaying ? '0 0 10px rgba(0, 255, 170, 0.2)' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                    />
                    <div className="player-info">
                      <span className="player-title" title={currentSong.title}>{currentSong.title}</span>
                      <span className="player-artist" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{currentSong.artist}</span>
                    </div>
                    <button className={`chat-btn ${isLiked(currentSong.id) ? 'liked' : ''}`} style={{ color: isLiked(currentSong.id) ? '#ff6b9d' : 'var(--text-secondary)', marginLeft: '12px' }} onClick={() => toggleLike(currentSong)} title={isLiked(currentSong.id) ? t('btnUnlike') : t('btnLike')}>
                      <Heart size={16} fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
                    </button>
                  </>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('noHistory')}</div>
                )}
              </div>
              <div className="player-center">
                <div className="player-controls">
                  <button className="chat-btn" onClick={toggleShuffle} style={{ color: isShuffled ? 'var(--accent-primary)' : 'var(--text-secondary)' }} title={t('btnShuffle')}><Shuffle size={18} /></button>
                  <button className="chat-btn" onClick={handlePrev} disabled={currentIndex <= 0} style={{ opacity: currentIndex <= 0 ? 0.3 : 1 }} title={t('btnPrevious')}><SkipBack size={22} fill="currentColor" /></button>
                  <button className="chat-play-btn" onClick={togglePlay} disabled={!currentSong} title={isPlaying ? t('btnPause') : t('btnPlay')}>
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '4px' }} />}
                  </button>
                  <button className="chat-btn" onClick={handleNext} disabled={currentIndex >= queue.length - 1} style={{ opacity: (currentIndex >= queue.length - 1) ? 0.3 : 1 }} title={t('btnNext')}><SkipForward size={22} fill="currentColor" /></button>
                  <button className="chat-btn" onClick={toggleLoopMode} style={{ color: loopMode !== 'off' ? 'var(--accent-primary)' : 'var(--text-secondary)' }} title={t('btnLoop')}>{loopMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}</button>
                </div>
                <div className="player-progress-container">
                  <span className="chat-time">{formatTime(progress)}</span>
                  <div className="chat-progress-bar" onClick={handleSeek}>
                    <div className="chat-progress-fill" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}>
                      <div className="chat-progress-thumb"></div>
                    </div>
                  </div>
                  <span className="chat-time">{formatTime(duration)}</span>
                </div>
              </div>
              <div className="player-right">
                {settings.theme !== 'minimalist' && (
                  <button className="chat-btn" onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)} style={{ color: isRightSidebarOpen ? 'var(--accent-primary)' : 'var(--text-secondary)' }} title={isRightSidebarOpen ? t('btnHideSidebar') : t('btnSidebar')}>
                    <PanelRight size={20} />
                  </button>
                )}
                <button className="chat-btn" onClick={() => setIsWidgetMode(true)} title={t('btnFullscreen')}><Maximize2 size={16} /></button>
                <div className="player-volume-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }} title={t('btnVolume')}>
                  <button className="chat-btn" onClick={() => setIsMuted(!isMuted)} title={isMuted || volume === 0 ? t('btnVolume') : t('btnMute')}>
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume}
                    onChange={e => { setVolume(parseFloat(e.target.value)); if (isMuted) setIsMuted(false); }}
                    style={{ width: '80px', height: '4px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FRIEND ACTIVITY SIDEBAR - MINIMALIST THEME */}
        {discordUser && settings.theme === 'minimalist' && (
          <div className={`friend-activity-section xbox-widget ${isFriendsOpen ? 'expanded' : 'collapsed'}`}>
            <div className="xbox-widget-header" onClick={() => setIsFriendsOpen(!isFriendsOpen)}>
              <div className="xbox-widget-header-info">
                <div className="xbox-widget-title">{t('friends')} ({onlineUsers.length})</div>
                {joinRequests.incoming && joinRequests.incoming.length > 0 && (
                  <div className="xbox-widget-subtitle">{joinRequests.incoming.length} {t('pendingFriendRequest')}</div>
                )}
              </div>
              <div className="xbox-widget-actions">
                {isFriendsOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </div>
            </div>
            <div className="friend-activity-inner">
            <div className="sidebar-header" style={{ padding: '0 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '8px' }}>
              <div className="sidebar-title" style={{ fontSize: '12px' }}>{t('friendActivityTitle')}</div>
              <div className="sidebar-subtitle" style={{ fontSize: '11px' }}>{t('friendActivitySubtitle')}</div>
            </div>
            
            {joinRequests.incoming && joinRequests.incoming.length > 0 && (
              <div className="join-requests-container" style={{ marginBottom: '12px', padding: '8px', backgroundColor: 'rgba(240, 178, 50, 0.1)', border: '1px solid rgba(240, 178, 50, 0.3)', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: '#f0b232', fontWeight: 700, marginBottom: '8px' }}>{t('pendingRequests')}</div>
                {joinRequests.incoming.map((req: any) => (
                  <div key={req.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                      <strong>{req.guestName}</strong> {t('joinRequestReceived')}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={async () => {
                        await (window as any).electronAPI.respondJoinRequest(req.id, 'accepted');
                        setJoinRequests(prev => ({ ...prev, incoming: prev.incoming.filter(r => r.id !== req.id) }));
                      }} style={{ flex: 1, padding: '4px 0', backgroundColor: '#23a559', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>{t('accept')}</button>
                      
                      <button onClick={async () => {
                        await (window as any).electronAPI.respondJoinRequest(req.id, 'rejected');
                        setJoinRequests(prev => ({ ...prev, incoming: prev.incoming.filter(r => r.id !== req.id) }));
                      }} style={{ flex: 1, padding: '4px 0', backgroundColor: '#f23f43', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>{t('reject')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="friend-list">
              {(() => {
                const effectivePartyId = activePartyId || (discordUser && onlineUsers.some(u => u.partyId === discordUser.id) ? discordUser.id : null);
                const currentPartyMembers = onlineUsers.filter(u => effectivePartyId && (u.partyId === effectivePartyId || u.discordId === effectivePartyId));
                const otherFriends = onlineUsers.filter(u => !effectivePartyId || (u.partyId !== effectivePartyId && u.discordId !== effectivePartyId));
                
                const partyAvatars = [];
                if (effectivePartyId && discordUser) {
                  partyAvatars.push({
                    id: discordUser.id,
                    url: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : `https://ui-avatars.com/api/?name=${discordUser.username}`,
                    name: discordUser.username
                  });
                  currentPartyMembers.forEach(u => {
                    partyAvatars.push({
                      id: u.discordId,
                      url: u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}`,
                      name: u.username
                    });
                  });
                }

                return (
                  <>
                    {effectivePartyId && partyAvatars.length > 0 && (
                      <div className="friend-item current-party-block" style={{ flexDirection: 'row', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', position: 'relative', marginBottom: '8px', width: '100%', boxSizing: 'border-box' }}>
                        <div className="party-avatars" style={{ display: 'flex', marginRight: '12px' }}>
                          {partyAvatars.map((av, idx) => (
                            <img 
                              key={av.id} 
                              src={av.url} 
                              alt={av.name} 
                              title={av.name}
                              style={{ 
                                width: '28px', 
                                height: '28px', 
                                borderRadius: '50%', 
                                border: '2px solid var(--background-secondary)',
                                marginLeft: idx === 0 ? '0' : '-10px',
                                zIndex: partyAvatars.length - idx,
                                objectFit: 'cover'
                              }} 
                            />
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                          <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '2px', letterSpacing: '0.5px' }}>
                            {t('listenAlong')}
                          </span>
                          {currentPartyMembers.length > 0 && currentPartyMembers[0].currentSong ? (
                            <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }} title={currentPartyMembers[0].currentSong.title}>
                              ♫ {currentPartyMembers[0].currentSong.title}
                            </div>
                          ) : currentSong ? (
                            <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }} title={currentSong.title}>
                              ♫ {currentSong.title}
                            </div>
                          ) : (
                            <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Browsing...</div>
                          )}
                        </div>
                        {isGuest && (
                          <button 
                            className="leave-party-icon-btn" 
                            onClick={() => {
                              setIsGuest(false);
                              setActivePartyId(null);
                              if (audioRef.current) audioRef.current.pause();
                              setIsPlaying(false);
                            }}
                            title={t('leaveParty')}
                            style={{ marginLeft: '8px' }}
                          >
                            <LogOut size={16} />
                          </button>
                        )}
                      </div>
                    )}

                    {otherFriends.length === 0 && !effectivePartyId ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', marginTop: '12px' }}>{t('noFriendsOnline')}</div>
                    ) : (
                      otherFriends.map(user => (
                        <div key={user.discordId} className="friend-item">
                          <div className="friend-avatar-container" style={{ position: 'relative' }}>
                            <img src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username}`} alt={user.username} className="friend-avatar" />
                            <div className={`status-dot-avatar status-dot ${user.status || 'online'}`}></div>
                          </div>
                          <div className="friend-info">
                            <div className="friend-name">{user.username}</div>
                            {user.currentSong ? (
                              <>
                                <div className="friend-song" title={user.currentSong.title}>♫ {user.currentSong.title}</div>
                                {user.status !== 'dnd' && (
                                  <button className="listen-along-btn" onClick={async () => {
                                    if (user.status === 'idle') {
                                      const success = await (window as any).electronAPI.sendJoinRequest(user.partyId || user.discordId, discordUser.id, discordUser.global_name || discordUser.username);
                                      if (success) {
                                        showToast(t('joinRequestSent'), 'success');
                                      }
                                    } else {
                                      setActivePartyId(user.partyId || user.discordId);
                                      setIsGuest(true);
                                      showToast(`Listening along with ${user.username}...`, 'success');
                                    }
                                  }}><Headphones size={12} style={{ marginRight: '4px' }}/> {user.status === 'idle' ? t('askToJoin') : t('listenAlong')}</button>
                                )}
                                {user.status === 'dnd' && (
                                  <button className="listen-along-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                    <Headphones size={12} style={{ marginRight: '4px' }}/> {t('joinDisabled')}
                                  </button>
                                )}
                              </>
                            ) : (
                              <div className="friend-song" style={{ color: 'var(--text-muted)' }}>Browsing...</div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </>
                );
              })()}
            </div>
            </div>
          </div>
        )}

        {/* RIGHT SIDEBAR */}
        <div className={`right-sidebar ${!isRightSidebarOpen && settings.theme !== 'minimalist' ? 'closed' : ''} ${settings.theme === 'minimalist' ? 'xbox-widget left-widget ' + (isRightSidebarOpen ? 'expanded' : 'collapsed') : ''}`} style={showLyrics && currentSong ? {
          backgroundImage: `url(${currentSong.thumbnail})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: settings.theme === 'minimalist' ? 'fixed' : 'relative'
        } : undefined}>
            {settings.theme === 'minimalist' && (
              <div className="xbox-widget-header" onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)} style={{ position: 'relative', zIndex: 1, borderBottom: isRightSidebarOpen ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div className="xbox-widget-header-info">
                  <div className="xbox-widget-title">{showLyrics ? t('lyricsPanel') : t('queue')}</div>
                  {currentSong && <div className="xbox-widget-subtitle">{currentSong.title}</div>}
                </div>
                <div className="xbox-widget-actions">
                  <button style={{ background: 'none', border: 'none', color: !showLyrics ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', marginRight: '8px' }} onClick={(e) => { e.stopPropagation(); setShowLyrics(false); }} title="Queue">
                    <ListMusic size={16} />
                  </button>
                  <button style={{ background: 'none', border: 'none', color: showLyrics ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', marginRight: '12px' }} onClick={(e) => { e.stopPropagation(); setShowLyrics(true); }} title="Lyrics">
                    <Mic2 size={16} />
                  </button>
                  {isRightSidebarOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </div>
              </div>
            )}

            {showLyrics && currentSong && (
              <div className="right-sidebar-overlay" style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(30, 31, 34, 0.5)',
                backdropFilter: 'blur(80px)',
                WebkitBackdropFilter: 'blur(80px)',
                zIndex: 0
              }}></div>
            )}
            {settings.theme !== 'minimalist' && (
              <div className="sidebar-header" style={{ position: 'relative', zIndex: 1 }}>
                <div>
                  <div className="sidebar-title">{showLyrics ? t('lyricsPanel') : t('queue')}</div>
                  <div className="sidebar-subtitle">
                    {showLyrics ? (currentSong ? currentSong.title : 'No song') : `${Math.max(0, queue.length - Math.max(0, currentIndex))} ${t('songs')} • ${formatTime(queue.slice(Math.max(0, currentIndex)).reduce((acc, s) => acc + (s.duration || 0), 0))}`}
                  </div>
                </div>
                <div className="sidebar-actions">
                  <button style={{ background: 'none', border: 'none', color: !showLyrics ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setShowLyrics(false)} title="Queue">
                    <ListMusic size={18} />
                  </button>
                  <button style={{ background: 'none', border: 'none', color: showLyrics ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setShowLyrics(true)} title="Lyrics">
                    <Mic2 size={18} />
                  </button>
                  <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: '8px' }} onClick={() => setIsRightSidebarOpen(false)} title="Tutup">
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}

            {showLyrics ? (
              <div className="lyrics-mode" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Sync</div>
                    <button 
                      onClick={() => setShowRomanized(!showRomanized)} 
                      style={{ 
                        background: showRomanized ? 'var(--accent-primary)' : 'transparent', 
                        border: '1px solid var(--accent-primary)', 
                        color: showRomanized ? (settings.theme === 'minimalist' ? 'black' : 'white') : 'var(--accent-primary)', 
                        fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600
                      }}
                      title="Toggle Romanization"
                    >
                      A/文
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <button onClick={() => setLyricsOffset(prev => prev - 0.5)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer' }}>-0.5s</button>
                    <div style={{ backgroundColor: 'var(--accent-primary)', color: settings.theme === 'minimalist' ? 'black' : 'white', fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>{lyricsOffset}s</div>
                    <button onClick={() => setLyricsOffset(prev => prev + 0.5)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer' }}>+0.5s</button>
                  </div>
                </div>
                <div className="lyrics-container" ref={sidebarLyricsRef} onWheel={handleUserScroll} onTouchMove={handleUserScroll} onMouseDown={handleUserScroll}>
                  {lyricsData ? (
                    lyricsData.map((line, i) => {
                      const nextLineTime = i < lyricsData.length - 1 ? lyricsData[i + 1].time : duration;
                      const effectiveProgress = progress - lyricsOffset;
                      const isActive = effectiveProgress >= line.time && effectiveProgress < nextLineTime;
                      if (line.isInstrumental) {
                        const timeLeft = nextLineTime - effectiveProgress;
                        return (
                          <div key={i} data-lyric-idx={i} className={`lyrics-line instrumental ${isActive ? 'active' : 'inactive'}`} onClick={() => jumpToLyric(line.time)}>
                            <span className={`instrumental-dot ${isActive && timeLeft <= 3 ? 'lit' : ''}`}>•</span>
                            <span className={`instrumental-dot ${isActive && timeLeft <= 2 ? 'lit' : ''}`}>•</span>
                            <span className={`instrumental-dot ${isActive && timeLeft <= 1 ? 'lit' : ''}`}>•</span>
                          </div>
                        );
                      }
                      return (
                        <div key={i} data-lyric-idx={i} className={`lyrics-line ${isActive ? 'active' : 'inactive'}`} onClick={() => jumpToLyric(line.time)}>
                          {showRomanized && line.romanizedText ? line.romanizedText : line.text}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px', fontSize: '14px' }}>{plainLyrics}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="queue-list">
                {queue.length - Math.max(0, currentIndex) <= 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', marginTop: '32px' }}>{t('emptyQueue')}</div>
                ) : (
                  <>
                    {queue.map((song, idx) => {
                      if (idx < currentIndex) return null;
                      const isPlayingNow = currentSong?.id === song.id;
                      return (
                        <div key={idx} className={`queue-item ${isPlayingNow ? 'playing' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '12px', cursor: 'pointer', minWidth: 0 }} onClick={() => { setCurrentIndex(idx); executePlay(song); }}>
                            <img src={getCleanThumbnail(song.thumbnail)} alt={song.title} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                            <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                              <div title={song.title} style={{ fontSize: "13px", fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>{formatTime(song.duration)}</div>
                          </div>
                          
                          {!isPlayingNow && !(isGuest && activePartyId) && (
                            <button 
                              className="queue-remove-btn"
                              style={{
                                background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', flexShrink: 0
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setQueue(prev => {
                                  const newQ = [...prev];
                                  newQ.splice(idx, 1);
                                  setOriginalQueue(newQ);
                                  return newQ;
                                });
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {queue.length > 0 && !(isGuest && activePartyId) && (
                      <div className="clear-queue" onClick={() => { setQueue([]); setOriginalQueue([]); setCurrentIndex(-1); }}>{t('clearQueue')}</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
      </div>

      {/* RIGHT SIDEBAR */}

      {/* FULLSCREEN PLAYER */}
      {isWidgetMode && (
        <div className="fullscreen-player">
          <div className="fs-background">
            <img 
              key={currentSong?.id || 'bg'} 
              src={getHighResImage(currentSong?.thumbnail)} 
              onError={(e) => {
                if (e.currentTarget.src !== currentSong?.thumbnail && currentSong?.thumbnail) {
                  e.currentTarget.src = currentSong.thumbnail;
                }
              }}
              alt="bg" 
            />
          </div>

          <div className="fs-content">
            <div className="fs-left">
              <div className="fs-art-container" onMouseEnter={() => setShowWidgetOverlay(true)} onMouseLeave={() => setShowWidgetOverlay(false)}>
                <img 
                  key={currentSong?.id || 'art'} 
                  src={getHighResImage(currentSong?.thumbnail)} 
                  onError={(e) => {
                    if (e.currentTarget.src !== currentSong?.thumbnail && currentSong?.thumbnail) {
                      e.currentTarget.src = currentSong.thumbnail;
                    }
                  }}
                  alt="art" 
                  className="fs-art" 
                />

                <div className={`fs-art-overlay ${showWidgetOverlay ? 'visible' : ''}`}>
                  <div className="fs-overlay-top">
                    <button className="fs-overlay-btn" onClick={() => setIsWidgetMode(false)} title="Close Fullscreen"><X size={20} /></button>
                  </div>

                  <div className="fs-overlay-center">
                    <div className="fs-giant-heart" onClick={() => currentSong && toggleLike(currentSong)}>
                      <svg width="120" height="120" viewBox="0 0 24 24" fill={currentSong && isLiked(currentSong.id) ? '#ff6b9d' : 'none'} stroke={currentSong && isLiked(currentSong.id) ? '#ff6b9d' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </div>
                  </div>

                  <div className="fs-overlay-bottom">
                    <div className="fs-overlay-controls">
                      <button onClick={toggleShuffle} style={{ color: isShuffled ? 'var(--accent-primary)' : 'white' }}><Shuffle size={20} /></button>
                      <button onClick={handlePrev}><SkipBack size={24} fill="currentColor" /></button>
                      <button className="fs-overlay-play" onClick={togglePlay}>
                        {isPlaying ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" style={{ marginLeft: '6px' }} />}
                      </button>
                      <button onClick={handleNext}><SkipForward size={24} fill="currentColor" /></button>
                      <button onClick={toggleLoopMode} style={{ color: loopMode !== 'off' ? 'var(--accent-primary)' : 'white' }}>{loopMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}</button>
                    </div>

                    <div className="fs-overlay-progress">
                      <span>{formatTime(progress)}</span>
                      <div className="fs-overlay-progress-bar" onClick={handleSeek}>
                        <div className="fs-overlay-progress-fill" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}></div>
                      </div>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="fs-info">
                <div className="fs-title" title={currentSong ? currentSong.title : ""}>{currentSong ? currentSong.title : "No Music Playing"}</div>
                <div className="fs-artist">{currentSong ? currentSong.artist : 'Select a song'}</div>
              </div>
            </div>

            <div className="fs-right" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '32px', right: '32px', zIndex: 10, display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setShowRomanized(!showRomanized)} 
                  style={{ 
                    background: showRomanized ? 'rgba(255,255,255,0.2)' : 'transparent', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    color: 'white', 
                    fontSize: '12px', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s'
                  }}
                  title="Toggle Romanization"
                >
                  A/文
                </button>
              </div>
              <div className="fs-lyrics-container" ref={widgetLyricsRef} onWheel={handleUserScroll} onTouchMove={handleUserScroll} onMouseDown={handleUserScroll}>
                {lyricsData && lyricsData.length > 0 ? (
                  lyricsData.map((line, idx) => {
                    const nextLineTime = idx < lyricsData.length - 1 ? lyricsData[idx + 1].time : duration;
                    const isActive = (progress - lyricsOffset) >= line.time && (progress - lyricsOffset) < nextLineTime;
                    if (line.isInstrumental) return null;
                    return <div key={idx} data-lyric-idx={idx} className={`fs-lyric-line ${isActive ? 'active' : ''}`} onClick={() => jumpToLyric(line.time)}>{showRomanized && line.romanizedText ? line.romanizedText : line.text}</div>;
                  })
                ) : (
                  <div className="fs-lyric-line active">{plainLyrics || 'Instrumental'}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x, position: 'fixed', zIndex: 9999 }}>
          {!(isGuest && activePartyId) && (
            <div className="context-menu-item" onClick={() => {
              const newQ = [...queue];
              newQ.splice(currentIndex + 1, 0, contextMenu.song);
              setQueue(newQ);
              setOriginalQueue(newQ);
              showToast(t('toastPlayNext'));
            }}>
              <Play size={16} /> {t('playNext')}
            </div>
          )}
          <div className="context-menu-item" onClick={async () => {
            if (isGuest && activePartyId) {
              await (window as any).electronAPI.sendQueueRequest(activePartyId, discordUser?.id, discordUser?.global_name || discordUser?.username, contextMenu.song);
              showToast(`Berhasil meminta Host untuk menambahkan "${contextMenu.song.title}" ke antrean!`, 'success');
              setContextMenu(null);
              return;
            }
            setQueue(prev => [...prev, contextMenu.song]);
            setOriginalQueue(prev => [...prev, contextMenu.song]);
            if (currentIndex === -1) {
              setCurrentIndex(0);
              executePlay(contextMenu.song);
            } else {
              showToast(t('toastAddedToQueue'));
            }
          }}>
            <ListMusic size={16} /> {t('addToQueue')}
          </div>
          <div className="context-menu-item" onClick={() => {
            setAddToPlaylistSong(contextMenu.song);
            setContextMenu(null);
          }}>
            <FolderPlus size={16} /> {t('addToPlaylist')}
          </div>
          <div className="context-menu-item" onClick={() => {
            if ((window as any).electronAPI?.cacheAudio) {
              const streamUrl = `${API_BASE_URL}/api/stream?id=${contextMenu.song.id}`;
              (window as any).electronAPI.cacheAudio(contextMenu.song, streamUrl);
            } else {
              showToast(t('downloadDesktopOnly'), 'error');
            }
            setContextMenu(null);
          }}>
            <DownloadCloud size={16} /> {t('downloadSong')}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
