import React, { useState, useRef, useEffect } from 'react';
import { Home, Library, Plus, Mic2, Settings, Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, VolumeX, ListMusic, UserCircle, ChevronRight, Search, Bell, AlertCircle, Headset, Loader2, Maximize2, X, ChevronLeft, Music, PanelRight, Trash2, Heart, LogIn, LogOut, Check, FolderPlus, Radio } from 'lucide-react';
import './index.css';

const API_BASE_URL = 'http://179.41.4.182:7097';
// ⚠️ Ganti dengan Client ID dari Discord Developer Portal Anda
const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '';
const DISCORD_REDIRECT_URI = window.location.origin + '/callback';

type Page = 'home' | 'library' | 'playlist' | 'playlist-detail' | 'settings';

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

function App() {
  // ─── Page Navigation ────────────────────────────────────────
  const [activePage, setActivePage] = useState<Page>('home');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // ─── Search ─────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastData, setToastData] = useState<{ msg: string; icon: React.ReactNode; type: 'success' | 'error' } | null>(null);

  // ─── Real Data ──────────────────────────────────────────────
  const [playHistory, setPlayHistory] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('donpollo_history') || '[]'); } catch { return []; }
  });
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // ─── Discord Auth ────────────────────────────────────────────
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(() => {
    try { return JSON.parse(localStorage.getItem('donpollo_user') || 'null'); } catch { return null; }
  });

  // ─── Playlists ──────────────────────────────────────────────
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        if ((window as any).electronAPI) {
          const dbPlaylists = await (window as any).electronAPI.getPlaylists(discordUser?.id);
          setPlaylists(dbPlaylists || []);
        }
      } catch (e) {
        console.error("Gagal mengambil playlist dari database", e);
      }
    };
    fetchPlaylists();
  }, [discordUser]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<any | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);
  const [isEditingPlaylistName, setIsEditingPlaylistName] = useState(false);
  const [editPlaylistNameValue, setEditPlaylistNameValue] = useState('');
  const [showAvatarPrompt, setShowAvatarPrompt] = useState(false);
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('');
  const [playlistSearchResults, setPlaylistSearchResults] = useState<any[]>([]);
  const [isPlaylistSearching, setIsPlaylistSearching] = useState(false);
  const [likedSongs, setLikedSongs] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('donpollo_liked') || '[]'); } catch { return []; }
  });

  // ─── Settings ────────────────────────────────────────────────
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('donpollo_settings') || '{}'); } catch { return {}; }
  });

  // ─── Player State ────────────────────────────────────────────
  const [currentSong, setCurrentSong] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(settings.volume ?? 1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isWidgetMode, setIsWidgetMode] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  // ─── Lyrics ──────────────────────────────────────────────────
  const [lyricsData, setLyricsData] = useState<{ time: number, text: string, isInstrumental?: boolean }[] | null>(null);
  const [plainLyrics, setPlainLyrics] = useState<string>('');
  const [lyricsOffset, setLyricsOffset] = useState<number>(0);
  const sidebarLyricsRef = useRef<HTMLDivElement>(null);
  const widgetLyricsRef = useRef<HTMLDivElement>(null);

  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWidgetOverlay, setShowWidgetOverlay] = useState(false);

  // ─── Queue ───────────────────────────────────────────────────
  const [queue, setQueue] = useState<any[]>([]);
  const [originalQueue, setOriginalQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isShuffled, setIsShuffled] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ─── Autoplay & Context Menu ────────────────────────────────
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, song: any } | null>(null);

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null);
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, []);

  // ─── Persist Data ────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('donpollo_history', JSON.stringify(playHistory));
  }, [playHistory]);

  useEffect(() => {
    // MySQL handles playlists, no local storage syncing needed.
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('donpollo_liked', JSON.stringify(likedSongs));
  }, [likedSongs]);

  useEffect(() => {
    localStorage.setItem('donpollo_settings', JSON.stringify({ ...settings, volume }));
  }, [settings, volume]);

  // ─── Recommendations ─────────────────────────────────────────
  useEffect(() => {
    const fetchRecs = async () => {
      let query = 'Pop Hits 2024';
      if (playHistory.length > 0) query = playHistory[0].artist || playHistory[0].title;
      try {
        const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query + ' official audio')}`);
        const data = await response.json();
        if (data.results) setRecommendations(data.results.slice(0, 10));
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
            showToast(`Selamat datang, ${user.global_name || user.username}!`, 'user');
            window.history.replaceState(null, '', window.location.pathname);
            setActivePage('home');
          })
          .catch(() => showToast('Gagal mengambil data profil Discord.'));
      }
    }
  }, []);

  // ─── Audio Setup ─────────────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleEnded = () => handleNextRef.current();
    const handleError = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.loop = isLooping;
    }
  }, [volume, isMuted, isLooping]);

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
    setTimeout(() => setToastData(null), 4000);
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
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
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
      songs: [],
      createdAt: Date.now(),
      discordId: discordUser?.id || '',
    };
    
    if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(newPl);

    setPlaylists(prev => [newPl, ...prev]);
    setNewPlaylistName('');
    setShowCreatePlaylist(false);
    showToast(`Playlist "${newPl.name}" berhasil dibuat!`, 'playlist');
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
    showToast('Lagu ditambahkan ke playlist!', 'playlist');
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
    showToast('Playlist dihapus.');
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
      showToast('Gagal mencari lagu');
    }
    setIsPlaylistSearching(false);
  };

  // ─── Discord Auth Functions ──────────────────────────────────
  const loginWithDiscord = () => {
    const scope = encodeURIComponent('identify');
    const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=token&scope=${scope}`;
    window.location.href = url;
  };

  const logoutDiscord = () => {
    setDiscordUser(null);
    localStorage.removeItem('donpollo_user');
    localStorage.removeItem('donpollo_discord_token');
    showToast('Berhasil keluar dari Discord.');
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

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const query = customQuery || searchQuery;
    if (!query.trim()) return;
    if (activePage !== 'home') setActivePage('home');
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query + ' official audio')}`);
      const data = await response.json();
      if (data.results) setSearchResults(data.results);
    } catch {
      showToast('Gagal terhubung ke server pencarian.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLyrics = async (title: string, artist: string, songDuration = 0) => {
    setPlainLyrics('Sedang mencari lirik...');
    setLyricsData(null);
    try {
      let cleanTitle = title.replace(/\(.*?\)|\[.*?\]|【.*?】/g, '').replace(/(official|music|video|audio|lyric|lyrics|remastered|remaster|hd|hq)/gi, '').replace(/\|/g, '').trim();
      let finalArtist = artist.replace(/VEVO|Official|Topic/gi, '').trim();
      if (cleanTitle.includes('-')) {
        const parts = cleanTitle.split('-');
        finalArtist = parts[0].trim();
        cleanTitle = parts[1].trim();
      }
      const query = encodeURIComponent(`${cleanTitle} ${finalArtist}`);
      const data = await (await fetch(`https://lrclib.net/api/search?q=${query}`)).json();
      if (data && data.length > 0) {
        const syncedMatches = data.filter((item: any) => item.syncedLyrics);
        let bestMatch = syncedMatches[0] || data[0];
        if (songDuration > 0 && syncedMatches.length > 0) {
          syncedMatches.sort((a: any, b: any) => Math.abs((a.duration || 0) - songDuration) - Math.abs((b.duration || 0) - songDuration));
          bestMatch = syncedMatches[0];
          if (bestMatch.duration) {
            const diff = songDuration - bestMatch.duration;
            if (diff > 4 && diff < 30) setLyricsOffset(diff);
          }
        }
        if (bestMatch.syncedLyrics) {
          const parsed = parseLRC(bestMatch.syncedLyrics);
          if (parsed) setLyricsData(parsed);
          else setPlainLyrics(bestMatch.plainLyrics || 'Lirik tidak berformat LRC.');
        } else if (bestMatch.plainLyrics) {
          setPlainLyrics(bestMatch.plainLyrics);
        } else {
          setPlainLyrics('Lirik tidak ditemukan.');
        }
      } else {
        setPlainLyrics('Lirik tidak ditemukan.');
      }
    } catch {
      setPlainLyrics('Gagal mengambil lirik.');
    }
  };

  const executePlay = async (song: any) => {
    try {
      setLyricsData(null);
      setLyricsOffset(0);
      fetchLyrics(song.title, song.artist, song.duration || 0);
      const data = await (await fetch(`${API_BASE_URL}/api/stream?id=${song.id}&raw=true`)).json();
      if (data.url && audioRef.current) {
        setCurrentSong(song);
        setDuration(song.duration || 0);
        audioRef.current.src = `${API_BASE_URL}/api/stream?id=${song.id}`;
        audioRef.current.play().catch(async (err) => {
          if (err.name === 'AbortError') return;
          showToast('Server utama diblokir. Mengalihkan ke server cadangan...');
          try {
            const pipedData = await (await fetch(`https://pipedapi.kavin.rocks/streams/${song.id}`)).json();
            if (pipedData.error) throw new Error(pipedData.error);
            const bestAudio = pipedData.audioStreams?.find((s: any) => s.mimeType?.includes('audio/mp4')) || pipedData.audioStreams?.[0];
            if (bestAudio?.url) {
              audioRef.current!.src = bestAudio.url;
              await audioRef.current!.play();
              setIsPlaying(true);
              showToast('Terhubung ke server cadangan!', 'music');
            } else throw new Error('Format tidak didukung.');
          } catch {
            showToast('Gagal total: Video ini dikunci ketat oleh YouTube.');
            setIsPlaying(false);
          }
        });
        setIsPlaying(true);
      }
    } catch (err: any) {
      showToast(`Error: ${err.message}`);
    }
  };

  const startPlayingFromList = (list: any[], startIndex: number) => {
    const song = list[startIndex];
    setOriginalQueue([...list]);
    if (isShuffled) {
      const others = list.filter((_, i) => i !== startIndex);
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      setQueue([song, ...others]);
      setCurrentIndex(0);
    } else {
      setQueue([...list]);
      setCurrentIndex(startIndex);
    }
    setPlayHistory(prev => [song, ...prev.filter(item => item.id !== song.id)].slice(0, 20));
    executePlay(song);
  };

  const handleNextRef = useRef<() => void>(() => { });
  const handleNext = async () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
      executePlay(queue[currentIndex + 1]);
    } else if (isAutoplay && currentSong) {
      try {
        const query = encodeURIComponent(currentSong.artist);
        const response = await fetch(`${API_BASE_URL}/api/search?q=${query}`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const validSongs = data.results.filter((s: any) => s.id !== currentSong.id && !queue.find(q => q.id === s.id));
          if (validSongs.length > 0) {
            const next = validSongs[Math.floor(Math.random() * validSongs.length)];
            setQueue(prev => [...prev, next]);
            setOriginalQueue(prev => [...prev, next]);
            setCurrentIndex(queue.length);
            executePlay(next);
          } else {
            setIsPlaying(false);
          }
        } else {
          setIsPlaying(false);
        }
      } catch (e) {
        console.error("Autoplay fetch error", e);
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(false);
    }
  };
  handleNextRef.current = handleNext;

  const playSingleSong = (song: any) => {
    setQueue([song]);
    setOriginalQueue([song]);
    setCurrentIndex(0);
    setPlayHistory(prev => [song, ...prev.filter(item => item.id !== song.id)].slice(0, 20));
    executePlay(song);
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
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

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

  // ═══════════════════════════════════════════════════════════════
  // PAGE RENDERERS
  // ═══════════════════════════════════════════════════════════════

  const renderLibraryPage = () => (
    <div className="page-content">
      <div className="page-header">
        <h1>Koleksi Saya</h1>
        <p className="page-subtitle">{playHistory.length} lagu dari riwayat putar</p>
      </div>

      {likedSongs.length > 0 && (
        <section className="home-section">
          <div className="section-header">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Heart size={24} fill="#ff6b9d" color="#ff6b9d" /> Lagu Disukai</h2>
            <span className="show-all" onClick={() => startPlayingFromList(likedSongs, 0)}>Play All</span>
          </div>
          <div className="library-list">
            {likedSongs.map((song, i) => (
              <div key={i} className={`library-item ${currentSong?.id === song.id ? 'playing' : ''}`}>
                <div className="library-item-art" onClick={() => startPlayingFromList(likedSongs, i)}>
                  <img src={song.thumbnail} alt={song.title} />
                  <div className="library-item-play"><Play size={16} fill="currentColor" /></div>
                </div>
                <div className="library-item-info" onClick={() => startPlayingFromList(likedSongs, i)}>
                  <div className="library-item-title">{song.title}</div>
                  <div className="library-item-artist">{song.artist}</div>
                </div>
                <div className="library-item-duration">{formatTime(song.duration)}</div>
                <button className="library-item-action liked" onClick={() => toggleLike(song)} title="Hapus dari Disukai">
                  <Heart size={16} fill="currentColor" />
                </button>
                <button className="library-item-action" onClick={() => setAddToPlaylistSong(song)} title="Tambah ke Playlist">
                  <FolderPlus size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {playHistory.length > 0 ? (
        <section className="home-section">
          <div className="section-header">
            <h2>Riwayat Putar</h2>
            <span className="show-all" onClick={() => { setPlayHistory([]); showToast('Riwayat dihapus.'); }}>Hapus Semua</span>
          </div>
          <div className="library-list">
            {playHistory.map((song, i) => (
              <div key={i} className={`library-item ${currentSong?.id === song.id ? 'playing' : ''}`}>
                <div className="library-item-art" onClick={() => startPlayingFromList(playHistory, i)}>
                  <img src={song.thumbnail} alt={song.title} />
                  <div className="library-item-play"><Play size={16} fill="currentColor" /></div>
                </div>
                <div className="library-item-info" onClick={() => startPlayingFromList(playHistory, i)}>
                  <div className="library-item-title">{song.title}</div>
                  <div className="library-item-artist">{song.artist}</div>
                </div>
                <div className="library-item-duration">{formatTime(song.duration)}</div>
                <button className={`library-item-action ${isLiked(song.id) ? 'liked' : ''}`} onClick={() => toggleLike(song)} title="Sukai">
                  <Heart size={16} fill={isLiked(song.id) ? 'currentColor' : 'none'} />
                </button>
                <button className="library-item-action" onClick={() => setAddToPlaylistSong(song)} title="Tambah ke Playlist">
                  <FolderPlus size={16} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="empty-state">
          <Music size={64} color="var(--text-muted)" />
          <h3>Koleksi Kosong</h3>
          <p>Putar lagu apa saja, dan mereka akan muncul di sini!</p>
        </div>
      )}
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
                  <img src={pl.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ListMusic size={48} color="var(--text-muted)" />
                )}
                <div className="avatar-overlay" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Ubah Gambar</span>
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
                    <button className="btn-primary" onClick={() => handleEditPlaylistName(pl.id)}>Simpan</button>
                    <button className="btn-secondary" onClick={() => setIsEditingPlaylistName(false)}>Batal</button>
                  </div>
                ) : (
                  <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {pl.name}
                    <button className="btn-icon" onClick={() => { setEditPlaylistNameValue(pl.name); setIsEditingPlaylistName(true); }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                  </h1>
                )}
                <p className="page-subtitle">{pl.songs.length} lagu</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
              {pl.songs.length > 0 && (
                <button className="btn-primary" onClick={() => startPlayingFromList(pl.songs, 0)}>
                  <Play size={16} fill="currentColor" /> Play All
                </button>
              )}
              <button className="btn-secondary" onClick={() => setPlaylistToDelete(pl.id)} style={{ color: '#ff5555' }}>
                <Trash2 size={16} /> Hapus
              </button>
            </div>
          </div>
          {pl.songs.length > 0 ? (
            <div className="library-list">
              {pl.songs.map((song, i) => (
                <div key={i} className={`library-item ${currentSong?.id === song.id ? 'playing' : ''}`}>
                  <div className="library-item-art" onClick={() => startPlayingFromList(pl.songs, i)}>
                    <img src={song.thumbnail} alt={song.title} />
                    <div className="library-item-play"><Play size={16} fill="currentColor" /></div>
                  </div>
                  <div className="library-item-info" onClick={() => startPlayingFromList(pl.songs, i)}>
                    <div className="library-item-title">{song.title}</div>
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
              <h3>Playlist Masih Kosong</h3>
              <p>Cari dan tambahkan lagu di bawah ini!</p>
            </div>
          )}

          {/* Search bar inside playlist */}
          <div className="playlist-search-section" style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Tambahkan lagu ke playlist ini</h2>
            <form onSubmit={handlePlaylistSearch} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <input 
                type="text" 
                placeholder="Cari lagu, artis, atau album..." 
                value={playlistSearchQuery}
                onChange={(e) => setPlaylistSearchQuery(e.target.value)}
                className="search-input"
                style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)' }}
              />
              <button type="submit" className="btn-primary" disabled={isPlaylistSearching}>
                {isPlaylistSearching ? 'Mencari...' : 'Cari'}
              </button>
            </form>
            
            {playlistSearchResults.length > 0 && (
              <div className="library-list">
                {playlistSearchResults.map((song, i) => (
                  <div key={i} className="library-item">
                    <div className="library-item-art">
                      <img src={song.thumbnail} alt={song.title} />
                    </div>
                    <div className="library-item-info">
                      <div className="library-item-title">{song.title}</div>
                      <div className="library-item-artist">{song.artist}</div>
                    </div>
                    <div className="library-item-duration">{formatTime(song.duration)}</div>
                    <button 
                      className="btn-secondary" 
                      onClick={() => addSongToPlaylist(pl.id, song)} 
                      disabled={pl.songs.some(s => s.id === song.id)}
                    >
                      {pl.songs.some(s => s.id === song.id) ? 'Ditambahkan' : 'Tambah'}
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
            <h1>Playlist Saya</h1>
            <p className="page-subtitle">{playlists.length} playlist</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreatePlaylist(true)}>
            <Plus size={16} /> Buat Playlist
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
                    <img src={pl.songs[0].thumbnail} alt={pl.name} />
                  ) : (
                    <div className="playlist-card-empty-art"><ListMusic size={32} color="var(--text-muted)" /></div>
                  )}
                  <div className="playlist-card-play"><Play size={20} fill="currentColor" /></div>
                </div>
                <div className="playlist-card-name">{pl.name}</div>
                <div className="playlist-card-count">{pl.songs.length} lagu</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <ListMusic size={64} color="var(--text-muted)" />
            <h3>Belum Ada Playlist</h3>
            <p>Buat playlist pertama Anda sekarang!</p>
          </div>
        )}
      </div>
    );
  };

  const renderSettingsPage = () => (
    <div className="page-content">
      <div className="page-header">
        <h1>Pengaturan</h1>
      </div>

      {/* Akun Discord */}
      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserCircle size={20} color="var(--accent-primary)" /> Akun</div>
        {discordUser ? (
          <div className="settings-account-card">
            {getDiscordAvatar(discordUser) ? (
              <img src={getDiscordAvatar(discordUser)!} alt="avatar" className="settings-avatar" />
            ) : (
              <div className="settings-avatar-placeholder">{(discordUser.global_name || discordUser.username).charAt(0).toUpperCase()}</div>
            )}
            <div className="settings-account-info">
              <div className="settings-account-name">{discordUser.global_name || discordUser.username}</div>
              <div className="settings-account-sub">@{discordUser.username}#{discordUser.discriminator} • Login dengan Discord</div>
            </div>
            <button className="btn-secondary" onClick={logoutDiscord} style={{ marginLeft: 'auto' }}>
              <LogOut size={16} /> Keluar
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
              <div className="settings-account-name">Belum Login</div>
              <div className="settings-account-sub">Login untuk menyinkronkan data antar perangkat</div>
            </div>
            <button className="btn-primary" onClick={loginWithDiscord} style={{ marginLeft: 'auto' }}>
              <LogIn size={16} /> Login Discord
            </button>
          </div>
        )}
      </div>

      {/* Audio */}
      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Volume2 size={20} color="var(--accent-primary)" /> Audio</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Volume Default</div>
            <div className="settings-desc">Volume yang digunakan saat aplikasi pertama dibuka</div>
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
            <div className="settings-label">Kualitas Audio</div>
            <div className="settings-desc">Preferensi kualitas stream dari YouTube</div>
          </div>
          <select className="settings-select"
            value={settings.audioQuality || 'auto'}
            onChange={e => setSettings((p: any) => ({ ...p, audioQuality: e.target.value }))}>
            <option value="auto">Auto (Direkomendasikan)</option>
            <option value="high">Tinggi (160kbps)</option>
            <option value="medium">Sedang (128kbps)</option>
          </select>
        </div>
      </div>

      {/* Tampilan */}
      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} color="var(--accent-primary)" /> Tampilan</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Auto-tampilkan Lirik</div>
            <div className="settings-desc">Buka panel lirik otomatis saat lagu diputar</div>
          </div>
          <button className={`settings-toggle ${settings.autoLyrics ? 'on' : ''}`}
            onClick={() => setSettings((p: any) => ({ ...p, autoLyrics: !p.autoLyrics }))}>
            {settings.autoLyrics && <Check size={14} />}
          </button>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Panel Kanan Otomatis Terbuka</div>
            <div className="settings-desc">Tampilkan Queue/Lirik panel saat aplikasi dibuka</div>
          </div>
          <button className={`settings-toggle ${settings.autoSidebar !== false ? 'on' : ''}`}
            onClick={() => setSettings((p: any) => ({ ...p, autoSidebar: !(p.autoSidebar !== false) }))}>
            {settings.autoSidebar !== false && <Check size={14} />}
          </button>
        </div>
      </div>

      {/* Data */}
      <div className="settings-section">
        <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Library size={20} color="var(--accent-primary)" /> Data</div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Riwayat Putar</div>
            <div className="settings-desc">{playHistory.length} lagu tersimpan</div>
          </div>
          <button className="btn-secondary" onClick={() => { setPlayHistory([]); showToast('Riwayat dihapus.'); }}>
            <Trash2 size={14} /> Hapus Riwayat
          </button>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Playlist</div>
            <div className="settings-desc">{playlists.length} playlist tersimpan</div>
          </div>
          <button className="btn-secondary" onClick={() => { setPlaylists([]); showToast('Semua playlist dihapus.'); }}>
            <Trash2 size={14} /> Hapus Semua Playlist
          </button>
        </div>
        <div className="settings-row">
          <div>
            <div className="settings-label">Versi Aplikasi</div>
            <div className="settings-desc">Don Pollo Music Desktop</div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>v1.0.0</span>
        </div>
      </div>
    </div>
  );

  const renderHomePage = () => (
    <div className="main-scroll">
      {searchResults.length === 0 ? (
        <div className="home-dashboard">
          <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '16px' }}>{getGreeting()}</div>

          {playHistory.length > 0 && (
            <div className="quick-picks-grid" style={{ marginTop: '16px' }}>
              {playHistory.slice(0, 6).map((item, i) => (
                <div key={i} className="quick-pick-card" onClick={() => startPlayingFromList(playHistory, i)} onContextMenu={(e) => handleContextMenu(e, item)}>
                  <img src={item.thumbnail} alt={item.title} />
                  <span className="quick-pick-title">{item.title}</span>
                  <button className="quick-play-btn"><Play size={20} fill="currentColor" style={{ marginLeft: '2px' }} /></button>
                </div>
              ))}
            </div>
          )}

          {playHistory.length > 0 && (
            <section className="home-section">
              <div className="section-header">
                <h2>Recently Played</h2>
                <span className="show-all" onClick={() => setActivePage('library')}>Show all</span>
              </div>
              <div className="card-scroll-container">
                {playHistory.map((item, i) => (
                  <div key={i} className="music-card" onClick={() => startPlayingFromList(playHistory, i)} onContextMenu={(e) => handleContextMenu(e, item)}>
                    <div className="card-image-container">
                      <img src={item.thumbnail} alt={item.title} />
                      <button className="card-play-btn"><Play size={24} fill="currentColor" style={{ marginLeft: '4px' }} /></button>
                    </div>
                    <div className="card-title">{item.title}</div>
                    <div className="card-subtitle">{item.artist}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {recommendations.length > 0 && (
            <section className="home-section">
              <div className="section-header">
                <h2>{playHistory.length > 0 ? `More like ${playHistory[0].artist}` : 'Recommended for today'}</h2>
                <span className="show-all">Show all</span>
              </div>
              <div className="card-scroll-container">
                {recommendations.map((item, i) => (
                  <div key={i} className="music-card" onClick={() => startPlayingFromList(recommendations, i)} onContextMenu={(e) => handleContextMenu(e, item)}>
                    <div className="card-image-container">
                      <img src={item.thumbnail} alt={item.title} />
                      <button className="card-play-btn"><Play size={24} fill="currentColor" style={{ marginLeft: '4px' }} /></button>
                    </div>
                    <div className="card-title">{item.title}</div>
                    <div className="card-subtitle">{item.artist}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <>
          <div className="hero-section">
            <div className="hero-art-container">
              <div className="hero-glow"></div>
              {currentSong ? (
                <img src={currentSong.thumbnail} className="hero-art" alt="album art" />
              ) : searchResults.length > 0 ? (
                <img src={searchResults[0].thumbnail} className="hero-art" alt="album art" />
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
                  <h1 className="hero-title">{currentSong.title}</h1>
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
          {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 size={32} className="spin" color="var(--accent-primary)" /></div>}
          {!isLoading && searchResults.length > 0 && (
            <div className="tracklist-container">
              {searchResults.map((song, idx) => (
                <div key={idx} className={`tracklist-item ${currentSong?.id === song.id ? 'playing' : ''}`} onClick={() => playSingleSong(song)} onContextMenu={(e) => handleContextMenu(e, song)}>
                  <div className="track-index">{currentSong?.id === song.id && isPlaying ? <Headset size={16} /> : (idx + 1)}</div>
                  <div className="track-title">{song.title}</div>
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
        <div className="login-bg">
          <div className="login-bg-orb login-bg-orb-1" />
          <div className="login-bg-orb login-bg-orb-2" />
          <div className="login-bg-orb login-bg-orb-3" />
        </div>
        <div className="login-card">
          <div className="login-logo">
            <img src="https://donpollobot.vercel.app/donpollo-icon.jpg" alt="Don Pollo" />
          </div>
          <div className="login-title">Don Pollo Music</div>
          <div className="login-subtitle">
            Dengarkan musik favorit Anda dengan pengalaman yang<br />elegan dan penuh fitur.
          </div>
          <div className="login-features">
            <div className="login-feature"><span style={{ display: 'flex' }}><Music size={20} color="var(--accent-primary)" /></span> Streaming musik tanpa batas</div>
            <div className="login-feature"><span style={{ display: 'flex' }}><Mic2 size={20} color="var(--accent-primary)" /></span> Lirik tersinkron real-time</div>
            <div className="login-feature"><span style={{ display: 'flex' }}><ListMusic size={20} color="var(--accent-primary)" /></span> Playlist & Koleksi pribadi</div>
            <div className="login-feature"><span style={{ display: 'flex' }}><Maximize2 size={20} color="var(--accent-primary)" /></span> Mini player yang elegan</div>
          </div>
          <button className="login-btn-discord" onClick={loginWithDiscord}>
            <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="white" style={{ flexShrink: 0 }}>
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
            </svg>
            Login dengan Discord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Toast */}
      {toastData && (
        <div className={`toast-popup ${toastData.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toastData.icon}
          {toastData.msg}
        </div>
      )}

      {/* Modal: Hapus Playlist */}
      {playlistToDelete && (
        <div className="modal-overlay" onClick={() => setPlaylistToDelete(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Hapus Playlist?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Tindakan ini tidak dapat dibatalkan.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setPlaylistToDelete(null)}>Batal</button>
              <button className="btn-primary" style={{ backgroundColor: '#ff5555', color: 'white' }} onClick={() => deletePlaylist(playlistToDelete)}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ubah Avatar Playlist */}
      {showAvatarPrompt && (
        <div className="modal-overlay" onClick={() => setShowAvatarPrompt(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Ubah Gambar Playlist</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>Masukkan URL gambar dari internet (opsional). Biarkan kosong untuk menghapus.</p>
            <input
              className="modal-input"
              type="text"
              placeholder="https://contoh.com/gambar.jpg"
              value={avatarUrlInput}
              onChange={e => setAvatarUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && activePlaylistId && handleUpdatePlaylistAvatar(activePlaylistId)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAvatarPrompt(false)}>Batal</button>
              <button className="btn-primary" onClick={() => activePlaylistId && handleUpdatePlaylistAvatar(activePlaylistId)}>Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Buat Playlist */}
      {showCreatePlaylist && (
        <div className="modal-overlay" onClick={() => setShowCreatePlaylist(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Buat Playlist Baru</h3>
            <input
              className="modal-input"
              type="text"
              placeholder="Nama playlist..."
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createPlaylist()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreatePlaylist(false)}>Batal</button>
              <button className="btn-primary" onClick={createPlaylist} disabled={!newPlaylistName.trim()}>Buat</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah ke Playlist */}
      {addToPlaylistSong && (
        <div className="modal-overlay" onClick={() => setAddToPlaylistSong(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Tambah ke Playlist</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>"{addToPlaylistSong.title}"</p>
            {playlists.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: 'var(--text-muted)' }}>Belum ada playlist.</p>
                <button className="btn-primary" style={{ marginTop: '12px' }} onClick={() => { setAddToPlaylistSong(null); setShowCreatePlaylist(true); }}>
                  <Plus size={16} /> Buat Playlist Baru
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
                        <img src={pl.songs[0].thumbnail} alt="" />
                      ) : (
                        <ListMusic size={16} color="var(--text-muted)" />
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{pl.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{pl.songs.length} lagu</div>
                    </div>
                    {pl.songs.some(s => s.id === addToPlaylistSong.id) && (
                      <Check size={16} color="var(--accent-primary)" style={{ marginLeft: 'auto' }} />
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setAddToPlaylistSong(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* TOP SECTION */}
      <div className="app-top-section" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT SIDEBAR */}
        <div className="nav-sidebar">
          <div className="nav-logo-container">
            <img src="https://donpollobot.vercel.app/donpollo-icon.jpg" alt="Don Pollo" className="nav-logo-img" />
            <span className="nav-logo-text">Don Pollo Music</span>
          </div>
          <div className="nav-menu">
            <div className={`nav-item ${activePage === 'home' ? 'active' : ''}`} onClick={goHome}>
              <Home size={24} /> <span className="nav-label">Beranda</span>
            </div>
            <div className={`nav-item ${(activePage === 'playlist' || activePage === 'playlist-detail') ? 'active' : ''}`} onClick={() => setActivePage('playlist')}>
              <ListMusic size={24} /> <span className="nav-label">Playlist</span>
            </div>
            <div className={`nav-item ${activePage === 'library' ? 'active' : ''}`} onClick={() => setActivePage('library')}>
              <Heart size={24} /> <span className="nav-label">Disukai</span>
            </div>
          </div>
          <div className="nav-bottom">
            <div className={`nav-item ${activePage === 'settings' ? 'active' : ''}`} onClick={() => setActivePage('settings')}>
              <Settings size={24} /> <span className="nav-label">Pengaturan</span>
            </div>
            <button className="user-profile-btn" onClick={() => setActivePage('settings')} title={discordUser ? `${discordUser.global_name || discordUser.username}` : 'Login'}>
              <div className="user-avatar">
                {discordUser && getDiscordAvatar(discordUser) ? (
                  <img src={getDiscordAvatar(discordUser)!} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <span>{discordUser ? (discordUser.global_name || discordUser.username).charAt(0).toUpperCase() : 'DP'}</span>
                )}
              </div>
              <span className="nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {discordUser ? (discordUser.global_name || discordUser.username) : 'Guest'}
              </span>
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-area">
          {/* Top Bar */}
          <div className="top-bar">
            <div className="nav-arrows">
              <button className="arrow-btn" onClick={goHome}><ChevronLeft size={20} /></button>
              <button className="arrow-btn"><ChevronRight size={20} /></button>
            </div>
            <div className="search-container">
              <form onSubmit={handleSearch}>
                <Search size={16} className="search-icon" />
                <input type="text" className="search-input" placeholder="Cari lagu, artis, album..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </form>
            </div>
            <div className="bell-icon"><Bell size={20} /><div className="bell-dot"></div></div>
          </div>

          {/* Page Router */}
          {activePage === 'home' && renderHomePage()}
          {activePage === 'library' && (
            <div className="main-scroll">{renderLibraryPage()}</div>
          )}
          {(activePage === 'playlist' || activePage === 'playlist-detail') && (
            <div className="main-scroll">{renderPlaylistPage()}</div>
          )}
          {activePage === 'settings' && (
            <div className="main-scroll">{renderSettingsPage()}</div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        {isRightSidebarOpen && (
          <div className="right-sidebar" style={showLyrics && currentSong ? {
            backgroundImage: `url(${currentSong.thumbnail})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative'
          } : undefined}>
            {showLyrics && currentSong && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(30, 31, 34, 0.5)',
                backdropFilter: 'blur(80px)',
                WebkitBackdropFilter: 'blur(80px)',
                zIndex: 0
              }}></div>
            )}
            <div className="sidebar-header" style={{ position: 'relative', zIndex: 1 }}>
              <div>
                <div className="sidebar-title">{showLyrics ? 'Lyrics' : 'Queue'}</div>
                <div className="sidebar-subtitle">
                  {showLyrics ? (currentSong ? currentSong.title : 'No song') : `${Math.max(0, queue.length - Math.max(0, currentIndex))} songs • ${formatTime(queue.slice(Math.max(0, currentIndex)).reduce((acc, s) => acc + (s.duration || 0), 0))}`}
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

            {showLyrics ? (
              <div className="lyrics-mode" style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Sync</div>
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <button onClick={() => setLyricsOffset(prev => prev - 0.5)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer' }}>-0.5s</button>
                    <div style={{ backgroundColor: 'var(--accent-primary)', color: 'white', fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>{lyricsOffset}s</div>
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
                          {line.text}
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
                {queue.map((song, idx) => {
                  if (idx < currentIndex) return null;
                  const isPlayingNow = currentSong?.id === song.id;
                  return (
                    <div key={idx} className={`queue-item ${isPlayingNow ? 'playing' : ''}`} onClick={() => { setCurrentIndex(idx); executePlay(song); }}>
                      <img src={song.thumbnail} alt={song.title} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: isPlayingNow ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{song.artist}</div>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatTime(song.duration)}</div>
                    </div>
                  );
                })}
                {queue.length > 0 && (
                  <div className="clear-queue" onClick={() => { setQueue([]); setOriginalQueue([]); setCurrentIndex(-1); }}>Clear Queue</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM PLAYER BAR */}
      {!isWidgetMode && (
        <div className="bottom-player-bar">
          <div className="player-left">
            {currentSong ? (
              <>
                <img src={currentSong.thumbnail} className="player-cover" alt="cover" />
                <div className="player-info">
                  <span className="player-title" style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>{currentSong.title}</span>
                  <span className="player-artist" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{currentSong.artist}</span>
                </div>
                <button className={`chat-btn ${isLiked(currentSong.id) ? 'liked' : ''}`} style={{ color: isLiked(currentSong.id) ? '#ff6b9d' : 'var(--text-secondary)', marginLeft: '12px' }} onClick={() => toggleLike(currentSong)}>
                  <Heart size={16} fill={isLiked(currentSong.id) ? 'currentColor' : 'none'} />
                </button>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Belum ada lagu</div>
            )}
          </div>
          <div className="player-center">
            <div className="player-controls">
              <button className="chat-btn" onClick={toggleShuffle} style={{ color: isShuffled ? 'var(--accent-primary)' : 'var(--text-secondary)' }}><Shuffle size={18} /></button>
              <button className="chat-btn" onClick={handlePrev} disabled={currentIndex <= 0} style={{ opacity: currentIndex <= 0 ? 0.3 : 1 }}><SkipBack size={22} fill="currentColor" /></button>
              <button className="chat-play-btn" onClick={togglePlay} disabled={!currentSong}>
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '4px' }} />}
              </button>
              <button className="chat-btn" onClick={handleNext} disabled={currentIndex >= queue.length - 1 && !isAutoplay} style={{ opacity: (currentIndex >= queue.length - 1 && !isAutoplay) ? 0.3 : 1 }}><SkipForward size={22} fill="currentColor" /></button>
              <button className="chat-btn" onClick={() => setIsLooping(!isLooping)} style={{ color: isLooping ? 'var(--accent-primary)' : 'var(--text-secondary)' }}><Repeat size={18} /></button>
              <button className="chat-btn" onClick={() => setIsAutoplay(!isAutoplay)} style={{ color: isAutoplay ? 'var(--accent-primary)' : 'var(--text-secondary)' }} title="Smart Autoplay"><Radio size={18} /></button>
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
            <button className="chat-btn" onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)} style={{ color: isRightSidebarOpen ? 'var(--accent-primary)' : 'var(--text-secondary)' }} title="Right Sidebar">
              <PanelRight size={20} />
            </button>
            <button className="chat-btn" onClick={() => setIsWidgetMode(true)} title="Mini Player"><Maximize2 size={16} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
              <button className="chat-btn" onClick={() => setIsMuted(!isMuted)}>
                {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume}
                onChange={e => { setVolume(parseFloat(e.target.value)); if (isMuted) setIsMuted(false); }}
                style={{ width: '80px', height: '4px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }} />
            </div>
          </div>
        </div>
      )}

      {/* MINI PLAYER WIDGET */}
      {isWidgetMode && (
        <div className="floating-player">
          <div className="fp-background">
            <img src={currentSong?.thumbnail || 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?auto=format&fit=crop&w=300&q=80'} alt="bg" />
          </div>
          <div className="fp-content">
            <div className="fp-header">
              <img src={currentSong?.thumbnail || 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?auto=format&fit=crop&w=150&q=80'} alt="art" />
              <div className="fp-header-info">
                <div className="fp-title">{currentSong ? currentSong.title : 'No Music Playing'}</div>
                <div className="fp-artist">{currentSong ? currentSong.artist : 'Select a song'}</div>
              </div>
            </div>
            <div className="fp-lyrics-container" ref={widgetLyricsRef} onWheel={handleUserScroll} onTouchMove={handleUserScroll} onMouseDown={handleUserScroll} style={{ overflowY: 'auto', scrollbarWidth: 'none' }}>
              {lyricsData && lyricsData.length > 0 ? (
                lyricsData.map((line, idx) => {
                  const nextLineTime = idx < lyricsData.length - 1 ? lyricsData[idx + 1].time : duration;
                  const isActive = (progress - lyricsOffset) >= line.time && (progress - lyricsOffset) < nextLineTime;
                  if (line.isInstrumental) return null;
                  return <div key={idx} data-lyric-idx={idx} className={`fp-lyric-line ${isActive ? 'active' : ''}`}>{line.text}</div>;
                })
              ) : (
                <div className="fp-lyric-line active">{plainLyrics || 'Instrumental'}</div>
              )}
            </div>
          </div>
          <div style={{ position: 'absolute', top: 16, left: 16, width: 48, height: 48, zIndex: 3, cursor: 'pointer' }}
            onMouseEnter={() => setShowWidgetOverlay(true)} />
          <div className="fp-overlay" style={{ opacity: showWidgetOverlay ? 1 : 0, pointerEvents: showWidgetOverlay ? 'auto' : 'none' }}
            onMouseLeave={() => setShowWidgetOverlay(false)}>
            <div className="fp-overlay-top">
              <button className="fp-overlay-btn" title="Library"><ListMusic size={16} /></button>
              <button className="fp-overlay-btn" onClick={() => setIsWidgetMode(false)} title="Close Mini Player"><X size={16} /></button>
            </div>
            <div className="fp-overlay-center">
              <div className="fp-giant-heart" onClick={() => currentSong && toggleLike(currentSong)}>
                <svg width="100" height="100" viewBox="0 0 24 24" fill={currentSong && isLiked(currentSong.id) ? '#ff6b9d' : 'none'} stroke={currentSong && isLiked(currentSong.id) ? '#ff6b9d' : 'currentColor'} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </div>
            </div>
            <div className="fp-overlay-bottom">
              <div className="fp-overlay-controls">
                <button onClick={toggleShuffle} style={{ color: isShuffled ? 'var(--accent-primary)' : 'white' }}><Shuffle size={18} /></button>
                <button onClick={handlePrev}><SkipBack size={20} fill="currentColor" /></button>
                <button className="fp-overlay-play" onClick={togglePlay}>
                  {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" style={{ marginLeft: '4px' }} />}
                </button>
                <button onClick={handleNext}><SkipForward size={20} fill="currentColor" /></button>
                <button onClick={() => setIsLooping(!isLooping)} style={{ color: isLooping ? 'var(--accent-primary)' : 'white' }}><Repeat size={18} /></button>
              </div>
              <div className="fp-overlay-progress">
                <span>{formatTime(progress)}</span>
                <div className="fp-overlay-progress-bar" onClick={handleSeek}>
                  <div className="fp-overlay-progress-fill" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}></div>
                </div>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x, position: 'fixed', zIndex: 9999 }}>
          <div className="context-menu-item" onClick={() => {
            const newQ = [...queue];
            newQ.splice(currentIndex + 1, 0, contextMenu.song);
            setQueue(newQ);
            setOriginalQueue(newQ);
            showToast('Ditambahkan untuk diputar selanjutnya');
          }}>
            <Play size={16} /> Play Next
          </div>
          <div className="context-menu-item" onClick={() => {
            setQueue(prev => [...prev, contextMenu.song]);
            setOriginalQueue(prev => [...prev, contextMenu.song]);
            if (currentIndex === -1) {
              setCurrentIndex(0);
              executePlay(contextMenu.song);
            } else {
              showToast('Ditambahkan ke antrean');
            }
          }}>
            <ListMusic size={16} /> Add to Queue
          </div>
          <div className="context-menu-item" onClick={() => {
            setAddToPlaylistSong(contextMenu.song);
            setContextMenu(null);
          }}>
            <FolderPlus size={16} /> Add to Playlist
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
