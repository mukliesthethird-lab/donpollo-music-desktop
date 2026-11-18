import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Home, Library, Plus, Mic2, Settings, Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Volume2, VolumeX, ListMusic, UserCircle, ChevronRight, Search, AlertCircle, Loader2, Maximize2, X, ChevronLeft, ChevronUp, ChevronDown, Music, PanelRight, Trash2, Heart, LogOut, Check, FolderPlus, Headphones, Download, DownloadCloud, WifiOff, CheckCircle2, Paintbrush, Clock, Trophy, MinusCircle, Share2, Copy, Smartphone, Lock, Map as MapIcon, Users, FileText, Film, Upload, Keyboard, MessageSquare, Languages } from 'lucide-react';
import './index.css';
import './themes.css';
import { createTranslator } from './translations';
import type { Language } from './translations';

const API_BASE_URL = 'http://179.41.4.182:7097';
import { SoundMap } from './components/SoundMap';
import { AudioVisualizer } from './components/AudioVisualizer';
import { CommandPalette } from './components/CommandPalette';
import { PartyChatOverlay } from './components/PartyChatOverlay';
import { ShortcutsModal } from './components/ShortcutsModal';
import { WrappedStoryModal } from './components/WrappedStoryModal';
import { FullscreenPlayer } from './components/FullscreenPlayer';
import { LibraryPage } from './pages/LibraryPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { ArtistPage } from './pages/ArtistPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { PlaylistPage } from './pages/PlaylistPage';
import { HomePage } from './pages/HomePage';
import { useMediaSession } from './hooks/useMediaSession';
import {
  renderMixIcon,
  getHighResImage,
  getCleanThumbnail,
  applyDragGhost,
  type Page,
  type Playlist,
  type DiscordUser,
} from './utils/mediaHelpers';
import { translateLyricsLines } from './utils/lyricsTranslator';
import { rankAudioResults, buildSmartSearchQuery, getAudioBadge, searchItunesTracks, formatTrackLikeSpotify, isUnwantedTrackVariant, userExplicitlyWantsAcoustic, userExplicitlyWantsRemix, userExplicitlyWantsLive, deduplicateTracks, cleanBaseSongTitle } from './utils/audioRanking';
import { generateAlgorithmicMix, DEFAULT_MADE_FOR_YOU_PLAYLISTS, VIBE_CONFIGS } from './utils/vibeRecommendation';
import type { VibeType } from './utils/vibeRecommendation';
import { getMixPlaylistCover, isMixPlaylist } from './utils/spotifyMixCover';
import { FEATURE_FLAGS } from './config/features';
// ⚠️ Ganti dengan Client ID dari Discord Developer Portal Anda
const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID || '';
// Redirect URI: otomatis pilih localhost (dev) atau Vercel (installed app)
const DISCORD_REDIRECT_URI = window.location.hostname === 'localhost'
  ? 'http://localhost:5173/callback.html'
  : 'https://donpollo-music-desktop.vercel.app/callback';

function App() {
  // ─── Page Navigation ────────────────────────────────────────
  const [activePage, setActivePage] = useState<Page>('home');
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeArtist, setActiveArtist] = useState<string | null>(null);
  const [activePodcastMeta, setActivePodcastMeta] = useState<{ podcastId?: string; feedUrl?: string } | null>(null);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lyricsRequestIdRef = useRef(0);
  const [wrappedData, setWrappedData] = useState<any>(null);

  useEffect(() => {
    if ((window as any).electronAPI?.getAnalytics) {
       (window as any).electronAPI.getAnalytics().then(setWrappedData);
    }
  }, []);

  // Navigation history stack (browser-like back/forward)
  type NavEntry = { page: Page; playlistId?: string | null; profileId?: string | null; artistName?: string | null; };
  const [navHistory, setNavHistory] = useState<NavEntry[]>([{ page: 'home' }]);
  const [navIndex, setNavIndex] = useState(0);

  const canGoBack = navIndex > 0;
  const canGoForward = navIndex < navHistory.length - 1;

  const fetchArtistSongsRef = useRef<((artist: string, filter: 'popular' | 'newest', isPodcast?: boolean, podcastId?: string, feedUrl?: string) => void) | null>(null);

  const navigate = (page: Page, opts?: { playlistId?: string | null; profileId?: string | null; artistName?: string | null }) => {
    const entry: NavEntry = { page, playlistId: opts?.playlistId ?? null, profileId: opts?.profileId ?? null, artistName: opts?.artistName ?? null };
    setNavHistory(prev => {
      const trimmed = prev.slice(0, navIndex + 1);
      return [...trimmed, entry];
    });
    setNavIndex(prev => prev + 1);
    setActivePage(page);
    if (opts?.playlistId !== undefined) setActivePlaylistId(opts.playlistId ?? null);
    if (opts?.profileId !== undefined) setActiveProfileId(opts.profileId ?? null);
    if (opts?.artistName !== undefined) setActiveArtist(opts.artistName ?? null);
  };

  const goBack = () => {
    if (!canGoBack) return;
    const prev = navHistory[navIndex - 1];
    setNavIndex(i => i - 1);
    setActivePage(prev.page);
    if (prev.playlistId !== undefined) setActivePlaylistId(prev.playlistId ?? null);
    if (prev.profileId !== undefined) setActiveProfileId(prev.profileId ?? null);
    if (prev.artistName !== undefined) {
      setActiveArtist(prev.artistName ?? null);
      if (prev.page === 'artist' && prev.artistName) {
        fetchArtistSongsRef.current?.(prev.artistName, 'popular', false);
      }
    }
  };

  const goForward = () => {
    if (!canGoForward) return;
    const next = navHistory[navIndex + 1];
    setNavIndex(i => i + 1);
    setActivePage(next.page);
    if (next.playlistId !== undefined) setActivePlaylistId(next.playlistId ?? null);
    if (next.profileId !== undefined) setActiveProfileId(next.profileId ?? null);
    if (next.artistName !== undefined) {
      setActiveArtist(next.artistName ?? null);
      if (next.page === 'artist' && next.artistName) {
        fetchArtistSongsRef.current?.(next.artistName, 'popular', false);
      }
    }
  };

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
  const [artistSongs, setArtistSongs] = useState<any[]>([]);
  const [artistFilter, setArtistFilter] = useState<'popular' | 'newest'>('popular');
  const [isArtistLoading, setIsArtistLoading] = useState(false);
  const [isRecentExpanded, setIsRecentExpanded] = useState(false);
  const [isIntExpanded, setIsIntExpanded] = useState(false);
  const [isIdExpanded, setIsIdExpanded] = useState(false);
  const [isJpExpanded, setIsJpExpanded] = useState(false);
  const [isKrExpanded, setIsKrExpanded] = useState(false);
  const [isLatinExpanded, setIsLatinExpanded] = useState(false);
  const [isLocalExpanded, setIsLocalExpanded] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);

  // ─── Settings ────────────────────────────────────────────────
  const [settings, setSettings] = useState<any>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('donpollo_settings') || '{}');
      return {
        theme: 'default',
        layoutMode: 'left',
        fontFamily: 'Inter',
        borderRadiusMode: 'rounded',
        audioOutputDeviceId: 'default',
        searchCountry: 'auto',
        prioritizeOfficialAudio: true,
        vibeCheckEnabled: true,
        vibeCheckInterval: 15,
        autoplay: true,
        ...saved
      };
    } catch { return { theme: 'default', audioOutputDeviceId: 'default', searchCountry: 'auto', prioritizeOfficialAudio: true, vibeCheckEnabled: true, vibeCheckInterval: 15, autoplay: true }; }
  });

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
        console.warn('Updater background error:', err);
        let cleanErr = err;
        if (typeof err === 'string') {
          if (err.includes('500') || err.includes('Server Error')) {
            cleanErr = 'Server pembaruan sedang sibuk (HTTP 500). Silakan coba lagi nanti.';
          } else if (err.includes('<!DOCTYPE') || err.includes('<html')) {
            cleanErr = 'Respon server tidak valid.';
          } else if (err.length > 100) {
            cleanErr = err.slice(0, 100) + '...';
          }
        }
        setUpdateInfo(prev => ({ ...prev, error: cleanErr, downloading: false }));
      });
    }
    return () => {
      if (unbind1) unbind1();
      if (unbind2) unbind2();
      if (unbind3) unbind3();
      if (unbind4) unbind4();
    };
  }, []);




  // ─── Podcast State ────────────────────────────────────────────
  const [homeMode, setHomeMode] = useState<'music' | 'podcast'>('music');
  const [topPodcasts, setTopPodcasts] = useState<any[]>([]); // Used for Hero
  const [podcastsUs, setPodcastsUs] = useState<any[]>([]);
  const [podcastsId, setPodcastsId] = useState<any[]>([]);
  const [podcastsJp, setPodcastsJp] = useState<any[]>([]);
  const [podcastsKr, setPodcastsKr] = useState<any[]>([]);
  const [podcastsLatin, setPodcastsLatin] = useState<any[]>([]);
  const [podcastHeroIndex, setPodcastHeroIndex] = useState(0);
  const [isArtistPodcast, setIsArtistPodcast] = useState(false);

  // ─── Debounced Search ───────────────────────────────────────
  const searchCacheRef = useRef<Record<string, any[]>>({});

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const cacheKey = `${searchQuery}_${homeMode}_${settings?.prioritizeOfficialAudio !== false}_${settings?.searchCountry || 'auto'}`;
    if (searchCacheRef.current[cacheKey]) {
      setSuggestions(searchCacheRef.current[cacheKey]);
      return;
    }

    const controller = new AbortController();
    const handler = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const isPodcast = homeMode === 'podcast';
        const preferAudio = settings?.prioritizeOfficialAudio !== false;
        let results: any[] = [];

        if (isPodcast) {
          // Podcast mode: Search iTunes podcasts directly (100% iTunes)
          const itunesSearchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&media=podcast&entity=podcast&limit=8`;
          let searchData: any = null;
          try {
            if ((window as any).electronAPI?.fetchUrl) {
              searchData = await (window as any).electronAPI.fetchUrl(itunesSearchUrl);
            } else {
              try {
                const res = await fetch(itunesSearchUrl, { signal: controller.signal });
                searchData = await res.json();
              } catch {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(itunesSearchUrl)}`;
                const res = await fetch(proxyUrl, { signal: controller.signal });
                searchData = await res.json();
              }
            }
          } catch (e) {
            console.error('iTunes podcast search error:', e);
          }

          if (typeof searchData === 'string') {
            try { searchData = JSON.parse(searchData); } catch {}
          }

          if (searchData?.results && Array.isArray(searchData.results)) {
            results = searchData.results.map((p: any) => ({
              id: String(p.collectionId || p.trackId || ''),
              podcastId: String(p.collectionId || p.trackId || ''),
              title: p.collectionName || p.trackName,
              artist: p.artistName,
              thumbnail: (p.artworkUrl600 || p.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg'),
              feedUrl: p.feedUrl,
              genre: p.primaryGenreName || (p.genres && p.genres[0]) || 'Podcast',
              isPodcast: true,
              isPodcastShow: true,
            }));
          }
        } else {
          // Music mode: Search official YouTube Music audio directly, formatted like Spotify
          const effectiveQuery = preferAudio ? buildSmartSearchQuery(searchQuery) : searchQuery;
          let res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(effectiveQuery)}`, { signal: controller.signal });
          let data = await res.json();
          results = data.results || [];

          // Fallback to plain query if audio query yielded zero results
          if (results.length === 0 && effectiveQuery !== searchQuery) {
            try {
              const fallbackRes = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}`, { signal: controller.signal });
              const fallbackData = await fallbackRes.json();
              results = fallbackData.results || [];
            } catch { }
          }

          if (preferAudio) {
            results = rankAudioResults(results, searchQuery);
          }

          // Format clean like Spotify: clean title, real artist, direct playable ID
          const wantsVariant = userExplicitlyWantsAcoustic(searchQuery) || userExplicitlyWantsRemix(searchQuery) || userExplicitlyWantsLive(searchQuery);
          let cleanedResults = results
            .filter((r: any) => r.duration > 0)
            .map((r: any) => formatTrackLikeSpotify(r, searchQuery));

          if (!wantsVariant) {
            const studioOnly = cleanedResults.filter((r: any) => !isUnwantedTrackVariant(r.title, r.artist));
            // Only filter if we have enough studio results; preserve all results otherwise
            if (studioOnly.length >= 2) {
              cleanedResults = studioOnly;
            }
          }
          results = cleanedResults.slice(0, 5);

          // Fallback to iTunes if YouTube returned < 3 results for better coverage of regional music
          if (results.length < 3 && preferAudio) {
            try {
              const itunesResults = await searchItunesTracks(
                searchQuery,
                5,
                (window as any).electronAPI?.fetchUrl,
                settings?.searchCountry === 'auto' ? undefined : settings?.searchCountry
              );
              if (itunesResults && itunesResults.length > 0) {
                // Merge: prepend iTunes results that aren't already in YouTube results
                const ytIds = new Set(results.map((r: any) => r.id).filter(Boolean));
                const newFromItunes = itunesResults.filter((r: any) => !r.id || !ytIds.has(r.id));
                results = [...newFromItunes, ...results].slice(0, 5);
              }
            } catch (err) {}
          }
        }

        setSuggestions(results);
        searchCacheRef.current[cacheKey] = results;
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
  }, [searchQuery, homeMode, settings?.prioritizeOfficialAudio, settings?.searchCountry]);

  // ─── Updater State ──────────────────────────────────────────
  const [updateStatus, setUpdateStatus] = useState<'none' | 'available' | 'downloading' | 'downloaded' | 'error'>('none');
  const [updateProgress, setUpdateProgress] = useState<number>(0);

  // ─── Listen Along State ─────────────────────────────────────
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [activePartyId, setActivePartyId] = useState<string | null>(null);
  const [popupPartyId, setPopupPartyId] = useState<string | null>(null);
  const hostMissCountRef = useRef<number>(0);
  const onlineUsersRef = useRef<any[]>([]);
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [cachePath, setCachePath] = useState<string>('');
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const savedGuestCrossfadeRef = useRef<string | null>(null);
  // Cache Discord user info so offline collaborators still show username/avatar
  // Persisted in localStorage so it survives app restarts
  const collabUserCacheRef = useRef<Record<string, { username: string; avatarUrl: string }>>(
    (() => { try { return JSON.parse(localStorage.getItem('donpollo_collab_user_cache') || '{}'); } catch { return {}; } })()
  );

  // ─── Profile & Social State ────────────────────────────────
  const [profileData, setProfileData] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [savedPlaylists, setSavedPlaylists] = useState<string[]>([]);
  const [playlistToRemove, setPlaylistToRemove] = useState<string | null>(null);
  const [userToKick, setUserToKick] = useState<{ id: string, name: string } | null>(null);
  const [showClearQueueConfirm, setShowClearQueueConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [showClearPlaylistsConfirm, setShowClearPlaylistsConfirm] = useState(false);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [draggedQueueIdx, setDraggedQueueIdx] = useState<number | null>(null);
  const [dragOverQueueIdx, setDragOverQueueIdx] = useState<number | null>(null);
  const [dragOverQueueList, setDragOverQueueList] = useState(false);
  const [shareCodeResult, setShareCodeResult] = useState<{ code: string; expiresAt: string } | null>(null);
  const [following, setFollowing] = useState<string[]>([]);
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [bannerInputUrl, setBannerInputUrl] = useState('');
  const [listenerPercentile, setListenerPercentile] = useState<number | null>(null);

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

  // ─── Collaborative Playlist State ────────────────────────────────
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [collabInvites, setCollabInvites] = useState<any[]>([]);
  const [collabPlaylistId, setCollabPlaylistId] = useState<string | null>(null);

  // ─── Playlists ──────────────────────────────────────────────
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const user = JSON.parse(localStorage.getItem('donpollo_user') || 'null');
      const suffix = user ? `_${user.id}` : '';
      const data = localStorage.getItem(`donpollo_playlists${suffix}`);
      if (data) return JSON.parse(data);
      if (user) {
        const oldData = localStorage.getItem('donpollo_playlists');
        if (oldData) return JSON.parse(oldData);
      }
      return [];
    } catch { return []; }
  });

  const [selectedVibeMood, setSelectedVibeMood] = useState<VibeType>(() => {
    try {
      return (localStorage.getItem('donpollo_current_vibe') as VibeType) || 'chill';
    } catch {
      return 'chill';
    }
  });

  const [madeForYouPlaylists, setMadeForYouPlaylists] = useState<Playlist[]>(() => {
    if (!FEATURE_FLAGS.ENABLE_PLAYLIST_MIX) {
      return [];
    }
    try {
      const saved = localStorage.getItem('donpollo_made_for_you');
      if (saved) {
        const parsed: Playlist[] = JSON.parse(saved);
        return DEFAULT_MADE_FOR_YOU_PLAYLISTS.map(def => {
          const found = parsed.find(p => p.id === def.id);
          if (found) {
            const songs = Array.isArray(found.songs)
              ? deduplicateTracks(found.songs.map((s: any) => formatTrackLikeSpotify(s)), 4, 50)
              : [];
            const avatar = getMixPlaylistCover({ ...(def as any), ...found, songs });
            return { ...(def as any), ...found, avatar, songs };
          }
          return { ...(def as any), avatar: getMixPlaylistCover(def) };
        });
      }
      return DEFAULT_MADE_FOR_YOU_PLAYLISTS as any[];
    } catch {
      return DEFAULT_MADE_FOR_YOU_PLAYLISTS as any[];
    }
  });
  const [isMixGeneratingId, setIsMixGeneratingId] = useState<string | null>(null);
  const [hitsInternational, setHitsInternational] = useState<any[]>([]);
  const [hitsIndonesia, setHitsIndonesia] = useState<any[]>([]);
  const [hitsJapan, setHitsJapan] = useState<any[]>([]);
  const [hitsKorean, setHitsKorean] = useState<any[]>([]);
  const [hitsLatin, setHitsLatin] = useState<any[]>([]);
  const [hitsLocal, setHitsLocal] = useState<any[]>([]);
  const [localCountry, setLocalCountry] = useState<{ name: string, code: string, flag: string } | null>(null);
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
            const targetUrl = `https://rss.applemarketingtools.com/api/v2/${countryCode}/music/most-played/25/songs.json?nocache=${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;
            const data = (window as any).electronAPI
              ? await (window as any).electronAPI.fetchUrl(targetUrl)
              : await (await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`)).json();

            let feedData = data;
            if (data && data.contents) {
              try { feedData = JSON.parse(data.contents); } catch { }
            }

            if (feedData && feedData.feed && feedData.feed.results) {
              const songs = feedData.feed.results
                .filter((t: any) => !isUnwantedTrackVariant(t.name, t.artistName))
                .map((t: any) => ({
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

            // Background Mapping for YouTube ID (Disabled by default to prevent startup RAM spikes & server overload)
            if (FEATURE_FLAGS.ENABLE_BACKGROUND_HITS_MAPPING) {
              (async () => {
                for (let idx = 0; idx < songs.length; idx++) {
                  const song = songs[idx];
                  const url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(song.originalQuery)}`;
                  try {
                    const data = (window as any).electronAPI
                      ? await (window as any).electronAPI.fetchUrl(url)
                      : await (await fetch(url)).json();

                    if (data && data.results) {
                      let candidates = data.results.filter((item: any) => item.duration >= 50 && item.duration <= 720);
                      candidates = rankAudioResults(candidates, song.title || '', song.duration || 0);
                      const studioCandidates = candidates.filter((item: any) => !isUnwantedTrackVariant(item.title, item.artist));
                      const validYt = studioCandidates[0] || candidates[0] || data.results.find((item: any) => item.duration >= 60 && item.duration <= 480);
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
        } catch (err) { }

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
  // ─── Podcast Fetch ───────────────────────────────────────────
  useEffect(() => {
    const fetchPodcasts = async () => {
      try {
        const loadPodcastCategory = async (region: string, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
          // 1. Immediately hydrate from localStorage cache if available for instant display
          try {
            const cached = localStorage.getItem(`donpollo_cached_podcasts_${region}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setter(parsed);
              }
            }
          } catch { }

          try {
            const targetUrl = `https://rss.applemarketingtools.com/api/v2/${region}/podcasts/top/25/podcasts.json?nocache=${Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))}`;
            let data: any = null;
            try {
              data = (window as any).electronAPI?.fetchUrl
                ? await (window as any).electronAPI.fetchUrl(targetUrl)
                : await (await fetch(targetUrl)).json();
            } catch {
              try {
                data = await (await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`)).json();
              } catch { }
            }

            let feedData = data;
            if (typeof data === 'string') {
              try { feedData = JSON.parse(data); } catch { }
            }
            if (feedData && feedData.contents) {
              try { feedData = JSON.parse(feedData.contents); } catch { }
            }

            let items: any[] = [];
            if (feedData && feedData.feed && Array.isArray(feedData.feed.results) && feedData.feed.results.length > 0) {
              items = feedData.feed.results.map((p: any) => ({
                id: String(p.id || `podcast-${region}-${Math.random()}`),
                podcastId: String(p.id || ''),
                title: p.name,
                artist: p.artistName,
                thumbnail: p.artworkUrl100
                  ? p.artworkUrl100.replace('100x100bb.png', '500x500bb.png').replace('100x100bb.jpg', '500x500bb.jpg')
                  : '',
                duration: 0,
                genre: p.genres?.[0]?.name || 'Podcast',
                originalQuery: `${p.artistName} ${p.name} podcast`,
                feedUrl: p.feedUrl || null,
                isPodcast: true,
              }));
            }

            // Fallback: If Apple RSS returned 0 results, use iTunes Podcast Search API for this country
            if (items.length === 0) {
              const itunesFallbackUrl = `https://itunes.apple.com/search?term=podcast&country=${region}&media=podcast&entity=podcast&limit=25`;
              let itunesRes: any = null;
              try {
                itunesRes = (window as any).electronAPI?.fetchUrl
                  ? await (window as any).electronAPI.fetchUrl(itunesFallbackUrl)
                  : await (await fetch(itunesFallbackUrl)).json();
              } catch { }
              if (typeof itunesRes === 'string') {
                try { itunesRes = JSON.parse(itunesRes); } catch { }
              }
              if (itunesRes?.results && Array.isArray(itunesRes.results) && itunesRes.results.length > 0) {
                items = itunesRes.results.map((p: any) => ({
                  id: String(p.collectionId || p.trackId || `podcast-${region}-${Math.random()}`),
                  podcastId: String(p.collectionId || p.trackId || ''),
                  title: p.collectionName || p.trackName,
                  artist: p.artistName,
                  thumbnail: (p.artworkUrl600 || p.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg'),
                  duration: 0,
                  genre: p.primaryGenreName || 'Podcast',
                  originalQuery: `${p.artistName} ${p.collectionName || p.trackName} podcast`,
                  feedUrl: p.feedUrl || null,
                  isPodcast: true,
                }));
              }
            }

            if (items.length > 0) {
              setter(items);
              try {
                localStorage.setItem(`donpollo_cached_podcasts_${region}`, JSON.stringify(items));
              } catch { }
              return items;
            }
          } catch (e) {
            console.error(`loadPodcastCategory error for region ${region}:`, e);
          }
          return null;
        };

        const heroItems = await loadPodcastCategory('id', setTopPodcasts);
        if (heroItems && heroItems.length > 0) {
          setPodcastHeroIndex(Math.floor(Math.random() * heroItems.length));
        }

        loadPodcastCategory('us', setPodcastsUs);
        loadPodcastCategory('id', setPodcastsId);
        loadPodcastCategory('jp', setPodcastsJp);
        loadPodcastCategory('kr', setPodcastsKr);
        loadPodcastCategory('mx', setPodcastsLatin);
      } catch (e) {
        console.error('fetchPodcasts error', e);
      }
    };
    fetchPodcasts();
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

  // Handle Listen Along invite from deep link (donpollo://listen?u=xxx)
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onListenAlongInvite) return;
    const unsub = api.onListenAlongInvite(({ userId, username }: { userId: string; username: string | null }) => {
      if (!userId) return;
      if (discordUserRef.current?.id === userId) return;
      setActivePartyId(userId);
      setIsGuest(true);
      showToast(`Joining ${username ? username + "'s" : ''} session...`, 'success');
    });
    return () => { if (unsub) unsub(); };
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

  const fetchPlaylists = useCallback(async () => {
    try {
      if ((window as any).electronAPI) {
        const dbPlaylists = await (window as any).electronAPI.getPlaylists(discordUser?.id);
        if (dbPlaylists && Array.isArray(dbPlaylists)) {
          setPlaylists(dbPlaylists);
          const suffix = discordUser ? `_${discordUser.id}` : '';
          try {
            localStorage.setItem(`donpollo_playlists${suffix}`, JSON.stringify(dbPlaylists));
          } catch {}
        }
      }
    } catch (e) {
      console.error("Gagal mengambil playlist dari database", e);
    }
  }, [discordUser]);

  useEffect(() => {
    if (discordUser) fetchPlaylists();
  }, [discordUser, fetchPlaylists]);
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistAvatar, setNewPlaylistAvatar] = useState('');
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<any | null>(null);
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);
  const [isEditingPlaylistName, setIsEditingPlaylistName] = useState(false);
  const [editPlaylistNameValue, setEditPlaylistNameValue] = useState('');
  
  // Feature: Drag and Drop
  const [draggedGlobalSong, setDraggedGlobalSong] = useState<any | null>(null);
  const [dragOverPlaylistId, setDragOverPlaylistId] = useState<string | null>(null);
  const [draggedPlaylistSongIdx, setDraggedPlaylistSongIdx] = useState<number | null>(null);
  const [dragOverPlaylistSongIdx, setDragOverPlaylistSongIdx] = useState<number | null>(null);

  // Feature: Download Manager
  const [activeDownloads, setActiveDownloads] = useState<Record<string, {progress: number, songData: any}>>({});
  const [playlistContextMenu, setPlaylistContextMenu] = useState<{ x: number, y: number, playlist: any } | null>(null);

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
      const data = localStorage.getItem(`donpollo_liked${suffix}`);
      if (data) return JSON.parse(data);
      if (user) {
        const oldData = localStorage.getItem('donpollo_liked');
        if (oldData) return JSON.parse(oldData);
      }
      return [];
    } catch { return []; }
  });

  // ─── Language ─────────────────────────────────────────────────
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('donpollo_language') as Language) || 'id';
  });
  const t = useMemo(() => createTranslator(language), [language]);

  useEffect(() => {
    localStorage.setItem('donpollo_language', language);
  }, [language]);

  // ─── Audio Output & System Settings ─────────────────────────

  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [isRefreshingAudioDevices, setIsRefreshingAudioDevices] = useState(false);

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
  const [rightSidebarMode, setRightSidebarMode] = useState<'queue' | 'lyrics' | 'trending'>('queue');
  const [trendingCountry, setTrendingCountry] = useState<{name: string, code: string} | null>(null);
  const [trendingSongs, setTrendingSongs] = useState<any[]>([]);
  const [isTrendingLoading, setIsTrendingLoading] = useState(false);
  const [trendingError, setTrendingError] = useState('');
  const [isWidgetMode, setIsWidgetMode] = useState(false);

  const fetchTrendingSongs = async (code: string | undefined, countryName: string) => {
    setIsTrendingLoading(true);
    setTrendingError('');
    setTrendingSongs([]);
    setRightSidebarMode('trending');
    setIsRightSidebarOpen(true);
    try {
      if (!code) throw new Error('No code, skip to fallback');
      const targetUrl = `https://rss.applemarketingtools.com/api/v2/${code.toLowerCase()}/music/most-played/25/songs.json`;
      const data = (window as any).electronAPI
        ? await (window as any).electronAPI.fetchUrl(targetUrl)
        : await (await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`)).json();

      let feedData = data;
      if (data && data.contents) {
        try { feedData = JSON.parse(data.contents); } catch { }
      }

      if (feedData?.feed?.results && feedData.feed.results.length > 0) {
        const fetched = feedData.feed.results.map((t: any) => ({
          id: null,
          title: t.name,
          artist: t.artistName,
          album: '',
          cover: t.artworkUrl100,
          url: '',
          youtubeId: null
        }));
        setTrendingSongs(fetched);
        setIsTrendingLoading(false);
        return;
      } else {
        throw new Error('No data');
      }
    } catch (err) {
      // Fallback to iTunes search API
      try {
        const fallbackUrl = `https://itunes.apple.com/search?term=popular+${encodeURIComponent(countryName)}&entity=song&limit=25`;
        const data = (window as any).electronAPI
          ? await (window as any).electronAPI.fetchUrl(fallbackUrl)
          : await (await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(fallbackUrl)}`)).json();
        
        let searchData = data;
        if (data && data.contents) {
          try { searchData = JSON.parse(data.contents); } catch { }
        }

        if (searchData?.results && searchData.results.length > 0) {
          const fetched = searchData.results.map((t: any) => ({
            id: null,
            title: t.trackName,
            artist: t.artistName,
            album: t.collectionName || '',
            cover: t.artworkUrl100,
            url: '',
            youtubeId: null
          }));
          setTrendingSongs(fetched);
        } else {
          setTrendingError(t('soundMapNoData'));
        }
      } catch (fallbackErr) {
        setTrendingError(t('soundMapNoData'));
      }
    }
    setIsTrendingLoading(false);
  };

  // ─── Theme Font & Radius Effect ────────────────────────────
  useEffect(() => {
    const root = document.documentElement;

    // Font Settings (applied globally regardless of theme)
    const fontMap: Record<string, string> = {
      'Inter': "'Inter', sans-serif",
      'Roboto': "'Roboto', sans-serif",
      'Outfit': "'Outfit', sans-serif",
      'monospace': "monospace"
    };
    root.style.setProperty('--global-font', fontMap[settings.fontFamily || 'Inter'] || fontMap['Inter']);

    if (settings.borderRadiusMode === 'sharp') root.style.setProperty('--global-radius', '0px');
    else if (settings.borderRadiusMode === 'pill') root.style.setProperty('--global-radius', '24px');
    else root.style.setProperty('--global-radius', '8px');
  }, [
    settings.theme,
    settings.fontFamily,
    settings.borderRadiusMode,
  ]);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(() => {
    try {
      const s = localStorage.getItem('donpollo_settings');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed.autoSidebar === false) return false;
      }
    } catch (e) { }
    return true;
  });

  const wasClosedByResize = useRef(false);

  useEffect(() => {
    let lastWidth = window.innerWidth;
    const handleResize = () => {
      const currentWidth = window.innerWidth;

      if (currentWidth <= 1100 && lastWidth > 1100) {
        setIsRightSidebarOpen((prev) => {
          if (prev) {
            wasClosedByResize.current = true;
            return false;
          }
          return prev;
        });
      } else if (currentWidth > 1100 && lastWidth <= 1100) {
        if (wasClosedByResize.current) {
          setIsRightSidebarOpen(true);
          wasClosedByResize.current = false;
        }
      }

      lastWidth = currentWidth;
    };

    window.addEventListener('resize', handleResize);
    // Cek saat pertama kali dimuat
    if (window.innerWidth <= 1100) {
      setIsRightSidebarOpen((prev) => {
        if (prev) {
          wasClosedByResize.current = true;
          return false;
        }
        return prev;
      });
    }
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const [userStatus, setUserStatus] = useState<'online' | 'idle' | 'dnd'>(localStorage.getItem('donpollo_status') as any || 'online');
  const [myCustomStatus, setMyCustomStatus] = useState<string>(() => {
    const exp = localStorage.getItem('donpollo_custom_status_expires');
    if (exp && parseInt(exp, 10) < Date.now()) {
      localStorage.removeItem('donpollo_custom_status');
      localStorage.removeItem('donpollo_custom_status_expires');
      return '';
    }
    return localStorage.getItem('donpollo_custom_status') || '';
  });
  const [customStatusDuration, setCustomStatusDuration] = useState<number>(24);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [customStatusInput, setCustomStatusInput] = useState<string>('');

  const handleSaveCustomStatus = async (newStatus: string, hours: number = 24) => {
    const trimmed = newStatus.trim().slice(0, 60);
    if (!trimmed) {
      localStorage.removeItem('donpollo_custom_status');
      localStorage.removeItem('donpollo_custom_status_expires');
      setMyCustomStatus('');
      if (discordUser?.id && (window as any).electronAPI?.setCustomStatus) {
        await (window as any).electronAPI.setCustomStatus({ discordId: discordUser.id, customStatus: '' });
      }
      setShowStatusModal(false);
      showToast('Status berhasil dihapus', 'success');
      return;
    }

    const expiresAt = Date.now() + (hours * 3600 * 1000);
    localStorage.setItem('donpollo_custom_status', trimmed);
    localStorage.setItem('donpollo_custom_status_expires', expiresAt.toString());
    setMyCustomStatus(trimmed);
    if (discordUser?.id && (window as any).electronAPI?.setCustomStatus) {
      await (window as any).electronAPI.setCustomStatus({ discordId: discordUser.id, customStatus: trimmed });
    }
    setShowStatusModal(false);
    showToast(`Status aktif selama ${hours} jam!`, 'success');
  };

  useEffect(() => {
    const checkExpiry = () => {
      const exp = localStorage.getItem('donpollo_custom_status_expires');
      if (exp && parseInt(exp, 10) < Date.now()) {
        localStorage.removeItem('donpollo_custom_status');
        localStorage.removeItem('donpollo_custom_status_expires');
        setMyCustomStatus('');
        if (discordUser?.id && (window as any).electronAPI?.setCustomStatus) {
          (window as any).electronAPI.setCustomStatus({ discordId: discordUser.id, customStatus: '' });
        }
      }
    };
    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, [discordUser]);
  const [joinRequests, setJoinRequests] = useState<{ incoming: any[], outgoing: any[] }>({ incoming: [], outgoing: [] });
  const [showProfileStats, setShowProfileStats] = useState(false);
  const [totalListenSeconds, setTotalListenSeconds] = useState<number>(() => {
    try {
      const user = JSON.parse(localStorage.getItem('donpollo_user') || 'null');
      const suffix = user ? `_${user.id}` : '';
      const data = localStorage.getItem(`donpollo_listen_seconds${suffix}`);
      if (data) return parseInt(data, 10);
      if (user) {
        const oldData = localStorage.getItem('donpollo_listen_seconds');
        if (oldData) return parseInt(oldData, 10);
      }
      return 0;
    } catch { return 0; }
  });

  const [downloadedSongs, setDownloadedSongs] = useState<any[]>([]);
  // const [activeDownloads, setActiveDownloads] = useState<Record<string, { progress: number, songData: any }>>({});

  useEffect(() => {
    if ((window as any).electronAPI?.getDownloadedSongs) {
      (window as any).electronAPI.getDownloadedSongs().then(setDownloadedSongs);
    }
  }, [cacheSize, activePage]);

  useEffect(() => {
    const handleProgress = (_event: any, data: { songId: string, progress: number, songData: any }) => {
      setActiveDownloads(prev => ({ ...prev, [data.songId]: { progress: data.progress, songData: data.songData } }));
    };

    const handleComplete = (_event: any, songData: any) => {
      setActiveDownloads(prev => {
        const next = { ...prev };
        delete next[songData.id];
        return next;
      });
      if ((window as any).electronAPI?.getDownloadedSongs) {
        (window as any).electronAPI.getDownloadedSongs().then(setDownloadedSongs);
      }
      showToast(`${t('toastDownloadComplete') || 'Berhasil mengunduh'}: ${songData.title}`, 'success');
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

      const prepareNext = () => {
        const isStreamingOnly = !!nextSong.isPodcast || homeMode === 'podcast' || (nextSong.duration && nextSong.duration >= 900);
        if (isStreamingOnly) return;
        let prepareUrl = `${API_BASE_URL}/api/prepare?id=${nextSong.id}`;
        if (settings.audioQuality && settings.audioQuality !== 'auto') {
          prepareUrl += `&quality=${settings.audioQuality}`;
        }
        fetch(prepareUrl).catch(() => { });
      };

      const prefetch = async () => {
        if ((window as any).electronAPI?.checkCache) {
          const isCached = await (window as any).electronAPI.checkCache(nextSong.id);
          if (!isCached) {
            const isStreamingOnly = !!nextSong.isPodcast || homeMode === 'podcast' || (nextSong.duration && nextSong.duration >= 900);
            if (isStreamingOnly) {
              console.log(`[Prefetch] Lagu berikutnya adalah podcast/durasi panjang, di-skip agar streaming murni.`);
              return;
            }

            console.log(`[Prefetch] Memulai download diam-diam untuk lagu berikutnya: ${nextSong.title}`);
            let streamUrl = `${API_BASE_URL}/api/stream?id=${nextSong.id}`;
            if (settings.audioQuality && settings.audioQuality !== 'auto') {
              streamUrl += `&quality=${settings.audioQuality}`;
            }
            (window as any).electronAPI.cacheAudio(nextSong, streamUrl, true);
          }
        }
      };
      // Pre-resolve URL lebih awal (2.5s) dan download cache lokal setelah 8s agar tidak mengganggu playback utama
      const prepareTimer = setTimeout(prepareNext, 2500);
      const timer = setTimeout(prefetch, 8000);
      return () => {
        clearTimeout(prepareTimer);
        clearTimeout(timer);
      };
    }
  }, [currentIndex, queue]);

  // ─── Listen Along & Presence Sync ───
  const isSyncingRef = useRef(false);
  const pendingSyncRef = useRef(false);
  const syncPresenceRef = useRef<(() => void) | null>(null);
  const queueRef = useRef<any[]>(queue);
  queueRef.current = queue;
  const myCustomStatusRef = useRef(myCustomStatus);
  myCustomStatusRef.current = myCustomStatus;
  const lastHostPartySyncRef = useRef<{ time: number; songId: string | null; isPlaying: boolean }>({ time: 0, songId: null, isPlaying: false });
  const lastActivityRef = useRef<string>('');
  useEffect(() => {
    if (!discordUser) return;

    const syncPresence = async () => {
      if (isSyncingRef.current) {
        pendingSyncRef.current = true;
        return;
      }
      isSyncingRef.current = true;

      const activeSong = currentSongRef.current;
      const activeQueue = isGuest ? [] : (queueRef.current || []).slice(0, 50);

      if ((window as any).electronAPI) {
        try {
          const avatar = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null;
          const isPlayingNow = audioRef.current ? !audioRef.current.paused : false;

          const progress = audioRef.current?.currentTime || 0;
          const duration = audioRef.current?.duration || 0;

          // Bucket to ~5s to avoid flooding IPC, but still keep progress bar accurate
          const bucket = isPlayingNow && activeSong
            ? `${activeSong.id}-${Math.floor(progress / 5)}`
            : 'idle';

          const isHosting = !isGuest && !!discordUser && activePartyId === discordUser.id;
          const currentPartyId = isGuest ? activePartyId : (isHosting ? discordUser.id : null);

          const extraData = {
            discordId: discordUser.id,
            username: discordUser.global_name || discordUser.username,
            partyId: currentPartyId,
            isGuest: isGuest,
            progress,
            duration,
          };

          if (settings.discordActivityEnabled === false) {
            if (lastActivityRef.current !== 'disabled') {
              (window as any).electronAPI.clearActivity();
              lastActivityRef.current = 'disabled';
            }
          } else {
            if (lastActivityRef.current !== bucket) {
              lastActivityRef.current = bucket;
              if (isPlayingNow && activeSong) {
                (window as any).electronAPI.setActivity(activeSong, extraData);
              } else {
                (window as any).electronAPI.setActivity(null, extraData);
              }
            }
          }

          let users: any[] = [];
          let reqs: any = { incoming: [], outgoing: [] };
          let collabs: any[] = [];
          let queueReqs: any[] = [];
          let syncError = false;

          if ((window as any).electronAPI.unifiedPresenceSync) {
            const unified = await (window as any).electronAPI.unifiedPresenceSync({
              discordId: discordUser.id,
              presenceData: {
                username: discordUser.global_name || discordUser.username,
                avatarUrl: avatar,
                currentSong: activeSong ? {
                  ...activeSong,
                  currentTime: audioRef.current?.currentTime || 0,
                  isPlaying: isPlayingNow,
                  timestamp: Date.now(),
                  crossfade: parseInt(localStorage.getItem('donpollo_crossfade') || '0', 10)
                } : null,
                partyId: currentPartyId,
                status: (document.hidden && userStatus === 'online') ? 'idle' : userStatus,
                customStatus: myCustomStatusRef.current,
                queue: activeQueue
              },
              isGuest
            });

            syncError = !!unified?.syncError;
            users = unified.onlineUsers || [];
            reqs = unified.joinRequests || { incoming: [], outgoing: [] };
            collabs = unified.collabInvites || [];
            queueReqs = unified.queueRequests || [];
          } else {
            // Fallback for older electron main processes
            await (window as any).electronAPI.updatePresence({
              discordId: discordUser.id,
              username: discordUser.global_name || discordUser.username,
              avatarUrl: avatar,
              currentSong: activeSong ? {
                ...activeSong,
                currentTime: audioRef.current?.currentTime || 0,
                isPlaying: isPlayingNow,
                timestamp: Date.now(),
                crossfade: parseInt(localStorage.getItem('donpollo_crossfade') || '0', 10)
              } : null,
              partyId: currentPartyId,
              status: (document.hidden && userStatus === 'online') ? 'idle' : userStatus,
              customStatus: myCustomStatusRef.current,
              queue: activeQueue
            });
            users = await (window as any).electronAPI.getOnlineUsers(discordUser.id);
            reqs = await (window as any).electronAPI.pollJoinRequests(discordUser.id);
            if ((window as any).electronAPI?.pollCollabInvites) {
              collabs = await (window as any).electronAPI.pollCollabInvites(discordUser.id);
            }
            if (!isGuest) {
              queueReqs = await (window as any).electronAPI.pollQueueRequests(discordUser.id);
            }
          }

          if (isHosting && activeSong) {
            const nowMs = Date.now();
            const lastHp = lastHostPartySyncRef.current;
            const songOrStateChanged = lastHp.songId !== activeSong.id || lastHp.isPlaying !== isPlayingNow;
            if (songOrStateChanged || nowMs - lastHp.time >= 5000) {
              lastHostPartySyncRef.current = { time: nowMs, songId: activeSong.id, isPlaying: isPlayingNow };
              await (window as any).electronAPI.hostParty(
                discordUser.id,
                discordUser.id,
                {
                  ...activeSong,
                  crossfade: parseInt(localStorage.getItem('donpollo_crossfade') || '0', 10)
                },
                audioRef.current?.currentTime || 0,
                isPlayingNow
              );
            }
          }

          const isSyncSuccess = !syncError;
          if (users.length > 0) {
            onlineUsersRef.current = users;
            setOnlineUsers(users);
          } else if (!isSyncSuccess && onlineUsersRef.current.length > 0) {
            // Keep previous online users during temporary sync error to avoid flickering / false disconnects
            users = onlineUsersRef.current;
          } else {
            onlineUsersRef.current = [];
            setOnlineUsers([]);
          }

          // Cache online users' info so we can display them even when offline
          let cacheUpdated = false;
          users.forEach((u: any) => {
            if (u.discordId && u.username) {
              collabUserCacheRef.current[u.discordId] = {
                username: u.username,
                avatarUrl: u.avatarUrl || ''
              };
              cacheUpdated = true;
            }
          });
          // Persist to localStorage for next session
          if (cacheUpdated) {
            try { localStorage.setItem('donpollo_collab_user_cache', JSON.stringify(collabUserCacheRef.current)); } catch {}
          }

          // ── Host-left detection with grace period ──
          // If this client is a guest and the host is no longer in the online user list, handle with grace period
          if (isGuest && activePartyId) {
            const hostStillOnline = users.some((u: any) => u.discordId === activePartyId);
            if (hostStillOnline) {
              hostMissCountRef.current = 0;
            } else if (!syncError) {
              // Increment miss counter even when users.length === 0 so guest doesn't get stuck in a ghost party
              hostMissCountRef.current += 1;
              // 6 consecutive cycles (~9s) of host missing before declaring party ended
              if (hostMissCountRef.current >= 6) {
                showToast(t('hostLeftParty'), 'error');
                setIsGuest(false);
                setActivePartyId(null);
                hostMissCountRef.current = 0;
                // Stop playback so the guest doesn't keep playing the host's song indefinitely
                if (audioRef.current) audioRef.current.pause();
                setIsPlaying(false);
              }
            }
          } else {
            hostMissCountRef.current = 0;
          }

          // Poll requests
          setJoinRequests(reqs);
          setCollabInvites(collabs);

          // Handle Guest acceptance automatically
          if (reqs.outgoing && reqs.outgoing.length > 0) {
            const allAccepted = reqs.outgoing.filter((r: any) => r.status === 'accepted');
            const allRejected = reqs.outgoing.filter((r: any) => r.status === 'rejected');
            const allKicked = reqs.outgoing.filter((r: any) => r.status === 'kicked');

            if (allAccepted.length > 0) {
              if (!isGuest) {
                setActivePartyId(allAccepted[0].hostId);
                setIsGuest(true);
                showToast(t('nowListeningWith') + '...', 'success');
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

            if (allKicked.length > 0) {
              if (isGuest) {
                showToast(t('kickedFromParty') || 'You have been kicked from the party', 'error');
                setIsGuest(false);
                setActivePartyId(null);
                if (audioRef.current) audioRef.current.pause();
                // Pause playback since they were kicked
                setIsPlaying(false);
              }
              for (const req of allKicked) {
                await (window as any).electronAPI.respondJoinRequest(req.id, 'consumed');
              }
            }
          }

          // Handle Queue requests
          if (!isGuest && queueReqs && queueReqs.length > 0) {
            const newSongs = queueReqs.map((r: any) => {
              const guestUser = users.find((u: any) => u.discordId === r.guestId);
              return {
                ...r.songData,
                addedBy: {
                  id: r.guestId,
                  name: r.guestName,
                  avatarUrl: guestUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.guestName)}`
                }
              };
            });

            setQueue((prevQueue: any[]) => [...prevQueue, ...newSongs]);
            setOriginalQueue((prevQueue: any[]) => [...prevQueue, ...newSongs]);

            for (const req of queueReqs) {
              showToast(`${req.guestName} menambahkan lagu ke antrean!`, 'success');
              await (window as any).electronAPI.respondQueueRequest(req.id, 'consumed');
            }
          }

        } catch (e) {
          console.error('Failed to sync presence', e);
        } finally {
          isSyncingRef.current = false;
          if (pendingSyncRef.current) {
            pendingSyncRef.current = false;
            syncPresence();
          }
        }
      } else {
        isSyncingRef.current = false;
      }
    };

    syncPresenceRef.current = syncPresence;
    syncPresence();
    let presenceInterval: ReturnType<typeof setInterval>;

    const setupInterval = () => {
      if (presenceInterval) clearInterval(presenceInterval);
      const isHosting = !isGuest && !!discordUser && activePartyId === discordUser.id;
      const isParty = isGuest || !!activePartyId || isHosting;
      // Untuk Listen Along / Party: SELALU 1.5 detik (1500ms) agar sinkronisasi pemutaran dengan teman tetap instan dan presisi
      const isHidden = !isParty && typeof document !== 'undefined' && document.visibilityState === 'hidden';
      const intervalMs = isParty ? 1500 : (isHidden ? 20000 : 5000);
      presenceInterval = setInterval(syncPresence, intervalMs);
    };

    setupInterval();

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncPresence();
      }
      setupInterval();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (syncPresenceRef.current === syncPresence) {
        syncPresenceRef.current = null;
      }
      if (presenceInterval) clearInterval(presenceInterval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [discordUser, activePartyId, userStatus, isGuest, settings.discordActivityEnabled]);

  // Segera broadcast ke party saat Host ganti lagu atau play/pause tanpa mereset timer interval
  useEffect(() => {
    if (!isGuest && discordUser && activePartyId === discordUser.id) {
      syncPresenceRef.current?.();
    }
  }, [currentSong?.id, isPlaying, isGuest, discordUser, activePartyId]);

  // ─── Lyrics ──────────────────────────────────────────────────
  const [lyricsData, setLyricsData] = useState<{ time: number, text: string, romanizedText?: string, isInstrumental?: boolean }[] | null>(null);
  const [showRomanized, setShowRomanized] = useState(true);
  const [showLyricTranslation, setShowLyricTranslation] = useState(false);
  const [translatedLyrics, setTranslatedLyrics] = useState<string[] | null>(null);
  const [isTranslatingLyrics, setIsTranslatingLyrics] = useState(false);
  const [showSidebarLyricsLangMenu, setShowSidebarLyricsLangMenu] = useState(false);
  const [plainLyrics, setPlainLyrics] = useState<string>('');
  const [lyricsOffset, setLyricsOffset] = useState<number>(0);

  // ─── Podcast Speed & Custom EQ Presets ───────────────────────
  const [podcastSpeed, setPodcastSpeed] = useState<number>(() => {
    try { return parseFloat(localStorage.getItem('donpollo_podcast_speed') || '1') || 1; } catch { return 1; }
  });
  const [customEqPresets, setCustomEqPresets] = useState<{ name: string; bands: number[] }[]>(() => {
    try { return JSON.parse(localStorage.getItem('donpollo_custom_eq_presets') || '[]'); } catch { return []; }
  });
  const [newEqPresetName, setNewEqPresetName] = useState('');
  const lastPodcastSaveRef = useRef<number>(0);

  const getSavedLyricsOffset = (songId?: string | null): number | null => {
    if (!songId) return null;
    try {
      const map = JSON.parse(localStorage.getItem('donpollo_lyrics_offsets') || '{}');
      return typeof map[songId] === 'number' ? map[songId] : null;
    } catch { return null; }
  };

  const updateAndSaveLyricsOffset = (deltaOrZero: number, isReset = false) => {
    setLyricsOffset(prev => {
      const next = isReset ? 0 : Math.round((prev + deltaOrZero) * 10) / 10;
      const sid = currentSongRef.current?.id;
      if (sid) {
        try {
          const map = JSON.parse(localStorage.getItem('donpollo_lyrics_offsets') || '{}');
          if (next === 0) delete map[sid];
          else map[sid] = next;
          localStorage.setItem('donpollo_lyrics_offsets', JSON.stringify(map));
        } catch {}
      }
      return next;
    });
  };

  const getSavedPodcastProgress = (epId?: string | null): number => {
    if (!epId) return 0;
    try {
      const map = JSON.parse(localStorage.getItem('donpollo_podcast_progress') || '{}');
      const entry = map[epId];
      if (!entry || typeof entry.time !== 'number') return 0;
      if (entry.duration && entry.time >= entry.duration * 0.95) return 0;
      return entry.time > 5 ? entry.time : 0;
    } catch { return 0; }
  };

  const savePodcastProgress = (epId?: string | null, time?: number, dur?: number) => {
    if (!epId || typeof time !== 'number' || time < 5) return;
    try {
      const map = JSON.parse(localStorage.getItem('donpollo_podcast_progress') || '{}');
      map[epId] = { time: Math.floor(time), duration: dur || 0, updatedAt: Date.now() };
      const entries = Object.entries(map);
      if (entries.length > 60) {
        entries.sort((a: any, b: any) => (a[1].updatedAt || 0) - (b[1].updatedAt || 0));
        localStorage.setItem('donpollo_podcast_progress', JSON.stringify(Object.fromEntries(entries.slice(-60))));
      } else {
        localStorage.setItem('donpollo_podcast_progress', JSON.stringify(map));
      }
    } catch {}
  };
  const sidebarLyricsRef = useRef<HTMLDivElement>(null);
  const widgetLyricsRef = useRef<HTMLDivElement>(null);

  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const userScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWidgetOverlay, setShowWidgetOverlay] = useState(false);
  const [showVibeCheck, setShowVibeCheck] = useState(false);
  const [showWrappedStory, setShowWrappedStory] = useState(false);
  const [wrappedStoryIndex, setWrappedStoryIndex] = useState(0);

  useEffect(() => {
    let timer: any;
    if (showWrappedStory) {
      if (wrappedStoryIndex < 8) {
        timer = setTimeout(() => {
          setWrappedStoryIndex(prev => prev + 1);
        }, 5000);
      }
    }
    return () => clearTimeout(timer);
  }, [showWrappedStory, wrappedStoryIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showWrappedStory) {
        setShowWrappedStory(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showWrappedStory]);

  const trackedSongIdsRef = useRef<Set<string>>(new Set());
  const songsPlayedInSessionRef = useRef<number>(0);

  // ─── Queue State Moved Up

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeAudioRef = useRef<HTMLAudioElement | null>(null);
  const isCrossfadingRef = useRef(false);
  const fadeIntervalsRef = useRef<{ out: any, in: any }>({ out: null, in: null });
  const currentSongRef = useRef<any>(null);
  currentSongRef.current = currentSong;
  const executePlayRef = useRef<any>(null);
  const recoveryAttemptsRef = useRef<Record<string, number>>({});
  const playSessionIdRef = useRef<number>(0);
  const initialPlayHandlingRef = useRef<number>(0);
  const lastPausedAtRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const autoGainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef<any>(settings);
  settingsRef.current = settings;

  const setupAudioContext = (audio: HTMLAudioElement) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = ctx;

      if ((audio as any)._webaudio_connected) return;

      const source = ctx.createMediaElementSource(audio);
      (audio as any)._webaudio_connected = true;
      sourceNodeRef.current = source;

      if (!autoGainNodeRef.current) {
        const gainNode = ctx.createGain();
        gainNode.gain.value = settings.normalizeAudio ? 2.0 : 1.0;
        autoGainNodeRef.current = gainNode;
      }

      if (!compressorNodeRef.current) {
        const comp = ctx.createDynamicsCompressor();
        // Smooth soft-knee limiter for loudness normalization without harsh pumping
        if (settings.normalizeAudio) {
          comp.threshold.value = -14;
          comp.knee.value = 24;
          comp.ratio.value = 8;
          comp.attack.value = 0.005;
          comp.release.value = 0.2;
        } else {
          comp.threshold.value = 0;
          comp.ratio.value = 1;
        }
        compressorNodeRef.current = comp;
      }

      if (!filtersRef.current || filtersRef.current.length === 0) {
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
        prevNode.connect(autoGainNodeRef.current);
        autoGainNodeRef.current.connect(compressorNodeRef.current);
        
        if (!analyserNodeRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          analyserNodeRef.current = analyser;
        }
        
        compressorNodeRef.current.connect(analyserNodeRef.current);
        analyserNodeRef.current.connect(ctx.destination);
      } else {
        source.connect(filtersRef.current[0]);
        // compressor is already connected
      }

      const isEqEnabled = settings.eqEnabled;
      const bands = settings.eqBands || [0, 0, 0, 0, 0];
      filtersRef.current.forEach((f, i) => {
        f.gain.value = isEqEnabled ? bands[i] : 0;
      });

      if (settings.audioOutputDeviceId && typeof (ctx as any).setSinkId === 'function') {
        const targetId = settings.audioOutputDeviceId === 'default' ? '' : settings.audioOutputDeviceId;
        (ctx as any).setSinkId(targetId).catch((err: any) => console.warn('setSinkId ctx failed', err));
      }
    } catch (e) {
      console.error('AudioContext setup failed', e);
    }
  };

  const applyAudioOutputDevice = useCallback(async (deviceId?: string) => {
    const targetId = (!deviceId || deviceId === 'default') ? '' : deviceId;

    if (audioRef.current && typeof (audioRef.current as any).setSinkId === 'function') {
      try {
        await (audioRef.current as any).setSinkId(targetId);
      } catch (err) {
        console.warn('Failed to setSinkId on audio element:', err);
      }
    }

    if (audioContextRef.current && typeof (audioContextRef.current as any).setSinkId === 'function') {
      try {
        await (audioContextRef.current as any).setSinkId(targetId);
      } catch (err) {
        console.warn('Failed to setSinkId on AudioContext:', err);
      }
    }
  }, []);

  const loadAudioOutputDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      setIsRefreshingAudioDevices(true);
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

      // Deduplicate by deviceId
      const uniqueOutputs = audioOutputs.filter((dev, idx, arr) =>
        arr.findIndex(d => d.deviceId === dev.deviceId) === idx
      );
      setAudioOutputDevices(uniqueOutputs);

      // Check if selected device still exists
      const savedDeviceId = settings.audioOutputDeviceId;
      if (savedDeviceId && savedDeviceId !== 'default') {
        const stillConnected = uniqueOutputs.some(d => d.deviceId === savedDeviceId);
        if (!stillConnected) {
          setSettings((prev: any) => {
            const updated = { ...prev, audioOutputDeviceId: 'default' };
            localStorage.setItem('donpollo_settings', JSON.stringify(updated));
            return updated;
          });
          applyAudioOutputDevice('default');
        }
      }
    } catch (err) {
      console.warn('Failed to enumerate audio devices:', err);
    } finally {
      setIsRefreshingAudioDevices(false);
    }
  }, [settings.audioOutputDeviceId, applyAudioOutputDevice]);

  const loadAudioOutputDevicesRef = useRef(loadAudioOutputDevices);
  loadAudioOutputDevicesRef.current = loadAudioOutputDevices;

  useEffect(() => {
    loadAudioOutputDevicesRef.current();

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.addEventListener) {
      const handleDeviceChange = () => {
        loadAudioOutputDevicesRef.current();
      };
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, []);

  useEffect(() => {
    if (settings.audioOutputDeviceId !== undefined) {
      applyAudioOutputDevice(settings.audioOutputDeviceId);
    }
  }, [settings.audioOutputDeviceId, applyAudioOutputDevice]);
  const recentScrollRef = useRef<HTMLDivElement>(null);

  const scrollSlider = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const amount = direction === 'right' ? 480 : -480;
      ref.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // ─── Context Menu ──────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, song: any } | null>(null);

  useEffect(() => {
    const closeAllContextMenus = () => {
      setContextMenu(prev => prev ? null : prev);
      setPlaylistContextMenu(prev => prev ? null : prev);
    };

    const handlePointerDown = (e: MouseEvent | PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.context-menu')) {
        return;
      }
      closeAllContextMenus();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAllContextMenus();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.context-menu')) {
        closeAllContextMenus();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('click', handlePointerDown, true);
    window.addEventListener('contextmenu', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { capture: true, passive: true });
    window.addEventListener('blur', closeAllContextMenus);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('click', handlePointerDown, true);
      window.removeEventListener('contextmenu', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel, true);
      window.removeEventListener('blur', closeAllContextMenus);
    };
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

    // Immediately hydrate playlists from cache so user sees them without delay
    try {
      const pl = localStorage.getItem(`donpollo_playlists${suffix}`);
      if (pl) {
        const parsed = JSON.parse(pl);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlaylists(parsed);
        }
      }
    } catch { }

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

  // --- Profile Syncing ---
  const syncPayloadRef = useRef({ likedSongs, playHistory, totalListenSeconds, settings, savedPlaylists, following });
  useEffect(() => {
    syncPayloadRef.current = { likedSongs, playHistory, totalListenSeconds, settings, savedPlaylists, following };
  }, [likedSongs, playHistory, totalListenSeconds, settings, savedPlaylists, following]);

  useEffect(() => {
    if (!discordUser || !(window as any).electronAPI?.updateProfile) return;
    let hasLoaded = false;

    // Fetch own profile on mount to get saved playlists and following
    if ((window as any).electronAPI?.getProfile) {
      (window as any).electronAPI.getProfile(discordUser.id).then((p: any) => {
        if (p) {
          if (p.savedPlaylists) setSavedPlaylists(p.savedPlaylists);
          if (p.following) setFollowing(p.following);
          if (p.stats && typeof p.stats.totalListenSeconds === 'number') {
            setTotalListenSeconds(prev => {
              const next = Math.max(prev, p.stats.totalListenSeconds);
              const suffix = discordUser ? `_${discordUser.id}` : '';
              try {
                localStorage.setItem(`donpollo_listen_seconds${suffix}`, String(next));
                localStorage.setItem('donpollo_listen_seconds', String(next));
              } catch (e) {}
              return next;
            });
          }
        }
        hasLoaded = true;
      });
    } else {
      hasLoaded = true;
    }

    let lastSyncedJson = '';
    const syncProfile = async () => {
      if (!hasLoaded) return;
      const payload = syncPayloadRef.current;
      // Dirty check: only send update if user profile data meaningfully changed!
      const currentJson = JSON.stringify({
        likedCount: payload.likedSongs.length,
        histCount: payload.playHistory.length,
        listenMinutes: Math.floor(payload.totalListenSeconds / 60),
        saved: payload.savedPlaylists,
        following: payload.following
      });
      if (currentJson === lastSyncedJson) return;
      lastSyncedJson = currentJson;

      const stats = { playHistory: payload.playHistory.slice(0, 100), totalListenSeconds: payload.totalListenSeconds };
      await (window as any).electronAPI.updateProfile({
        discordId: discordUser.id,
        username: discordUser.global_name || discordUser.username,
        avatarUrl: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : '',
        likedSongs: payload.likedSongs,
        stats,
        privacySettings: payload.settings.privacySettings || { publicLikedSongs: true, publicStats: true },
        savedPlaylists: payload.savedPlaylists,
        following: payload.following
      });
    };

    const interval = setInterval(syncProfile, 30000); // Sync every 30 seconds
    return () => clearInterval(interval);
  }, [discordUser]);

  const profileCacheRef = useRef<Record<string, { data: any; percentile: any; ts: number }>>({});

  useEffect(() => {
    if (activePage !== 'profile' || !activeProfileId) return;
    const cached = profileCacheRef.current[activeProfileId];
    const isFresh = cached && Date.now() - cached.ts < 20000;
    if (cached) {
      setProfileData(cached.data);
      setListenerPercentile(cached.percentile);
      setIsLoadingProfile(false);
    } else {
      setIsLoadingProfile(true);
    }

    if ((window as any).electronAPI?.getProfile) {
      if (isFresh) return;
      let cancelled = false;
      const profilePromise = (window as any).electronAPI.getProfile(activeProfileId);
      const percPromise = (window as any).electronAPI.getUserPercentile
        ? (window as any).electronAPI.getUserPercentile(activeProfileId).catch(() => null)
        : Promise.resolve(null);

      Promise.all([profilePromise, percPromise]).then(([data, perc]) => {
        if (cancelled) return;
        profileCacheRef.current[activeProfileId] = { data, percentile: perc, ts: Date.now() };
        setProfileData(data);
        if (perc !== null) setListenerPercentile(perc);
        setIsLoadingProfile(false);
      }).catch(() => {
        if (cancelled) return;
        if (!cached) setProfileData(null);
        setIsLoadingProfile(false);
      });
      return () => { cancelled = true; };
    } else {
      setIsLoadingProfile(false);
    }
  }, [activePage, activeProfileId]);

  useEffect(() => {
    localStorage.setItem('donpollo_settings', JSON.stringify({ ...settings, volume }));
  }, [settings, volume]);

  //   // --- Listen time tracker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTotalListenSeconds(prev => {
        const next = prev + 1;
        const user = JSON.parse(localStorage.getItem('donpollo_user') || 'null');
        const suffix = user ? `_${user.id}` : '';
        localStorage.setItem(`donpollo_listen_seconds${suffix}`, String(next));
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // ─── Recommendations ─────────────────────────────────────────
  const lastRecQueryRef = useRef<string>('');
  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_DAILY_MIX_SHELF) return;
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
      if (query === lastRecQueryRef.current && recommendations.length > 0) {
        return;
      }
      lastRecQueryRef.current = query;
      try {
        const queries = [
          `${query} official audio`,
          `${query} popular songs`
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

      if (currentSongRef.current?.isPodcast) {
        const now = Date.now();
        if (now - lastPodcastSaveRef.current > 5000) {
          lastPodcastSaveRef.current = now;
          savePodcastProgress(currentSongRef.current.id, audio.currentTime, audio.duration);
        }
      }

      if (audio.currentTime >= 30 && currentSongRef.current) {
        const songId = currentSongRef.current.id;
        if (!trackedSongIdsRef.current.has(songId)) {
          trackedSongIdsRef.current.add(songId);
          songsPlayedInSessionRef.current += 1;
          
          if ((window as any).electronAPI?.trackSong) {
             (window as any).electronAPI.trackSong(currentSongRef.current);
          }

          const interval = settingsRef.current?.vibeCheckInterval !== undefined ? settingsRef.current.vibeCheckInterval : 15;
          const isEnabled = settingsRef.current?.vibeCheckEnabled !== false;

          if (isEnabled && interval > 0 && songsPlayedInSessionRef.current > 0 && songsPlayedInSessionRef.current % interval === 0) {
             setShowVibeCheck(true);
          }
        }
      }
    };
    const handleEnded = () => {
      if (audioRef.current !== audio) return;
      handleNextRef.current(true);
    };
    const handleError = () => {
      if (audioRef.current !== audio) return;
      // Jangan tabrakan dengan recovery awal di play().catch() untuk sesi pemutaran yang sama
      if (initialPlayHandlingRef.current === playSessionIdRef.current) return;
      if (audio.error && currentSongRef.current && executePlayRef.current) {
        const songId = currentSongRef.current.id;
        const attempts = recoveryAttemptsRef.current[songId] || 0;
        if (attempts < 1) {
          recoveryAttemptsRef.current[songId] = attempts + 1;
          console.warn("Audio error, attempting auto-recovery...", audio.error);
          executePlayRef.current(currentSongRef.current, audio.currentTime);
        } else {
          console.error("Auto-recovery failed. Skipping to next song.");
          setIsPlaying(false);
          handleNextRef.current();
        }
      } else {
        setIsPlaying(false);
      }
    };
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
  }, []);

  const ensureAudioType = (isPodcast: boolean, forceRecreate = false) => {
    const currentIsPodcast = audioRef.current?.dataset.isPodcast === 'true';
    if (!forceRecreate && audioRef.current && currentIsPodcast === isPodcast) return;

    if (audioRef.current) {
      if (audioRef.current !== fadeAudioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
    }

    const audio = new Audio();
    audio.volume = isMuted ? 0 : volume;
    audio.loop = false;
    audio.dataset.isPodcast = isPodcast ? 'true' : 'false';

    if (settings.audioOutputDeviceId && typeof (audio as any).setSinkId === 'function') {
      const targetId = settings.audioOutputDeviceId === 'default' ? '' : settings.audioOutputDeviceId;
      (audio as any).setSinkId(targetId).catch((err: any) => console.warn('setSinkId audio failed', err));
    }

    audioRef.current = audio;
    if (!isPodcast) {
      setupAudioContext(audio);
    }
    setupAudioListeners(audio);
  };

  useEffect(() => {
    ensureAudioType(false);
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

  useEffect(() => {
    if (compressorNodeRef.current && autoGainNodeRef.current) {
      const comp = compressorNodeRef.current;
      const gainNode = autoGainNodeRef.current;
      if (settings.normalizeAudio) {
        gainNode.gain.value = 2.0;
        comp.threshold.value = -14;
        comp.knee.value = 24;
        comp.ratio.value = 8;
        comp.attack.value = 0.005;
        comp.release.value = 0.2;
      } else {
        gainNode.gain.value = 1.0;
        comp.threshold.value = 0;
        comp.ratio.value = 1;
      }
    }
  }, [settings.normalizeAudio]);

  // ─── Crossfade Monitor ───
  useEffect(() => {
    const interval = setInterval(() => {
      const audio = audioRef.current;
      if (!audio || isGuest || isCrossfadingRef.current || loopMode === 'one') return;

      const hasNext = currentIndex < queue.length - 1 || (loopMode === 'all' && queue.length > 0);
      if (!hasNext) return;

      const cfDurStr = localStorage.getItem('donpollo_crossfade');
      const cfDuration = cfDurStr ? parseInt(cfDurStr) : 0;

      if (cfDuration > 0 && audio.duration > 0 && audio.currentTime >= audio.duration - cfDuration) {
        isCrossfadingRef.current = true;
        const oldAudio = audio;
        fadeAudioRef.current = oldAudio;

        if (fadeIntervalsRef.current.out) clearInterval(fadeIntervalsRef.current.out);
        if (fadeIntervalsRef.current.in) clearInterval(fadeIntervalsRef.current.in);

        const fadeStep = oldAudio.volume / (cfDuration * 10);
        fadeIntervalsRef.current.out = setInterval(() => {
          if (oldAudio.volume - fadeStep > 0) {
            oldAudio.volume -= fadeStep;
          } else {
            oldAudio.volume = 0;
            oldAudio.pause();
            oldAudio.removeAttribute('src');
            oldAudio.load();
            clearInterval(fadeIntervalsRef.current.out);
            if (fadeAudioRef.current === oldAudio) fadeAudioRef.current = null;
            isCrossfadingRef.current = false;
          }
        }, 100);

        const nextSong = currentIndex < queue.length - 1 ? queue[currentIndex + 1] : queue[0];
        ensureAudioType(!!nextSong?.isPodcast, true);
        const newAudio = audioRef.current!;
        newAudio.volume = 0;

        const targetVol = isMuted ? 0 : volume;
        if (targetVol > 0) {
          const fadeInStep = targetVol / (cfDuration * 10);
          fadeIntervalsRef.current.in = setInterval(() => {
            if (newAudio.volume + fadeInStep < targetVol) {
              newAudio.volume = Math.min(newAudio.volume + fadeInStep, targetVol);
            } else {
              newAudio.volume = targetVol;
              clearInterval(fadeIntervalsRef.current.in);
            }
          }, 100);
        } else {
          newAudio.volume = 0;
        }

        handleNextRef.current(true);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isGuest, queue, currentIndex, volume, isMuted, loopMode, setupAudioListeners]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.loop = false;
    }
  }, [volume, isMuted, loopMode]);

  useEffect(() => {
    if (activePage === 'settings' && (window as any).electronAPI?.getCacheSize) {
      (window as any).electronAPI.getCacheSize().then(setCacheSize);
      if ((window as any).electronAPI.getCachePath) {
        (window as any).electronAPI.getCachePath().then(setCachePath);
      }
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
        if (rightSidebarMode === 'lyrics' && sidebarLyricsRef.current) {
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
  }, [progress, lyricsData, duration, rightSidebarMode, lyricsOffset, isWidgetMode, isUserScrolling]);

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
    toastTimeoutRef.current = setTimeout(() => setToastData(null), 1500);
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

  const isLiked = (songOrId: any) => {
    if (!songOrId) return false;
    if (typeof songOrId === 'string') {
      return likedSongs.some(s => s.id === songOrId);
    }
    return likedSongs.some(s => (songOrId.id && s.id === songOrId.id) || (s.title && s.title === songOrId.title && s.artist === songOrId.artist));
  };

  const toggleLike = (song: any) => {
    if (!song) return;
    const isCurrentlyLiked = likedSongs.some(s => (song.id && s.id === song.id) || (s.title && s.title === song.title && s.artist === song.artist));
    if (isCurrentlyLiked) {
      showToast(t('toastUnliked') || 'Dihapus dari Disukai');
      setLikedSongs(prev => prev.filter(s => !((song.id && s.id === song.id) || (s.title && s.title === song.title && s.artist === song.artist))));
    } else {
      showToast(t('toastLiked') || 'Ditambahkan ke Disukai');
      setLikedSongs(prev => [song, ...prev]);
    }
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

  const confirmLogoutAction = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentSong(null);
    setQueue([]);
    setOriginalQueue([]);
    setCurrentIndex(-1);
    setLyricsData(null);
    if (discordUser && (window as any).electronAPI?.notifyClosing) {
      (window as any).electronAPI.notifyClosing(discordUser.id);
    }
    setDiscordUser(null);
    localStorage.removeItem('donpollo_user');
    localStorage.removeItem('donpollo_discord_token');
    setShowLogoutConfirm(false);
    setActivePage('home');
    showToast(t('toastLogout'), 'success');
  };

  const handleLogout = () => {
    setShowLogoutDropdown(false);
    setShowLogoutConfirm(true);
  };

  const addSongToPlaylist = async (playlistId: string, song: any) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) {
      setAddToPlaylistSong(null);
      return;
    }
    const isAlreadyIn = pl.songs.some(s => (song.id && s.id === song.id) || (s.title === song.title && s.artist === song.artist));
    if (isAlreadyIn) {
      setAddToPlaylistSong(null);
      showToast(t('toastAlreadyInPlaylist'), 'error');
      return;
    }

    const songWithAddedBy = {
      ...song,
      addedBy: discordUser ? {
        id: discordUser.id,
        username: discordUser.global_name || discordUser.username,
        avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null
      } : null
    };
    const updated = { ...pl, songs: [...pl.songs, songWithAddedBy] };
    if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(updated);

    setPlaylists(prev => prev.map(p => p.id === playlistId ? updated : p));
    setAddToPlaylistSong(null);
    showToast(t('toastAddedToPlaylist', { playlist: pl.name }), 'playlist');
  };

  const removeSongFromPlaylist = async (playlistId: string, songToRemove: any, index?: number) => {
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return;

    let updatedSongs: any[];
    if (typeof index === 'number' && index >= 0 && index < pl.songs.length) {
      updatedSongs = pl.songs.filter((_, idx) => idx !== index);
    } else {
      const targetId = typeof songToRemove === 'string' ? songToRemove : songToRemove?.id;
      const targetTitle = typeof songToRemove === 'object' ? songToRemove?.title : null;
      const targetArtist = typeof songToRemove === 'object' ? songToRemove?.artist : null;

      updatedSongs = pl.songs.filter(s => {
        if (targetId && s.id === targetId) return false;
        if (targetTitle && targetArtist && s.title === targetTitle && s.artist === targetArtist) return false;
        return true;
      });
    }

    const updated = { ...pl, songs: updatedSongs };
    if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(updated);

    setPlaylists(prev => prev.map(p => p.id === playlistId ? updated : p));
    showToast(t('toastRemovedFromPlaylist') || 'Lagu dihapus dari playlist!', 'playlist');
  };

  const deletePlaylist = async (playlistId: string) => {
    if ((window as any).electronAPI) await (window as any).electronAPI.deletePlaylist(playlistId);
    setPlaylists(prev => prev.filter(pl => pl.id !== playlistId));
    navigate('playlist');
    setPlaylistToDelete(null);
    showToast(t('toastPlaylistDeleted'));
  };

  const handleClearCache = async () => {
    setShowClearCacheConfirm(true);
  };

  const confirmClearCacheAction = async () => {
    if ((window as any).electronAPI?.clearCache) {
      await (window as any).electronAPI.clearCache();
      setCacheSize(0);
      showToast(t('toastCacheCleared'));
    }
    setShowClearCacheConfirm(false);
  };

  const handleChangeCacheDir = async () => {
    if ((window as any).electronAPI?.selectCacheDir) {
      const newDir = await (window as any).electronAPI.selectCacheDir();
      if (newDir) {
        showToast(t('movingCache') || 'Moving cache files, please wait...', 'music');
        const success = await (window as any).electronAPI.setCacheDir(newDir);
        if (success) {
          setCachePath(newDir);
          showToast('Cache moved successfully', 'success');
        } else {
          showToast('Failed to move cache', 'error');
        }
      }
    }
  };

  const confirmClearQueueAction = () => {
    setQueue([]);
    setOriginalQueue([]);
    setCurrentIndex(-1);
    setShowClearQueueConfirm(false);
  };

  const simulateLoading = async (action: () => Promise<void> | void) => {
    setIsGlobalLoading(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    try {
      await action();
    } finally {
      setIsGlobalLoading(false);
    }
  };

  const confirmKickAction = async () => {
    if (userToKick && discordUser) {
      await (window as any).electronAPI.kickUser(discordUser.id, userToKick.id);
      showToast(`${userToKick.name} ${t('hasBeenKicked') || 'has been kicked'}`, 'success');
      setUserToKick(null);
    }
  };

  const handleImportPlaylist = async () => {
    if (!importPlaylistUrl.trim()) return;
    setIsImporting(true);
    const input = importPlaylistUrl.trim();
    // Check if it's a DP share code (format: DP-XXXXXX)
    const isShareCode = /^DP-[A-Z0-9]{6}$/i.test(input);
    if (isShareCode && (window as any).electronAPI?.resolveShareCode) {
      try {
        const shared = await (window as any).electronAPI.resolveShareCode(input);
        if (!shared) {
          showToast('Kode share tidak valid atau sudah kadaluarsa.', 'error');
          setIsImporting(false);
          return;
        }
        // Keep the original playlist data intact (original id and discordId)
        // so it opens in view mode (read-only), just like saving from a profile
        const sharedPlaylist = { ...shared };

        // Save the original playlist to the DB so it's accessible locally
        if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(sharedPlaylist);

        // Add to local playlists state if not already there
        setPlaylists((prev: any) => prev.some((p: any) => p.id === sharedPlaylist.id) ? prev : [...prev, sharedPlaylist]);

        // Add playlist ID to savedPlaylists (like "Save to Library")
        if (discordUser && (window as any).electronAPI?.toggleSavePlaylist && !savedPlaylists.includes(sharedPlaylist.id)) {
          const newSaved = await (window as any).electronAPI.toggleSavePlaylist(discordUser.id, sharedPlaylist.id);
          if (newSaved) setSavedPlaylists(newSaved);
        }

        showToast(`"${sharedPlaylist.name}" ditambahkan ke library! 🎉`, 'success');
        setShowImportPlaylist(false);
        setImportPlaylistUrl('');
        navigate('playlist-detail', { playlistId: sharedPlaylist.id });
      } catch (e: any) {
        showToast(e.message || 'Import gagal', 'error');
      } finally {
        setIsImporting(false);
      }
      return;
    }
    showToast(t('importing'));
    try {
      const res = await fetch(`${API_BASE_URL}/api/playlist?url=${encodeURIComponent(importPlaylistUrl)}`);
      if (!res.ok) throw new Error('Failed to connect to backend');
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      let finalSongs = data.songs || [];
      if ((window as any).electronAPI && (window as any).electronAPI.fetchUrl) {
        finalSongs = await Promise.all(finalSongs.map(async (s: any) => {
          let artist = s.artist;
          let title = s.title;
          if (!artist || artist === 'Unknown') {
            if (title && title.includes(' - ')) {
              const parts = title.split(' - ');
              artist = parts[0].trim();
              title = parts.slice(1).join(' - ').trim();
            } else if (title && title.includes('-')) {
              const parts = title.split('-');
              artist = parts[0].trim();
              title = parts.slice(1).join('-').trim();
            } else {
              try {
                const oembedUrl = `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${s.id}&format=json`;
                const oembedData = await (window as any).electronAPI.fetchUrl(oembedUrl);
                if (oembedData && oembedData.author_name) {
                  artist = oembedData.author_name.replace(/ - Topic$/, '').trim();
                } else {
                  artist = 'Unknown';
                }
              } catch (e) {
                artist = 'Unknown';
              }
            }
          }
          return { ...s, artist, title };
        }));
      } else {
        finalSongs = finalSongs.map((s: any) => {
          let artist = s.artist;
          let title = s.title;
          if (!artist || artist === 'Unknown') {
            if (title && title.includes(' - ')) {
              const parts = title.split(' - ');
              artist = parts[0].trim();
              title = parts.slice(1).join(' - ').trim();
            } else if (title && title.includes('-')) {
              const parts = title.split('-');
              artist = parts[0].trim();
              title = parts.slice(1).join('-').trim();
            } else {
              artist = 'Unknown';
            }
          }
          return { ...s, artist, title };
        });
      }

      const newPlaylist: Playlist = {
        id: `playlist-${Date.now()}`,
        name: data.name || 'Imported Playlist',
        avatar: data.cover || '',
        songs: finalSongs,
        createdAt: Date.now(),
        discordId: discordUser?.id || '',
      };

      if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(newPlaylist);
      setPlaylists((prev: any) => [...prev, newPlaylist]);
      showToast(`"${newPlaylist.name}" ${t('toastImportSuccess')}`);
      setShowImportPlaylist(false);
      setImportPlaylistUrl('');
      navigate('playlist', { playlistId: newPlaylist.id });
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
      const preferAudio = settings?.prioritizeOfficialAudio !== false;
      const q = preferAudio ? buildSmartSearchQuery(playlistSearchQuery) : playlistSearchQuery;
      const response = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      let ytResults = data.results || [];
      if (ytResults.length === 0 && q !== playlistSearchQuery) {
        try {
          const fallbackRes = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(playlistSearchQuery)}`);
          const fallbackData = await fallbackRes.json();
          ytResults = fallbackData.results || [];
        } catch {}
      }
      if (preferAudio) {
        ytResults = rankAudioResults(ytResults, playlistSearchQuery);
      }
      const wantsVariant = userExplicitlyWantsAcoustic(playlistSearchQuery) || userExplicitlyWantsRemix(playlistSearchQuery) || userExplicitlyWantsLive(playlistSearchQuery);
      let results = ytResults
        .filter((r: any) => r.duration > 0)
        .map((r: any) => formatTrackLikeSpotify(r, playlistSearchQuery));

      if (!wantsVariant) {
        const studioOnly = results.filter((r: any) => !isUnwantedTrackVariant(r.title, r.artist));
        if (studioOnly.length > 0) {
          results = studioOnly;
        }
      }

      setPlaylistSearchResults(results);
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
    setShowLogoutConfirm(true);
  };

  const getDefaultDiscordAvatar = (discordId?: string | null, username?: string) => {
    if (discordId) {
      try {
        const idBig = BigInt(discordId);
        const index = Number((idBig >> 22n) % 6n);
        return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
      } catch {}
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(username || 'User')}&background=5865F2&color=fff&bold=true`;
  };

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>, discordId?: string | null, username?: string) => {
    const target = e.currentTarget;
    if (discordId && (window as any).electronAPI?.getLiveDiscordAvatar) {
      (window as any).electronAPI.getLiveDiscordAvatar(discordId).then((liveUrl: string | null) => {
        if (liveUrl && liveUrl !== target.src) {
          target.src = liveUrl;
          return;
        }
        const fallback = getDefaultDiscordAvatar(discordId, username);
        if (target.src !== fallback) {
          target.src = fallback;
        }
      }).catch(() => {
        const fallback = getDefaultDiscordAvatar(discordId, username);
        if (target.src !== fallback) {
          target.src = fallback;
        }
      });
      return;
    }

    const fallback = getDefaultDiscordAvatar(discordId, username);
    if (target.src !== fallback) {
      target.src = fallback;
    }
  };

  const getDiscordAvatar = (user: DiscordUser | null) => {
    if (!user) return null;
    if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
    return getDefaultDiscordAvatar(user.id, user.username);
  };

  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const lastProfileSyncTimeRef = useRef<number>(0);
  const tRef = useRef(t);
  tRef.current = t;
  const discordUserRef = useRef(discordUser);
  discordUserRef.current = discordUser;

  const refreshDiscordProfile = useCallback(async (showNotification = false) => {
    const user = discordUserRef.current;
    if (!user?.id) return;

    // Throttle automatic refreshes to at most once per minute
    if (!showNotification && Date.now() - lastProfileSyncTimeRef.current < 60000) {
      return;
    }
    lastProfileSyncTimeRef.current = Date.now();

    try {
      setIsRefreshingProfile(true);

      // 1. Primary: Auto-sync live profile via Bot API (always works, never expires)
      if ((window as any).electronAPI?.getLiveDiscordUser) {
        const live = await (window as any).electronAPI.getLiveDiscordUser(user.id);
        if (live && live.avatarUrl) {
          const hashMatch = live.avatarUrl.match(/avatars\/[^/]+\/([a-f0-9]+)\./);
          const freshAvatarHash = hashMatch ? hashMatch[1] : user.avatar;

          setDiscordUser(prev => {
            if (!prev) return null;
            if (prev.avatar === freshAvatarHash && prev.username === (live.username || prev.username) && prev.global_name === (live.globalName || prev.global_name)) {
              return prev; // No change, skip re-render
            }
            const updated = {
              ...prev,
              avatar: freshAvatarHash,
              global_name: live.globalName || prev.global_name,
              username: live.username || prev.username
            };
            localStorage.setItem('donpollo_user', JSON.stringify(updated));
            return updated;
          });

          if ((window as any).electronAPI?.updateProfile) {
            await (window as any).electronAPI.updateProfile({
              discordId: user.id,
              username: live.globalName || live.username || user.username,
              avatarUrl: live.avatarUrl
            });
          }

          if (showNotification) {
            showToast(tRef.current('profileUpdated'), 'success');
          }
          return;
        }
      }

      // 2. Secondary fallback: check OAuth @me if token is in localStorage
      const token = localStorage.getItem('donpollo_discord_token');
      if (token) {
        const res = await fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const freshUser: DiscordUser = await res.json();
          setDiscordUser(prev => {
            if (!prev) return freshUser;
            if (JSON.stringify(prev) === JSON.stringify(freshUser)) return prev;
            localStorage.setItem('donpollo_user', JSON.stringify(freshUser));
            return freshUser;
          });

          const avatar = freshUser.avatar 
            ? `https://cdn.discordapp.com/avatars/${freshUser.id}/${freshUser.avatar}.png` 
            : null;

          if ((window as any).electronAPI?.updateProfile) {
            await (window as any).electronAPI.updateProfile({
              discordId: freshUser.id,
              username: freshUser.global_name || freshUser.username,
              avatarUrl: avatar
            });
          }
          if (showNotification) {
            showToast(tRef.current('profileUpdated'), 'success');
          }
        }
      }
    } catch (e) {
      console.warn('Failed to refresh Discord profile:', e);
      if (showNotification) {
        showToast('Gagal memperbarui profil Discord.', 'error');
      }
    } finally {
      setIsRefreshingProfile(false);
    }
  }, []);

  useEffect(() => {
    if (discordUser?.id) {
      refreshDiscordProfile(false);
      const onFocus = () => refreshDiscordProfile(false);
      window.addEventListener('focus', onFocus);
      const interval = setInterval(() => {
        refreshDiscordProfile(false);
      }, 2 * 60 * 1000);
      return () => {
        window.removeEventListener('focus', onFocus);
        clearInterval(interval);
      };
    }
  }, [discordUser?.id]);

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
    const reqId = ++lyricsRequestIdRef.current;
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

      const queriesToTry = [
        `track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(finalArtist)}`,
        `q=${encodeURIComponent(`${cleanTitle} ${finalArtist}`)}`,
        `q=${encodeURIComponent(`${title} ${artist}`)}`,
        `q=${encodeURIComponent(`${cleanTitle} ${artist}`)}`,
        `q=${encodeURIComponent(cleanTitle)}`
      ];

      let allResults: any[] = [];

      for (const q of queriesToTry) {
        if (lyricsRequestIdRef.current !== reqId) return;
        try {
          const res = await fetch(`https://lrclib.net/api/search?${q}`);
          const resData = await res.json();
          if (resData && Array.isArray(resData) && resData.length > 0) {
            allResults = [...allResults, ...resData];

            // Smart Early Break: If we find a highly confident match, stop querying
            const hasGoodMatch = resData.some(item =>
              item.syncedLyrics &&
              titleSimilarity(item.trackName || '', cleanTitle) > 0.9 &&
              titleSimilarity(item.artistName || '', finalArtist) > 0.9
            );

            if (hasGoodMatch) {
              break;
            }
          }
        } catch (e) { }
      }

      if (lyricsRequestIdRef.current !== reqId) return;

      // Remove duplicate results based on LRCLib ID
      const uniqueResults = Array.from(new Map(allResults.map(item => [item.id, item])).values());

      if (uniqueResults.length > 0) {
        // Scoring system
        const scoredMatches = uniqueResults.map((item: any) => {
          let score = 0;

          if (item.syncedLyrics) score += 50;
          else if (item.plainLyrics) score += 10;

          const tSim = titleSimilarity(item.trackName || '', cleanTitle);
          score += tSim * 20;

          const aSim = titleSimilarity(item.artistName || '', finalArtist);
          score += aSim * 20;

          if (songDuration > 0 && item.duration) {
            const diff = Math.abs(item.duration - songDuration);
            if (diff <= 5) score += 10;
            else if (diff <= 15) score += 5;
            else score -= diff * 0.1;
          }

          return { ...item, score };
        }).sort((a, b) => b.score - a.score);

        let bestMatch = scoredMatches[0];

        const savedUserOffset = getSavedLyricsOffset(currentSongRef.current?.id);
        if (savedUserOffset !== null) {
          setLyricsOffset(savedUserOffset);
        } else if (songDuration > 0 && bestMatch.duration) {
          const diff = songDuration - bestMatch.duration;
          if (Math.abs(diff) > 2 && Math.abs(diff) < 30) {
            setLyricsOffset(Math.round(diff * 10) / 10);
          } else {
            setLyricsOffset(0);
          }
        } else {
          setLyricsOffset(0);
        }

        if (bestMatch && bestMatch.syncedLyrics) {
          const parsed = parseLRC(bestMatch.syncedLyrics);
          if (parsed) {
            if (lyricsRequestIdRef.current !== reqId) return;
            setLyricsData(parsed);

            // Auto Romanization
            setTimeout(async () => {
              if (lyricsRequestIdRef.current !== reqId) return;
              try {
                const textSample = parsed.map((p: any) => p.text).join(' ');
                let lang: 'ko' | 'ja' | null = null;
                if (/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/.test(textSample)) lang = 'ko';
                else if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(textSample)) lang = 'ja';

                if (lang && (window as any).electronAPI) {
                  const combinedText = parsed.map((p: any) => p.text || '').join('\n');
                  const romText = await (window as any).electronAPI.romanizeLyrics(combinedText, lang);
                  if (romText && lyricsRequestIdRef.current === reqId) {
                    const romLines = romText.split('\n');
                    setLyricsData(prev => {
                      if (!prev || lyricsRequestIdRef.current !== reqId) return prev;
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
            if (lyricsRequestIdRef.current === reqId) {
              setPlainLyrics(bestMatch.plainLyrics || t('lyricsNotLRC'));
            }
          }
        } else if (bestMatch && bestMatch.plainLyrics) {
          if (lyricsRequestIdRef.current === reqId) setPlainLyrics(bestMatch.plainLyrics);
        } else {
          if (lyricsRequestIdRef.current === reqId) setPlainLyrics(t('lyricsNotFound'));
        }
      } else {
        if (lyricsRequestIdRef.current === reqId) setPlainLyrics(t('lyricsNotFound'));
      }
    } catch {
      if (lyricsRequestIdRef.current === reqId) setPlainLyrics(t('lyricsFailed'));
    }
  };

  // --- Title Similarity Helper ---
  const titleSimilarity = (a: string, b: string): number => {
    const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'is', 'it', 'to', 'for', 'ft', 'feat', 'featuring', 'episode', 'eps', 'ep', 'with', 'by', 'part', 'pt', 'vol', 'vs']);
    const norm = (s: string) => s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP.has(w));
    const wa = norm(a), wb = new Set(norm(b));
    if (wa.length === 0) return 0;
    const hits = wa.filter(w => wb.has(w)).length;
    return hits / wa.length;
  };

  // --- Smart Podcast Query Builder ---
  const buildPodcastQuery = (artist: string, title: string): string => {
    // Remove episode number prefix: "Eps 17 -", "Ep. 5:", "#10 -", "Episode 3 -"
    let cleaned = title
      .replace(/^(eps?\.?\s*\d+\s*[-:–—]?\s*|episode\s*\d+\s*[-:–—]?\s*|#\s*\d+\s*[-:–—]?\s*)/i, '')
      .trim();
    // Extract guest names from (Ft. X) / (feat. X) to keep as keywords
    const guestMatch = cleaned.match(/\(?(?:ft|feat|featuring|with)[.\s]+([^)]+)\)?/i);
    const guests = guestMatch ? guestMatch[1].replace(/[()]/g, '').trim() : '';
    // Remove the ft./feat. clause from the main title to shorten it
    cleaned = cleaned.replace(/\(?(?:ft|feat|featuring|with)[.\s]+[^)]+\)?/gi, '').trim();
    // Build final query: artist + cleaned title + guests
    const parts = [artist, cleaned, guests].filter(Boolean);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  };

  const executePlay = async (inputSong: any, startTime?: number) => {
    try {
      let song = { ...inputSong };
      // Guard: treat string "null" / "undefined" / empty as missing ID
      if (song.id && (String(song.id) === 'null' || String(song.id) === 'undefined' || String(song.id).trim() === '')) {
        song.id = null;
      }

      // PODCAST STREAMING: If it's a podcast with direct audio stream URL, play directly without touching YouTube
      if (song.isPodcast && song.audioUrl) {
        const cleanSong = formatTrackLikeSpotify(song);
        cleanSong.isPodcast = true;
        cleanSong.audioUrl = song.audioUrl;
        cleanSong.id = song.id || song.audioUrl;

        setCurrentSong(cleanSong);
        addToHistory(cleanSong);
        setDuration(cleanSong.duration || song.duration || 0);
        setIsPlaying(true);
        setLyricsData(null);
        setTranslatedLyrics(null);
        setLyricsOffset(0);

        const resumeTime = startTime !== undefined ? startTime : getSavedPodcastProgress(cleanSong.id);

        ensureAudioType(true);
        if (audioRef.current) {
          audioRef.current.src = song.audioUrl;
          audioRef.current.playbackRate = podcastSpeed;
          audioRef.current.load();
          if (resumeTime > 0) {
            const targetAudio = audioRef.current;
            const seekOnMetadata = () => {
              try {
                if (targetAudio.duration && resumeTime < targetAudio.duration) {
                  targetAudio.currentTime = resumeTime;
                  if (startTime === undefined) {
                    showToast(t('podcastResumedToast', { time: formatTime(resumeTime) }));
                  }
                }
              } catch (e) { }
            };
            targetAudio.addEventListener('loadedmetadata', seekOnMetadata, { once: true });
          }
          if (!isCrossfadingRef.current) {
            audioRef.current.volume = isMuted ? 0 : volume;
          }
          audioRef.current.play().catch((err) => {
            console.warn("Podcast audio play error:", err);
          });
        }
        return;
      }

      if (!song.id) {
        // Build smart query
        let query: string;
        if (song.isPodcast) {
          query = buildPodcastQuery(song.artist || '', song.title || '');
        } else {
          if (rightSidebarMode !== 'lyrics') {
            setRightSidebarMode('lyrics');
          }
          const baseQuery = song.originalQuery || (`${song.artist} ${song.title}`);
          query = settings?.prioritizeOfficialAudio !== false ? buildSmartSearchQuery(baseQuery) : baseQuery;
        }
        let url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`;
        try {
          let resData = (window as any).electronAPI
            ? await (window as any).electronAPI.fetchUrl(url)
            : await (await fetch(url)).json();
            
          if (typeof resData === 'string') {
            try { resData = JSON.parse(resData); } catch (e) {}
          }

          if (resData && resData.results && resData.results.length > 0) {
            let validYt: any;
            if (song.isPodcast) {
              // Score each result by title similarity to the episode title
              const scored = resData.results
                .filter((item: any) => item.duration >= 60) // at least 1 min
                .map((item: any) => ({
                  item,
                  score: titleSimilarity(song.title || '', item.title || '')
                }))
                .sort((a: any, b: any) => b.score - a.score);
              // Pick the best match, but only if score > 0 (at least one word matched)
              validYt = scored.length > 0 && scored[0].score > 0
                ? scored[0].item
                : resData.results.find((item: any) => item.duration >= 120) || resData.results[0];
            } else {
              let candidates = resData.results.filter((item: any) => item.duration >= 50 && item.duration <= 720);
              if (settings?.prioritizeOfficialAudio !== false) {
                candidates = rankAudioResults(candidates, song.title || query, song.duration || 0);
              }
              const wantsVariant = userExplicitlyWantsAcoustic(song.title || query) || userExplicitlyWantsRemix(song.title || query) || userExplicitlyWantsLive(song.title || query);
              if (!wantsVariant) {
                const studioCandidates = candidates.filter((item: any) => !isUnwantedTrackVariant(item.title, item.artist));
                if (studioCandidates.length > 0) candidates = studioCandidates;
              }
              validYt = candidates[0] || resData.results.find((item: any) => item.duration >= 60 && item.duration <= 480) || resData.results[0];
            }

            if (validYt) {
              song.id = validYt.id;
              song.duration = validYt.duration;

              // Update queue dynamically to fix future plays
              setQueue(prev => prev.map(q => q.title === song.title ? { ...q, id: song.id, duration: song.duration } : q));
              setOriginalQueue(prev => prev.map(q => q.title === song.title ? { ...q, id: song.id, duration: song.duration } : q));
              setTopPodcasts(prev => prev.map(p => p.title === song.title ? { ...p, id: song.id, duration: song.duration } : p));
              setArtistSongs(prev => prev.map(a => a.title === song.title ? { ...a, id: song.id, duration: song.duration } : a));
            } else {
              showToast('Audio source not found.', 'error');
              return;
            }
          } else {
            showToast('Audio source not found.', 'error');
            return;
          }
        } catch (e) {
          showToast('Failed to resolve audio.', 'error');
          return;
        }
      }


      setLyricsData(null);
      setTranslatedLyrics(null);
      setLyricsOffset(getSavedLyricsOffset(song.id) ?? 0);

      // 1. Update UI langsung agar terasa lebih cepat
      const cleanSong = formatTrackLikeSpotify(song);
      setCurrentSong(cleanSong);
      addToHistory(cleanSong);
      
      setDuration(cleanSong.duration || song.duration || 0);
      setIsPlaying(true);
      if (settings.autoLyrics) {
        setIsRightSidebarOpen(true);
        setRightSidebarMode('lyrics');
      }

      // 2. Fetch lyrics berjalan di background
      fetchLyrics(cleanSong.title, cleanSong.artist, cleanSong.duration || song.duration || 0);

      // 3. Stream audio
      ensureAudioType(!!song.isPodcast);

      if (audioRef.current) {
        // PODCAST with direct RSS audio URL → stream directly (no YouTube)
        if (song.isPodcast && song.audioUrl) {
          audioRef.current.src = song.audioUrl;
          audioRef.current.load();
          audioRef.current.play().catch(() => { });
          return;
        }

        const isStreamingOnly = !!song.isPodcast || homeMode === 'podcast' || (song.duration && song.duration >= 900);
        const forceStream = isStreamingOnly;

        let streamUrl = `${API_BASE_URL}/api/stream?id=${song.id}`;
        if (settings.audioQuality && settings.audioQuality !== 'auto') {
          streamUrl += `&quality=${settings.audioQuality}`;
        }

        if (isStreamingOnly) {
          streamUrl += '&nocache=true';
        }

        let isCached = false;

        if ((window as any).electronAPI?.checkCache) {
          isCached = await (window as any).electronAPI.checkCache(song.id);
        }

        if ((window as any).electronAPI?.clearTempCache) {
          (window as any).electronAPI.clearTempCache(song.id);
        }

        const cacheMode = settings.cacheMode || 'smart';
        playSessionIdRef.current += 1;
        const sessionId = playSessionIdRef.current;

        if (isCached && !forceStream) {
          audioRef.current.src = `donpollo-cache://${song.id}`;
        } else {
          const targetAudio = audioRef.current;
          targetAudio.src = streamUrl;
          if (cacheMode !== 'stream' && !forceStream) {
            // Tunggu sampai stream utama selesai buffer (canplaythrough) agar tidak double-download ke server saat klik pertama
            const scheduleLocalCache = () => {
              setTimeout(() => {
                if (
                  (window as any).electronAPI?.cacheAudio &&
                  playSessionIdRef.current === sessionId &&
                  currentSongRef.current?.id === song.id
                ) {
                  const isTemp = cacheMode === 'temp';
                  (window as any).electronAPI.cacheAudio(song, streamUrl, true, isTemp);
                }
              }, 1500);
            };
            targetAudio.addEventListener('canplaythrough', scheduleLocalCache, { once: true });
          }
        }

        if (startTime !== undefined && startTime > 0) {
          const targetAudio = audioRef.current;
          try {
            targetAudio.currentTime = startTime;
          } catch (e) { }
          const seekOnMetadata = () => {
            try {
              if (targetAudio.duration && startTime < targetAudio.duration) {
                targetAudio.currentTime = startTime;
              }
            } catch (e) { }
          };
          targetAudio.addEventListener('loadedmetadata', seekOnMetadata, { once: true });
        }

        if (!isCrossfadingRef.current) {
          audioRef.current.volume = isMuted ? 0 : volume;
        }

        audioRef.current.play().catch(async (err) => {
          console.warn("Primary play interrupted or delayed:", err.name, err.message);
          if (err.name === 'AbortError' || playSessionIdRef.current !== sessionId) return;

          initialPlayHandlingRef.current = sessionId;

          // Retry 1: Minta backend refresh URL stream (hindari raw=true yang terkena IP-lock VPS)
          try {
            await new Promise(r => setTimeout(r, 400));
            if (playSessionIdRef.current !== sessionId || !audioRef.current) return;
            const refreshSep = streamUrl.includes('?') ? '&' : '?';
            audioRef.current.src = `${streamUrl}${refreshSep}refresh=true`;
            await audioRef.current.play();
            initialPlayHandlingRef.current = 0;
            setIsPlaying(true);
            return;
          } catch (retryErr) {
            console.warn("Stream refresh retry failed:", retryErr);
          }

          if (playSessionIdRef.current !== sessionId) return;

          // Cek alasan kegagalan dari backend agar pesan toast akurat
          let isRestricted = false;
          try {
            const probeRes = await fetch(`${API_BASE_URL}/api/prepare?id=${song.id}`);
            if (probeRes.status === 403 || probeRes.status === 404 || probeRes.status === 410) {
              isRestricted = true;
            }
          } catch { }

          showToast(isRestricted ? t('toastVideoLocked') : 'Gagal memutar audio dari server. Mencoba lagu berikutnya...', 'error');
          setIsPlaying(false);
          if (handleNextRef.current) setTimeout(() => handleNextRef.current(), 1500);
        });
      }
    } catch (err: any) {
      showToast(err.message, 'error');
      setIsPlaying(false);
      if (handleNextRef.current) setTimeout(() => handleNextRef.current(), 1500);
    }
  };

  // ─── Listen Along Sync Effect ───
  const syncingGuestSongIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (isGuest && activePartyId) {
      const hostUser = onlineUsers.find(u => u.discordId === activePartyId);
      if (hostUser) {
        // Otomatis sinkronkan settingan Crossfade Host ke state Guest (tanpa menimpa localStorage permanen)
        const hostCrossfadeVal = hostUser.currentSong?.crossfade ?? (hostUser as any).crossfade;
        if (hostCrossfadeVal !== undefined && hostCrossfadeVal !== null) {
          const hostCfStr = String(hostCrossfadeVal);
          if (savedGuestCrossfadeRef.current === null) {
            savedGuestCrossfadeRef.current = localStorage.getItem('donpollo_crossfade') || '0';
          }
          setSettings((prev: any) => (String(prev.crossfade ?? '0') === hostCfStr ? prev : { ...prev, crossfade: hostCfStr }));
        }

        if (hostUser.currentSong) {
          const hs = hostUser.currentSong;

          // Calculate exact time based on elapsed time since host reported it
          // Priority 1: Use serverAge (accurate to milliseconds calculated by MySQL, immune to local clock skew)
          // Priority 2: Fallback to client timestamp
          let elapsed = 0;
          if (typeof (hostUser as any).serverAge === 'number' && !isNaN((hostUser as any).serverAge)) {
            elapsed = Math.max(0, (hostUser as any).serverAge);
          } else if (hs.timestamp) {
            elapsed = Math.max(0, (Date.now() - hs.timestamp) / 1000);
          }

          let targetTime = (hs.currentTime || 0);
          if (hs.isPlaying) {
            targetTime += elapsed;
          }

          if (!currentSong || currentSong.id !== hs.id) {
            // Abaikan broadcast host jika host masih tertinggal (lagging) dari eager advance kita (maks 5s)
            const lastAdvance = (window as any).lastGuestAdvance || 0;
            const isStaleHost = (Date.now() - lastAdvance < 5000) && queue[currentIndex - 1]?.id === hs.id;

            if (!isStaleHost && syncingGuestSongIdRef.current !== hs.id) {
              syncingGuestSongIdRef.current = hs.id;
              Promise.resolve(executePlay(hs, targetTime)).finally(() => {
                if (syncingGuestSongIdRef.current === hs.id) {
                  syncingGuestSongIdRef.current = null;
                }
              });
              const hostQueue = hostUser.queue || queue;
              const idx = hostQueue.findIndex((q: any) => q.id === hs.id || q.title === hs.title);
              if (idx !== -1) {
                setCurrentIndex(idx);
              }
            }
          } else {
            syncingGuestSongIdRef.current = null;
            // If already playing the same song, check if we need to sync time or play/pause state
            if (audioRef.current) {
              if (hs.isPlaying && audioRef.current.paused) {
                audioRef.current.play().catch(() => { });
              } else if (!hs.isPlaying && !audioRef.current.paused) {
                audioRef.current.pause();
              }

              if (hs.isPlaying) {
                const diff = audioRef.current.currentTime - targetTime;
                const absDiff = Math.abs(diff);

                if (absDiff > 2.0) {
                  // Large desync (> 2s, e.g. host scrubbed, initial seek, or network jump): hard seek
                  audioRef.current.currentTime = targetTime;
                  audioRef.current.playbackRate = 1.0;
                } else if (absDiff > 0.15) {
                  // Smooth micro-sync (Spotify/Discord style):
                  // Dynamically nudge playback rate slightly without audible pitch change or stuttering
                  if (diff > 0) {
                    // Guest is ahead of host: slow down slightly by 4% to let host catch up
                    audioRef.current.playbackRate = 0.96;
                  } else {
                    // Guest is behind host: speed up slightly by 4% to catch up with host
                    audioRef.current.playbackRate = 1.04;
                  }
                } else {
                  // Within 150ms: in tight phase lockstep!
                  if (audioRef.current.playbackRate !== 1.0) {
                    audioRef.current.playbackRate = 1.0;
                  }
                }
              } else {
                if (audioRef.current.playbackRate !== 1.0) {
                  audioRef.current.playbackRate = 1.0;
                }
              }
            }
          }

          // Sync queue for guest secara ringan tanpa JSON.stringify tiap 1.5 detik
          if (hostUser.queue && hostUser.queue.length > 0) {
            const hq = hostUser.queue;
            const isSameQueue = (prev: any[]) =>
              prev.length === hq.length &&
              prev[0]?.id === hq[0]?.id &&
              prev[prev.length - 1]?.id === hq[hq.length - 1]?.id;
            setQueue(prev => (isSameQueue(prev) ? prev : hq));
            setOriginalQueue(prev => (isSameQueue(prev) ? prev : hq));
          }
        } else {
          // Host menghentikan pemutaran (currentSong === null) -> ikut pause guest
          syncingGuestSongIdRef.current = null;
          if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
          }
          setIsPlaying(false);
        }
      }
    }
  }, [onlineUsers, isGuest, activePartyId, currentSong]);

  // Restore personal crossfade and playback rate setting when guest leaves party
  useEffect(() => {
    if (!isGuest || !activePartyId) {
      if (audioRef.current) {
        const targetRate = currentSong?.isPodcast ? podcastSpeed : 1.0;
        if (audioRef.current.playbackRate !== targetRate) {
          audioRef.current.playbackRate = targetRate;
        }
      }
      if (savedGuestCrossfadeRef.current !== null) {
        const originalCf = savedGuestCrossfadeRef.current;
        savedGuestCrossfadeRef.current = null;
        localStorage.setItem('donpollo_crossfade', originalCf);
        setSettings((prev: any) => ({ ...prev, crossfade: originalCf }));
      }
    }
  }, [isGuest, activePartyId, currentSong?.isPodcast, podcastSpeed]);

  // ─── Lyrics Translation Effect ───────────────────────────────
  const handleChangeLyricsTargetLang = useCallback((lang: string) => {
    setSettings((p: any) => {
      const updated = { ...p, lyricsTargetLang: lang };
      localStorage.setItem('donpollo_settings', JSON.stringify(updated));
      return updated;
    });
    if (!showLyricTranslation) setShowLyricTranslation(true);
  }, [showLyricTranslation]);

  useEffect(() => {
    if (!showLyricTranslation || !lyricsData || lyricsData.length === 0 || !currentSong?.id) {
      if (!showLyricTranslation) setTranslatedLyrics(null);
      return;
    }
    let cancelled = false;
    const pref = settings.lyricsTargetLang || 'auto';
    const targetLang = pref === 'auto' ? (settings.language || 'en') : pref;
    setIsTranslatingLyrics(true);
    translateLyricsLines(
      currentSong.id,
      lyricsData.map(l => l.isInstrumental ? '' : l.text),
      targetLang
    ).then(res => {
      if (!cancelled) {
        setTranslatedLyrics(res);
        setIsTranslatingLyrics(false);
      }
    }).catch(() => {
      if (!cancelled) setIsTranslatingLyrics(false);
    });
    return () => { cancelled = true; };
  }, [showLyricTranslation, lyricsData, currentSong?.id, settings.language, settings.lyricsTargetLang]);

  const augmentSongWithUser = (song: any) => {
    if (!discordUser) return song;
    return {
      ...song,
      addedBy: {
        id: discordUser.id,
        name: discordUser.global_name || discordUser.username,
        avatarUrl: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : `https://ui-avatars.com/api/?name=${encodeURIComponent(discordUser.username)}`
      }
    };
  };

  const addToHistory = (song: any) => {
    if (!song || (!song.id && !song.title)) return;
    const formatted = formatTrackLikeSpotify(song) || song;
    const cleanSong = {
      id: formatted.id || song.id,
      title: formatted.title || song.title,
      artist: formatted.artist || song.artist || 'Unknown Artist',
      thumbnail: getCleanThumbnail(formatted.thumbnail || song.thumbnail) || getHighResImage(formatted.cover || song.cover) || formatted.thumbnail || song.thumbnail || '',
      cover: formatted.cover || song.cover || '',
      duration: formatted.duration || song.duration || 0,
      originalQuery: formatted.originalQuery || song.originalQuery,
      isPodcast: song.isPodcast,
      playedAt: Date.now()
    };
    setPlayHistory(prev => {
      const targetBase = cleanBaseSongTitle(cleanSong.title);
      const targetArtist = (cleanSong.artist || '').toLowerCase().trim();
      const filtered = prev.filter(item => {
        if (cleanSong.id && item.id && item.id === cleanSong.id) return false;
        if (targetBase && cleanBaseSongTitle(item.title) === targetBase) {
          const itemArtist = (item.artist || '').toLowerCase().trim();
          if (itemArtist === targetArtist) return false;
        }
        return true;
      });
      return [cleanSong, ...filtered].slice(0, 100);
    });
  };

  const startPlayingFromList = async (list: any[], startIndex: number) => {
    if (!list || list.length === 0) return;

    if (isGuest && activePartyId) {
      for (const song of list) {
        await (window as any).electronAPI.sendQueueRequest(activePartyId, discordUser?.id, discordUser?.global_name || discordUser?.username, song);
      }
      showToast(`Berhasil meminta Host untuk menambahkan ${list.length} lagu ke antrean!`, 'success');
      return;
    }

    const cleanedList = (list || []).map(s => formatTrackLikeSpotify(s));
    let song = cleanedList[startIndex];

    // Reorder list so the clicked song is first, then wrapping around
    const reorderedList = [...cleanedList.slice(startIndex), ...cleanedList.slice(0, startIndex)];

    setOriginalQueue(reorderedList);

    if (isShuffled) {
      const shuffled = [...reorderedList].sort(() => Math.random() - 0.5);
      // Ensure the clicked song remains the first one even when shuffled
      const songIndex = shuffled.findIndex(s => s === song);
      if (songIndex !== -1) {
        shuffled.splice(songIndex, 1);
        shuffled.unshift(song);
      }
      setQueue(shuffled);
      setCurrentIndex(0);
    } else {
      setQueue(reorderedList);
      setCurrentIndex(0);
    }

    executePlay(song);
  };

  const handleNextRef = useRef<(isAutomatic?: boolean) => void>(() => { });
  const handlePrevRef = useRef<() => void>(() => { });
  const togglePlayRef = useRef<() => void>(() => { });

  useMediaSession({
    currentSong,
    isPlaying,
    progress,
    duration,
    podcastSpeed,
    audioRef,
    setProgress,
    togglePlayRef,
    handlePrevRef,
    handleNextRef,
  });

  const autoplayFetchingRef = useRef<string | null>(null);

  const fetchAutoplayTracks = useCallback(async (seedSong: any): Promise<any[]> => {
    if (!seedSong) return [];
    const existingIds = new Set(queueRef.current.map((s: any) => s?.id).filter(Boolean));
    const recentTitles = new Set(
      (playHistory || []).slice(0, 20).map((h: any) => cleanBaseSongTitle(h?.title || '').toLowerCase()).filter(Boolean)
    );
    queueRef.current.forEach((q: any) => {
      const base = cleanBaseSongTitle(q?.title || '').toLowerCase();
      if (base) recentTitles.add(base);
    });

    const filterCandidates = (list: any[]) => {
      const picked: any[] = [];
      for (const raw of list) {
        if (!raw || !raw.id || existingIds.has(raw.id)) continue;
        const base = cleanBaseSongTitle(raw.title || '').toLowerCase();
        if (base && recentTitles.has(base)) continue;
        if (raw.duration && (raw.duration < 45 || raw.duration > 720)) continue;
        if (isUnwantedTrackVariant(raw.title || '', raw.artist || '')) continue;
        const formatted = formatTrackLikeSpotify(raw);
        if (!formatted) continue;
        existingIds.add(formatted.id);
        if (base) recentTitles.add(base);
        picked.push({ ...formatted, isAutoplay: true });
        if (picked.length >= 3) break;
      }
      return picked;
    };

    try {
      let candidates: any[] = [];
      if (isOffline) {
        const pool = [...(downloadedSongs || [])].sort(() => Math.random() - 0.5);
        candidates = filterCandidates(pool);
      } else {
        if (seedSong.id) {
          try {
            const res = await fetch(`${API_BASE_URL}/api/autoplay?id=${encodeURIComponent(seedSong.id)}&limit=10`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data?.results)) {
                candidates = filterCandidates(data.results);
              }
            }
          } catch { }
        }
        if (candidates.length === 0) {
          const query = seedSong.artist && seedSong.artist !== 'Unknown'
            ? `${seedSong.artist} songs`
            : seedSong.title;
          if (query) {
            try {
              const res = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}&limit=10`);
              if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data?.results)) {
                  candidates = filterCandidates(data.results);
                }
              }
            } catch { }
          }
        }
      }

      if (candidates.length > 0) {
        setQueue(prev => [...prev, ...candidates]);
        setOriginalQueue(prev => [...prev, ...candidates]);
        // Pre-warm lagu autoplay pertama di background agar transisi instan
        if (!isOffline && candidates[0]?.id) {
          let prepareUrl = `${API_BASE_URL}/api/prepare?id=${candidates[0].id}`;
          if (settingsRef.current?.audioQuality && settingsRef.current.audioQuality !== 'auto') {
            prepareUrl += `&quality=${settingsRef.current.audioQuality}`;
          }
          fetch(prepareUrl).catch(() => { });
        }
      }
      return candidates;
    } catch {
      return [];
    }
  }, [isOffline, downloadedSongs, playHistory]);

  // Pre-fetch Autoplay saat lagu terakhir di antrean sedang diputar (loopMode === 'off')
  useEffect(() => {
    const canAutoplay =
      settings.autoplay !== false &&
      loopMode === 'off' &&
      !isGuest &&
      !!currentSong &&
      !currentSong.isPodcast &&
      homeMode !== 'podcast' &&
      !(currentSong.duration && currentSong.duration >= 900) &&
      queue.length > 0 &&
      currentIndex === queue.length - 1;

    if (!canAutoplay || !currentSong?.id) return;
    if (autoplayFetchingRef.current === currentSong.id) return;

    autoplayFetchingRef.current = currentSong.id;
    const timer = setTimeout(() => {
      if (
        settingsRef.current?.autoplay !== false &&
        queueRef.current.length > 0 &&
        currentSongRef.current?.id === currentSong.id
      ) {
        fetchAutoplayTracks(currentSong);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentSong?.id, currentIndex, queue.length, loopMode, settings.autoplay, isGuest, homeMode, fetchAutoplayTracks]);

  const handleNext = async (eOrAuto: boolean | React.MouseEvent = false) => {
    const isAutomatic = typeof eOrAuto === 'boolean' ? eOrAuto : false;
    if (isGuest && activePartyId && !isAutomatic) return;

    const isPartyGuest = isGuest && !!activePartyId;

    // Mode: Loop 1 Lagu (Ulangi lagu ini terus-menerus) — dinonaktifkan untuk Guest agar mengikuti Host
    if (!isPartyGuest && isAutomatic && loopMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
        setProgress(0);
        setIsPlaying(true);
      } else if (currentSongRef.current) {
        executePlay(currentSongRef.current);
      }
      return;
    }

    if (currentIndex < queue.length - 1) {
      if (isGuest) {
        (window as any).lastGuestAdvance = Date.now();
      }

      let nextSong = queue[currentIndex + 1];
      setCurrentIndex(currentIndex + 1);
      executePlay(nextSong);
    } else if (queue.length > 0) {
      if (isGuest) {
        (window as any).lastGuestAdvance = Date.now();
      }
      if (loopMode === 'all') {
        // Loop Playlist: kembali ke lagu pertama di antrean
        setCurrentIndex(0);
        executePlay(queue[0]);
      } else if (!isPartyGuest && settingsRef.current?.autoplay !== false && currentSongRef.current && !currentSongRef.current.isPodcast && homeMode !== 'podcast') {
        // Fallback jika user klik Next sebelum pre-fetch Autoplay selesai
        const added = await fetchAutoplayTracks(currentSongRef.current);
        if (added.length > 0) {
          const nextIdx = queueRef.current.length;
          setCurrentIndex(nextIdx);
          executePlay(added[0]);
        } else {
          setIsPlaying(false);
        }
      } else {
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(false);
    }
  };

  const toggleLoopMode = () => {
    if (loopMode === 'off') setLoopMode('all');
    else if (loopMode === 'all') setLoopMode('one');
    else setLoopMode('off');
  };
  handleNextRef.current = handleNext;

  const playSingleSong = async (song: any) => {
    let finalSong = song;
    if (isGuest && activePartyId) {
      await (window as any).electronAPI.sendQueueRequest(activePartyId, discordUser?.id, discordUser?.global_name || discordUser?.username, finalSong);
      showToast(`Berhasil meminta Host untuk menambahkan "${finalSong.title}" ke antrean!`, 'success');
      return;
    }

    if (queue.length > 0) {
      const newQ = [...queue];
      newQ.splice(currentIndex + 1, 0, finalSong);
      setQueue(newQ);
      setOriginalQueue(newQ);
      setCurrentIndex(currentIndex + 1);
      executePlay(finalSong);
    } else {
      setQueue([finalSong]);
      setOriginalQueue([finalSong]);
      setCurrentIndex(0);
      executePlay(finalSong);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, song: any) => {
    e.preventDefault();
    setPlaylistContextMenu(null);
    setContextMenu({ x: e.clientX, y: e.clientY, song });
  };

  const handlePrev = () => {
    if (isGuest && activePartyId) return;
    if (progress > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      executePlay(queue[currentIndex - 1]);
    } else if (loopMode !== 'off' && queue.length > 0) {
      setCurrentIndex(queue.length - 1);
      executePlay(queue[queue.length - 1]);
    }
  };

  executePlayRef.current = executePlay;

  const togglePlay = () => {
    if (isGuest && activePartyId) return;
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        lastPausedAtRef.current = Date.now();
        if (fadeAudioRef.current) fadeAudioRef.current.pause();
      } else {
        const timeSincePause = Date.now() - (lastPausedAtRef.current || Date.now());
        if (lastPausedAtRef.current > 0 && timeSincePause > 120000) {
          console.log("Paused for too long, forcing fresh stream connection...");
          const currentSrc = audioRef.current.src;
          const currentTime = audioRef.current.currentTime;

          // Clean up old cache busters so URL doesn't grow infinitely
          const cleanSrc = currentSrc.split('&cb=')[0].split('?cb=')[0];
          const separator = cleanSrc.includes('?') ? '&' : '?';
          audioRef.current.src = `${cleanSrc}${separator}cb=${Date.now()}`;

          audioRef.current.load();
          audioRef.current.currentTime = currentTime;
          audioRef.current.play().catch(e => console.error("Recovery play failed", e));
          lastPausedAtRef.current = 0;
          setIsPlaying(true);
          return;
        }

        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error("Resume play failed", err);
            if (audioRef.current && currentSongRef.current && executePlayRef.current) {
              executePlayRef.current(currentSongRef.current, audioRef.current.currentTime);
            }
          });
        }
        if (fadeAudioRef.current) fadeAudioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  handlePrevRef.current = handlePrev;
  togglePlayRef.current = togglePlay;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isGuest && activePartyId) return;
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
    if (discordUser && activePartyId === discordUser.id) {
      syncPresenceRef.current?.();
    }
  };

  const toggleShuffle = () => {
    if (!isShuffled) {
      if (queue.length > 0) {
        const played = queue.slice(0, currentIndex);
        const current = queue[currentIndex];
        const remaining = queue.slice(currentIndex + 1);

        for (let i = remaining.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }

        setQueue([...played, current, ...remaining]);
        // currentIndex remains the same!
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

  const goHome = () => { navigate('home'); setSearchQuery(''); setSearchResults([]); };

  const fetchArtistSongs = async (
    artist: string,
    filter: 'popular' | 'newest',
    isPodcast: boolean = false,
    podcastId?: string,
    feedUrlParam?: string
  ) => {
    setIsArtistLoading(true);
    setArtistSongs([]);
    try {
      let queries: string[] = [];

      // ============================================================
      // PODCAST PATH: Use Apple RSS Feed directly (100% iTunes native)
      // ============================================================
      if (isPodcast) {
        try {
          let feedUrl: string = feedUrlParam || '';
          let podcastArtwork: string = '';
          let podcastCollectionName: string = artist;

          // Step 1: Resolve RSS feedUrl
          if (!feedUrl && podcastId) {
            // Lookup podcast directly by Apple Podcast ID
            const lookupUrl = `https://itunes.apple.com/lookup?id=${podcastId}&entity=podcast`;
            let lookupData: any = null;
            try {
              lookupData = (window as any).electronAPI?.fetchUrl
                ? await (window as any).electronAPI.fetchUrl(lookupUrl)
                : await (await fetch(lookupUrl)).json();
            } catch {
              try {
                lookupData = await (await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(lookupUrl)}`)).json();
              } catch { }
            }
            if (typeof lookupData === 'string') {
              try { lookupData = JSON.parse(lookupData); } catch { }
            }
            if (lookupData?.results?.[0]) {
              const p = lookupData.results[0];
              feedUrl = p.feedUrl;
              podcastArtwork = (p.artworkUrl600 || p.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg');
              podcastCollectionName = p.collectionName || p.trackName || artist;
            }
          }

          if (!feedUrl) {
            // Search iTunes for the podcast to get its RSS feedUrl
            const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&media=podcast&entity=podcast&limit=5`;
            let searchData: any = null;
            try {
              searchData = (window as any).electronAPI?.fetchUrl
                ? await (window as any).electronAPI.fetchUrl(searchUrl)
                : await (await fetch(searchUrl)).json();
            } catch {
              try {
                searchData = await (await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`)).json();
              } catch { }
            }
            if (typeof searchData === 'string') {
              try { searchData = JSON.parse(searchData); } catch { }
            }

            if (searchData?.results?.length) {
              const scored = searchData.results.map((p: any) => ({
                p,
                score: titleSimilarity(artist, p.collectionName || p.trackName || '')
              })).sort((a: any, b: any) => b.score - a.score);
              const podcast = scored[0].p;
              feedUrl = podcast.feedUrl;
              podcastArtwork = (podcast.artworkUrl600 || podcast.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg');
              podcastCollectionName = podcast.collectionName || podcast.trackName || artist;
            }
          }

          if (!feedUrl) throw new Error('No RSS feed URL found');

          // Step 2: Fetch and parse the RSS feed
          let xmlText: string = '';
          if ((window as any).electronAPI?.fetchText) {
            xmlText = await (window as any).electronAPI.fetchText(feedUrl);
          } else {
            try {
              xmlText = await (await fetch(feedUrl)).text();
            } catch {
              xmlText = await (await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`)).text();
            }
          }

          const parser = new DOMParser();
          const xml = parser.parseFromString(xmlText, 'text/xml');
          const items = Array.from(xml.querySelectorAll('item'));

          if (items.length === 0) throw new Error('RSS has no episodes');

          // Step 3: Parse episodes from RSS
          const getTag = (item: Element, tag: string) => item.querySelector(tag)?.textContent?.trim() || '';
          const getAttr = (item: Element, tag: string, attr: string) => item.querySelector(tag)?.getAttribute(attr) || '';

          let episodes = items.map((item, idx) => {
            const enclosureUrl = getAttr(item, 'enclosure', 'url');
            const durationStr = getTag(item, 'itunes\\:duration') || getTag(item, 'duration');
            let durationSec = 0;
            if (durationStr) {
              const parts = durationStr.split(':').map(Number);
              if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
              else if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
              else durationSec = Number(durationStr) || 0;
            }
            const pubDate = getTag(item, 'pubDate');
            const image = getAttr(item, 'itunes\\:image', 'href') || getTag(item, 'itunes\\:image') || podcastArtwork;

            return {
              id: enclosureUrl || `podcast-ep-${idx}-${Math.random()}`,
              title: getTag(item, 'title'),
              artist: podcastCollectionName,
              thumbnail: image || podcastArtwork,
              duration: durationSec,
              audioUrl: enclosureUrl, // Direct MP3/M4A URL - 100% iTunes/RSS
              isPodcast: true,
              releaseDate: pubDate ? new Date(pubDate).getTime() : 0,
            };
          }).filter((ep: any) => ep.title && ep.audioUrl);

          if (filter === 'newest') {
            episodes.sort((a: any, b: any) => b.releaseDate - a.releaseDate);
          }

          setArtistSongs(episodes.slice(0, 50));
          setIsArtistLoading(false);
          return;
        } catch (rssErr) {
          console.warn('Apple RSS direct engine failed, trying iTunes episode search fallback:', rssErr);
        }

        // RSS Fallback: Use iTunes episode search (100% native iTunes episode streaming)
        try {
          const targetUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&media=podcast&entity=podcastEpisode&limit=30`;
          let itunesData: any = null;
          try {
            itunesData = (window as any).electronAPI?.fetchUrl
              ? await (window as any).electronAPI.fetchUrl(targetUrl)
              : await (await fetch(targetUrl)).json();
          } catch {
            try {
              itunesData = await (await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`)).json();
            } catch { }
          }
          if (typeof itunesData === 'string') {
            try { itunesData = JSON.parse(itunesData); } catch { }
          }

          if (itunesData?.results && itunesData.results.length > 0) {
            const tracks = itunesData.results;
            if (filter === 'newest') {
              tracks.sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
            }
            const initialSongs = tracks.slice(0, 30).map((t: any, idx: number) => {
              const directAudio = t.episodeUrl || t.previewUrl || '';
              return {
                id: directAudio || String(t.trackId || `itunes-ep-${idx}`),
                title: t.trackName,
                artist: t.artistName,
                thumbnail: (t.artworkUrl600 || t.artworkUrl160 || t.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg'),
                duration: (t.trackTimeMillis && t.trackTimeMillis > 0) ? Math.floor(t.trackTimeMillis / 1000) : 0,
                audioUrl: directAudio,
                originalQuery: `${t.artistName} ${t.trackName}`,
                isPodcast: true,
                releaseDate: t.releaseDate ? new Date(t.releaseDate).getTime() : 0,
              };
            });
            setArtistSongs(initialSongs);
            setIsArtistLoading(false);
            return;
          }
        } catch (err) {
          console.error('iTunes podcast episode fallback failed', err);
        }
        setIsArtistLoading(false);
        return;
      }

      // ============================================================
      // MUSIC PATH: iTunes + YouTube Music (merged for best coverage)
      // ============================================================
      let itunesInitialSongs: any[] = [];
      try {
        const targetUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artist)}&entity=song&limit=100`;
        const itunesData = (window as any).electronAPI
          ? await (window as any).electronAPI.fetchUrl(targetUrl)
          : await (await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`)).json();

        if (itunesData.results && itunesData.results.length > 0) {
          let tracks = itunesData.results;
          tracks = tracks.filter((t: any) => t.artistName && t.artistName.toLowerCase().includes(artist.toLowerCase()) && !isUnwantedTrackVariant(t.trackName, t.artistName));

          if (filter === 'newest') {
            tracks.sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
          }

          const uniqueTracks = new Map<string, any>();
          for (const t of tracks) {
            if (!uniqueTracks.has(t.trackName)) uniqueTracks.set(t.trackName, t);
          }

          const topTracks = Array.from(uniqueTracks.values()).slice(0, 30);

          itunesInitialSongs = topTracks.map((t: any) => ({
            id: null,
            title: t.trackName,
            artist: t.artistName,
            thumbnail: (t.artworkUrl600 || t.artworkUrl160 || t.artworkUrl100 || t.artworkUrl60 || '').replace('100x100bb.jpg', '500x500bb.jpg').replace('100x100bb.png', '500x500bb.png').replace('160x160bb.jpg', '600x600bb.jpg'),
            duration: (t.trackTimeMillis && t.trackTimeMillis > 0) ? Math.floor(t.trackTimeMillis / 1000) : 0,
            originalQuery: `${t.artistName} ${t.trackName} official audio`,
            isPodcast: false,
            _fromItunes: true
          }));
        }
      } catch (err) {
        console.error('iTunes API error', err);
      }

      // ── Always also fetch YouTube Music to supplement ──
      // This is critical for artists with few or no iTunes results (e.g. Kerispatih)
      let ytSupplement: any[] = [];
      const ytSeenTitles = new Set<string>();
      try {
        // "- Topic" targets YouTube Music auto-generated channels (clean studio audio)
        const ytMusicQueries = filter === 'popular'
          ? [`${artist} - Topic`, `${artist} official audio`, `${artist} audio`]
          : [`${artist} - Topic`, `${artist} official audio`, `${artist} terbaru`];

        for (const ytQuery of ytMusicQueries) {
          const ytRes = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(ytQuery)}`);
          const ytData = await ytRes.json();
          if (ytData.results && ytData.results.length > 0) {
            let candidates = ytData.results.filter((item: any) => item.duration >= 50 && item.duration <= 720);
            candidates = rankAudioResults(candidates, artist);
            const studioCandidates = candidates.filter((item: any) => !isUnwantedTrackVariant(item.title, item.artist));
            const pool = (studioCandidates.length > 0 ? studioCandidates : candidates).slice(0, 20);
            for (const item of pool) {
              const formatted = formatTrackLikeSpotify(item, artist);
              if (!formatted || !formatted.title) continue;
              // Deduplicate within YouTube results by normalized title (strips #music etc.)
              const cleanTitle = cleanBaseSongTitle(formatted.title);
              if (cleanTitle && !ytSeenTitles.has(cleanTitle)) {
                ytSeenTitles.add(cleanTitle);
                ytSupplement.push(formatted);
              }
            }
          }
          if (ytSupplement.length >= 20) break;
        }
      } catch (ytErr) {
        console.error('YouTube Music supplement fetch failed:', ytErr);
      }

      // u2500u2500 Merge: iTunes (HD covers) + YouTube Music (full catalog) u2500u2500
      const itunesTitleSet = new Set<string>(
        itunesInitialSongs.map(s => cleanBaseSongTitle(s.title))
      );
      // Only add YouTube songs not already represented by iTunes entries
      const ytOnlySongs = ytSupplement.filter(s => {
        const base = cleanBaseSongTitle(s.title);
        return base && !itunesTitleSet.has(base);
      });

      const mergedSongs = [...itunesInitialSongs, ...ytOnlySongs].slice(0, 30);

      if (mergedSongs.length > 0) {
        // Show all songs immediately (YouTube ones already have IDs, iTunes ones get mapped in background)
        setArtistSongs(mergedSongs);
        setIsArtistLoading(false);

        // Background YouTube ID mapping for iTunes-only songs (those without an id yet)
        (async () => {
          for (let idx = 0; idx < mergedSongs.length; idx++) {
            const song = mergedSongs[idx];
            if (song.id) continue; // Already has YouTube ID (from YouTube supplement or prior mapping)
            const url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(song.originalQuery)}`;
            try {
              const data = (window as any).electronAPI
                ? await (window as any).electronAPI.fetchUrl(url)
                : await (await fetch(url)).json();
              if (data && data.results && data.results.length > 0) {
                let candidates = data.results.filter((item: any) => item.duration >= 50 && item.duration <= 720);
                candidates = rankAudioResults(candidates, song.title || '', song.duration || 0);
                const studioCandidates = candidates.filter((item: any) => !isUnwantedTrackVariant(item.title, item.artist));
                const validYt = studioCandidates[0] || candidates[0] || data.results.find((item: any) => item.duration >= 60 && item.duration <= 480);
                if (validYt) {
                  setArtistSongs(prev => {
                    const next = [...prev];
                    if (next[idx] && next[idx].title === song.title) next[idx] = { ...next[idx], id: validYt.id, duration: validYt.duration };
                    return next;
                  });
                }
              }
            } catch (e) { console.error('BG mapping error:', e); }
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        })();

        return;
      }

      // ── YouTube Music fallback when iTunes returns no results ──
      // This handles artists not on iTunes (e.g. Indonesian indie bands)
      if (queries.length === 0) {
        try {
          const ytMusicQuery = filter === 'popular'
            ? `${artist} official audio`
            : `${artist} new song official audio`;
          const ytRes = await fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(ytMusicQuery)}`);
          const ytData = await ytRes.json();
          if (ytData.results && ytData.results.length > 0) {
            let ytCandidates = ytData.results.filter((item: any) =>
              item.duration >= 50 && item.duration <= 720
            );
            ytCandidates = rankAudioResults(ytCandidates, artist);
            const studioYt = ytCandidates.filter((item: any) => !isUnwantedTrackVariant(item.title, item.artist));
            const finalYt = (studioYt.length > 0 ? studioYt : ytCandidates).slice(0, 15);
            if (finalYt.length > 0) {
              // Deduplicate by clean title
              const seenTitles = new Set<string>();
              const uniqueYt: any[] = [];
              for (const item of finalYt) {
                const base = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                if (!seenTitles.has(base)) {
                  seenTitles.add(base);
                  uniqueYt.push(formatTrackLikeSpotify(item, artist));
                }
              }
              if (uniqueYt.length > 0) {
                setArtistSongs(uniqueYt);
                setIsArtistLoading(false);
                return;
              }
            }
          }
        } catch (ytErr) {
          console.error('YouTube Music artist fallback failed:', ytErr);
        }
      }

      // Final fallback with broad queries
      if (queries.length === 0) {
        queries = filter === 'popular'
          ? [`${artist} official audio popular`, `${artist} hit songs audio`, `${artist} best songs`, `${artist} top hits`]
          : [`${artist} new release audio`, `${artist} newest songs`, `${artist} latest audio`, `${artist} new songs`];
      }

      // Progressive loading for fallback
      let firstBatchLoaded = false;

      const fetchPromises = queries.map((query) => {
        return fetch(`${API_BASE_URL}/api/search?q=${encodeURIComponent(query)}`)
          .then(res => res.json())
          .then(data => {
            if (data.results) {
              const candidates = rankAudioResults(data.results.filter((item: any) => item.duration >= 60 && item.duration <= 480 && !isUnwantedTrackVariant(item.title, item.artist)), artist);
              const rawSong = candidates[0] || data.results.find((item: any) => item.duration >= 60 && item.duration <= 480 && !isUnwantedTrackVariant(item.title, item.artist)) || data.results[0];
              const validSong = rawSong ? formatTrackLikeSpotify(rawSong, artist) : null;

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

  const openArtistPage = (artistName: string, podcastId?: string, feedUrl?: string) => {
    const isPodcastMode = artistName.toLowerCase().endsWith('__podcast__');
    const cleanName = isPodcastMode ? artistName.slice(0, -11).trim() : artistName;
    setIsArtistPodcast(isPodcastMode);
    setActiveArtist(cleanName);
    if (isPodcastMode) {
      setActivePodcastMeta({ podcastId, feedUrl });
    } else {
      setActivePodcastMeta(null);
    }
    navigate('artist', { artistName: cleanName });
    setArtistFilter('popular');
    setShowSuggestions(false);
    fetchArtistSongs(cleanName, 'popular', isPodcastMode, podcastId, feedUrl);
  };

  fetchArtistSongsRef.current = fetchArtistSongs;

  // ─── Global Keyboard Shortcuts ───
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable ||
        activeEl.classList?.contains('search-input') ||
        activeEl.classList?.contains('chat-input')
      );

      // Command Palette (Ctrl+K or Cmd+K) — works everywhere
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
        return;
      }

      // Escape key behavior
      if (e.key === 'Escape') {
        if (showCommandPalette) {
          setShowCommandPalette(false);
          return;
        }
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        if (isInput) {
          activeEl?.blur();
          return;
        }
      }

      // If user is currently typing in an input, do not capture shortcuts
      if (isInput) return;

      // Toggle shortcuts modal (? or Ctrl+/)
      if (e.key === '?' || (e.key === '/' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      // Focus search (/)
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Space: Play / Pause
      if (e.key === ' ') {
        e.preventDefault();
        togglePlayRef.current?.();
        return;
      }

      // Seek or Next/Prev:
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          handleNextRef.current?.();
        } else if (audioRef.current) {
          audioRef.current.currentTime = Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + 5);
          setProgress(audioRef.current.currentTime);
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          handlePrevRef.current?.();
        } else if (audioRef.current) {
          audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
          setProgress(audioRef.current.currentTime);
        }
        return;
      }

      // Volume Up: ArrowUp
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVolume((v: number) => {
          const next = Math.min(1, +(v + 0.05).toFixed(2));
          if (audioRef.current) audioRef.current.volume = next;
          return next;
        });
        return;
      }

      // Volume Down: ArrowDown
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVolume((v: number) => {
          const next = Math.max(0, +(v - 0.05).toFixed(2));
          if (audioRef.current) audioRef.current.volume = next;
          return next;
        });
        return;
      }

      // M: Mute / Unmute
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMuted(m => !m);
        return;
      }

      // L: Like current song
      if (e.key === 'l' || e.key === 'L') {
        if (currentSongRef.current) {
          e.preventDefault();
          toggleLike(currentSongRef.current);
        }
        return;
      }

      // S: Toggle Shuffle
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        toggleShuffle();
        return;
      }

      // R: Toggle Repeat
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        toggleLoopMode();
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showShortcutsModal, toggleShuffle, toggleLoopMode, toggleLike]);

  // ═══════════════════════════════════════════════════════════════
  // PAGE RENDERERS
  // ═══════════════════════════════════════════════════════════════

  const renderLibraryPage = () => (
    <LibraryPage
      likedSongs={likedSongs}
      playHistory={playHistory}
      setPlayHistory={setPlayHistory}
      downloadedSongs={downloadedSongs}
      currentSong={currentSong}
      startPlayingFromList={startPlayingFromList}
      playSingleSong={playSingleSong}
      setDraggedGlobalSong={setDraggedGlobalSong}
      formatTime={formatTime}
      toggleLike={toggleLike}
      isLiked={isLiked}
      setAddToPlaylistSong={setAddToPlaylistSong}
      showToast={showToast}
      t={t}
    />
  );

  const generateOrGetMixTracks = async (pl: Playlist, forceRefresh = false): Promise<any[]> => {
    if (!FEATURE_FLAGS.ENABLE_PLAYLIST_MIX) {
      return pl.songs || [];
    }
    if (!forceRefresh && pl.songs && pl.songs.length >= 48) {
      return pl.songs;
    }
    setIsMixGeneratingId(pl.id);
    const mixType = pl.mixType || (pl.id.startsWith('vibe_temp_') ? 'vibe_mix' : 'discover_weekly');
    const mood = pl.mood || (pl.id.replace('vibe_temp_', '') as VibeType) || 'chill';
    try {
      const rawTracks = await generateAlgorithmicMix(
        mixType,
        mood,
        playHistory,
        likedSongs,
        API_BASE_URL,
        (window as any).electronAPI?.fetchUrl
      );
      const tracks = deduplicateTracks(rawTracks, 4, 50);
      if (tracks && tracks.length > 0) {
        const updatedPl: Playlist = {
          ...pl,
          avatar: getMixPlaylistCover(pl, { songs: tracks, playHistory, likedSongs }),
          songs: tracks
        };
        setMadeForYouPlaylists(prev => {
          const list = prev.map(p => p.id === pl.id ? updatedPl : p);
          localStorage.setItem('donpollo_made_for_you', JSON.stringify(list));
          return list;
        });
        return tracks;
      }
    } catch (err) {
      console.error('generateOrGetMixTracks error:', err);
      showToast(`Gagal meracik ${pl.name}`, 'error');
    } finally {
      setIsMixGeneratingId(null);
    }
    return [];
  };

  const openMadeForYouPlaylist = async (pl: Playlist) => {
    navigate('playlist-detail', { playlistId: pl.id });
    if (!pl.songs || pl.songs.length === 0) {
      await generateOrGetMixTracks(pl);
    }
  };

  const playMadeForYouPlaylist = async (pl: Playlist, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (pl.songs && pl.songs.length > 0) {
      const cleanTracks = deduplicateTracks(pl.songs, 4, 50);
      startPlayingFromList(cleanTracks, 0);
      showToast(`Memutar ${pl.name}`, 'success');
      return;
    }
    showToast(`Meracik & memutar ${pl.name}...`, 'success');
    const rawTracks = await generateOrGetMixTracks(pl);
    const tracks = deduplicateTracks(rawTracks, 4, 50);
    if (tracks && tracks.length > 0) {
      startPlayingFromList(tracks, 0);
      showToast(`Memutar ${pl.name}`, 'success');
    }
  };

  const regenerateMadeForYouMix = async (playlistId: string) => {
    const pl = madeForYouPlaylists.find(p => p.id === playlistId);
    if (!pl) return;
    showToast(`Meracik ulang ${pl.name}...`, 'success');
    await generateOrGetMixTracks(pl, true);
    showToast(`${pl.name} berhasil diperbarui!`, 'success');
  };

  useEffect(() => {
    if (!FEATURE_FLAGS.ENABLE_PLAYLIST_MIX) return;
    if (activePage === 'playlist-detail' && activePlaylistId) {
      const tempPl = madeForYouPlaylists.find(p => p.id === activePlaylistId);
      if (tempPl && tempPl.isTemporary && (!tempPl.songs || tempPl.songs.length === 0) && isMixGeneratingId !== tempPl.id) {
        generateOrGetMixTracks(tempPl);
      }
    }
  }, [activePage, activePlaylistId]);

  const renderPlaylistPage = () => (
    <PlaylistPage
      activePage={activePage}
      activePlaylistId={activePlaylistId}
      playlists={playlists}
      setPlaylists={setPlaylists}
      madeForYouPlaylists={madeForYouPlaylists}
      discordUser={discordUser}
      settings={settings}
      playHistory={playHistory}
      likedSongs={likedSongs}
      downloadedSongs={downloadedSongs}
      savedPlaylists={savedPlaylists}
      activeDownloads={activeDownloads}
      currentSong={currentSong}
      isEditingPlaylistName={isEditingPlaylistName}
      setIsEditingPlaylistName={setIsEditingPlaylistName}
      editPlaylistNameValue={editPlaylistNameValue}
      setEditPlaylistNameValue={setEditPlaylistNameValue}
      handleEditPlaylistName={handleEditPlaylistName}
      setShowAvatarPrompt={setShowAvatarPrompt}
      setAvatarUrlInput={setAvatarUrlInput}
      setShowCreatePlaylist={setShowCreatePlaylist}
      setShowImportPlaylist={setShowImportPlaylist}
      setShowCollabModal={setShowCollabModal}
      setCollabPlaylistId={setCollabPlaylistId}
      setShareCodeResult={setShareCodeResult}
      setPlaylistToDelete={setPlaylistToDelete}
      setPlaylistToRemove={setPlaylistToRemove}
      setActivePage={setActivePage}
      setActiveProfileId={setActiveProfileId}
      navigate={navigate}
      getDefaultDiscordAvatar={getDefaultDiscordAvatar}
      handleAvatarError={handleAvatarError}
      startPlayingFromList={startPlayingFromList}
      playSingleSong={playSingleSong}
      handleContextMenu={handleContextMenu}
      setContextMenu={setContextMenu}
      draggedGlobalSong={draggedGlobalSong}
      setDraggedGlobalSong={setDraggedGlobalSong}
      draggedPlaylistSongIdx={draggedPlaylistSongIdx}
      setDraggedPlaylistSongIdx={setDraggedPlaylistSongIdx}
      dragOverPlaylistSongIdx={dragOverPlaylistSongIdx}
      setDragOverPlaylistSongIdx={setDragOverPlaylistSongIdx}
      isMixGeneratingId={isMixGeneratingId}
      regenerateMadeForYouMix={regenerateMadeForYouMix}
      toggleLike={toggleLike}
      isLiked={isLiked}
      addSongToPlaylist={addSongToPlaylist}
      removeSongFromPlaylist={removeSongFromPlaylist}
      formatTime={formatTime}
      showToast={showToast}
      playlistSearchQuery={playlistSearchQuery}
      setPlaylistSearchQuery={setPlaylistSearchQuery}
      playlistSearchResults={playlistSearchResults}
      isPlaylistSearching={isPlaylistSearching}
      handlePlaylistSearch={handlePlaylistSearch}
      setPlaylistContextMenu={setPlaylistContextMenu}
      API_BASE_URL={API_BASE_URL}
      t={t}
    />
  );

  const renderProfilePage = () => (
    <ProfilePage
      isLoadingProfile={isLoadingProfile}
      profileData={profileData}
      setProfileData={setProfileData}
      activeProfileId={activeProfileId}
      discordUser={discordUser}
      onlineUsers={onlineUsers}
      isEditingBanner={isEditingBanner}
      setIsEditingBanner={setIsEditingBanner}
      bannerInputUrl={bannerInputUrl}
      setBannerInputUrl={setBannerInputUrl}
      myCustomStatus={myCustomStatus}
      setCustomStatusInput={setCustomStatusInput}
      setShowStatusModal={setShowStatusModal}
      following={following}
      setFollowing={setFollowing}
      settings={settings}
      setSettings={setSettings}
      listenerPercentile={listenerPercentile}
      savedPlaylists={savedPlaylists}
      setSavedPlaylists={setSavedPlaylists}
      setActivePlaylistId={setActivePlaylistId}
      setActivePage={setActivePage}
      handleAvatarError={handleAvatarError}
      startPlayingFromList={startPlayingFromList}
      handleContextMenu={handleContextMenu}
      formatTime={formatTime}
      showToast={showToast}
      t={t}
    />
  );

  const renderSettingsPage = () => (
    <SettingsPage
      updateInfo={updateInfo}
      setUpdateInfo={setUpdateInfo}
      settings={settings}
      setSettings={setSettings}
      discordUser={discordUser}
      getDiscordAvatar={getDiscordAvatar}
      handleAvatarError={handleAvatarError}
      refreshDiscordProfile={refreshDiscordProfile}
      isRefreshingProfile={isRefreshingProfile}
      logoutDiscord={logoutDiscord}
      loginWithDiscord={loginWithDiscord}
      language={language}
      setLanguage={setLanguage}
      audioOutputDevices={audioOutputDevices}
      applyAudioOutputDevice={applyAudioOutputDevice}
      loadAudioOutputDevices={loadAudioOutputDevices}
      isRefreshingAudioDevices={isRefreshingAudioDevices}
      volume={volume}
      setVolume={setVolume}
      searchCacheRef={searchCacheRef}
      isGuest={isGuest}
      activePartyId={activePartyId}
      customEqPresets={customEqPresets}
      setCustomEqPresets={setCustomEqPresets}
      newEqPresetName={newEqPresetName}
      setNewEqPresetName={setNewEqPresetName}
      playHistoryCount={playHistory.length}
      playlistsCount={playlists.length}
      setShowClearHistoryConfirm={setShowClearHistoryConfirm}
      setShowClearPlaylistsConfirm={setShowClearPlaylistsConfirm}
      cachePath={cachePath}
      cacheSize={cacheSize}
      handleChangeCacheDir={handleChangeCacheDir}
      handleClearCache={handleClearCache}
      showToast={showToast}
      t={t}
    />
  );

  const renderDownloadsPage = () => (
    <DownloadsPage
      downloadedSongs={downloadedSongs}
      setDownloadedSongs={setDownloadedSongs}
      cacheSize={cacheSize}
      currentSong={currentSong}
      startPlayingFromList={startPlayingFromList}
      setDraggedGlobalSong={setDraggedGlobalSong}
      formatTime={formatTime}
      toggleLike={toggleLike}
      isLiked={isLiked}
      t={t}
    />
  );

  const renderArtistPage = () => (
    <ArtistPage
      activeArtist={activeArtist}
      artistSongs={artistSongs}
      artistFilter={artistFilter}
      setArtistFilter={setArtistFilter}
      isArtistLoading={isArtistLoading}
      isArtistPodcast={isArtistPodcast}
      activePodcastMeta={activePodcastMeta}
      currentSong={currentSong}
      isPlaying={isPlaying}
      fetchArtistSongs={fetchArtistSongs}
      startPlayingFromList={startPlayingFromList}
      playSingleSong={playSingleSong}
      handleContextMenu={handleContextMenu}
      setDraggedGlobalSong={setDraggedGlobalSong}
      formatTime={formatTime}
      toggleLike={toggleLike}
      isLiked={isLiked}
      t={t}
    />
  );

  const renderHomePage = () => (
    <HomePage
      searchResults={searchResults}
      getGreeting={getGreeting}
      language={language}
      homeMode={homeMode}
      setHomeMode={setHomeMode}
      wrappedData={wrappedData}
      setWrappedStoryIndex={setWrappedStoryIndex}
      setShowWrappedStory={setShowWrappedStory}
      selectedVibeMood={selectedVibeMood}
      setSelectedVibeMood={setSelectedVibeMood}
      madeForYouPlaylists={madeForYouPlaylists}
      isMixGeneratingId={isMixGeneratingId}
      generateOrGetMixTracks={generateOrGetMixTracks}
      playMadeForYouPlaylist={playMadeForYouPlaylist}
      regenerateMadeForYouMix={regenerateMadeForYouMix}
      openMadeForYouPlaylist={openMadeForYouPlaylist}
      playHistory={playHistory}
      setPlayHistory={setPlayHistory}
      likedSongs={likedSongs}
      recommendations={recommendations}
      hitsInternational={hitsInternational}
      hitsIndonesia={hitsIndonesia}
      hitsJapan={hitsJapan}
      hitsKorean={hitsKorean}
      hitsLatin={hitsLatin}
      hitsLocal={hitsLocal}
      localCountry={localCountry}
      topPodcasts={topPodcasts}
      podcastsUs={podcastsUs}
      podcastsId={podcastsId}
      podcastsJp={podcastsJp}
      podcastsKr={podcastsKr}
      podcastsLatin={podcastsLatin}
      podcastHeroIndex={podcastHeroIndex}
      currentSong={currentSong}
      isPlaying={isPlaying}
      isShuffled={isShuffled}
      togglePlay={togglePlay}
      toggleShuffle={toggleShuffle}
      playSingleSong={playSingleSong}
      startPlayingFromList={startPlayingFromList}
      toggleLike={toggleLike}
      isLiked={isLiked}
      handleContextMenu={handleContextMenu}
      setDraggedGlobalSong={setDraggedGlobalSong}
      openArtistPage={openArtistPage}
      setAddToPlaylistSong={setAddToPlaylistSong}
      setSearchQuery={setSearchQuery}
      setSuggestions={setSuggestions}
      isRecentExpanded={isRecentExpanded}
      setIsRecentExpanded={setIsRecentExpanded}
      isLocalExpanded={isLocalExpanded}
      setIsLocalExpanded={setIsLocalExpanded}
      isIntExpanded={isIntExpanded}
      setIsIntExpanded={setIsIntExpanded}
      isIdExpanded={isIdExpanded}
      setIsIdExpanded={setIsIdExpanded}
      isJpExpanded={isJpExpanded}
      setIsJpExpanded={setIsJpExpanded}
      isKrExpanded={isKrExpanded}
      setIsKrExpanded={setIsKrExpanded}
      isLatinExpanded={isLatinExpanded}
      setIsLatinExpanded={setIsLatinExpanded}
      intScrollRef={intScrollRef}
      idScrollRef={idScrollRef}
      jpScrollRef={jpScrollRef}
      krScrollRef={krScrollRef}
      latinScrollRef={latinScrollRef}
      localScrollRef={localScrollRef}
      recentScrollRef={recentScrollRef}
      scrollSlider={scrollSlider}
      formatTime={formatTime}
      showToast={showToast}
      t={t}
    />
  );




  // ─── LOGIN SCREEN ────────────────────────────────────────────
  // ─── LOGIN SCREEN (MODERN OBSIDIAN & AURORA) ──────────────────
  if (!discordUser) {
    const continueAsGuest = () => {
      const guestUser: DiscordUser = {
        id: 'guest_' + Math.random().toString(36).substring(2, 9),
        username: 'Tamu (Guest)',
        discriminator: '0000',
        avatar: null,
        global_name: 'Guest Listener'
      };
      setDiscordUser(guestUser);
      showToast('Masuk sebagai Tamu. Offline Vault & audio lokal siap digunakan!', 'music');
    };

    return (
      <div className="login-screen-v2">
        {/* Dynamic Aurora Ambient Lighting */}
        <div className="login-ambient-canvas">
          <div className="aurora-orb aurora-orb-1" />
          <div className="aurora-orb aurora-orb-2" />
          <div className="aurora-orb aurora-orb-3" />
          <div className="aurora-vinyl-grid" />
          <div className="aurora-vignette" />
        </div>

        {/* Global Toast inside Login */}
        {toastData && (
          <div className={`toast-popup ${toastData.type === 'error' ? 'toast-error' : 'toast-success'}`} style={{ zIndex: 1000 }}>
            {toastData.icon}
            {toastData.msg}
          </div>
        )}

        {/* Top Floating Navigation */}
        <header className="login-topbar">
          <div className="login-brand">
            <img src="https://donpollobot.vercel.app/donpollo-icon.jpg" alt="Don Pollo" className="login-brand-logo" />
            <span className="login-brand-title">Don Pollo Music</span>
            <span className="login-version-pill">v1.3.4</span>
          </div>

          <div className="login-topbar-right">
            {/* Minimalist Segmented Language Switcher */}
            <div className="login-lang-switch">
              {(['id', 'en', 'ja', 'ko'] as Language[]).map(lang => (
                <button
                  key={lang}
                  className={`lang-btn ${language === lang ? 'active' : ''}`}
                  onClick={() => setLanguage(lang)}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Main Content Showcase */}
        <main className="login-main-stage">
          <div className="login-stage-grid">

            {/* Left Column: Visual Music Stage & Interactive Deck */}
            <div className="login-stage-left">
              <h1 className="stage-hero-heading">
                Musik Tanpa Batas.<br />
                <span className="stage-hero-sub">Kualitas Audio Terbaik.</span>
              </h1>

              <p className="stage-hero-lead">
                {t('loginHeroSubtitle') || 'Rasakan pengalaman mendengarkan musik tanpa batas dengan antarmuka yang elegan, fitur sinkronisasi lirik real-time, dan kualitas audio terbaik.'}
              </p>

              {/* Realistic Turntable & Playing Deck Card */}
              <div className="interactive-deck-showcase">
                <div className="vinyl-assembly">
                  {/* Spinning Vinyl Record */}
                  <div className="vinyl-disc">
                    <div className="vinyl-center-label">
                      <img
                        src="https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg"
                        alt="Starboy Vinyl Label"
                        className="vinyl-label-art"
                      />
                      <div className="vinyl-spindle" />
                    </div>
                  </div>

                  {/* Album Cover Card with Real Audio Visualizer */}
                  <div className="deck-track-card">
                    <div className="deck-cover-wrap">
                      <img
                        src="https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/b5/92/bb/b592bb72-52e3-e756-9b26-9f56d08f47ab/16UMGIM67864.rgb.jpg/600x600bb.jpg"
                        alt="Album Art"
                        className="deck-cover-img"
                      />
                      <div className="deck-play-badge">
                        <Play size={12} fill="white" />
                      </div>
                    </div>

                    <div className="deck-track-details">
                      <div className="deck-track-header">
                        <div>
                          <div className="deck-track-name">Starboy</div>
                          <div className="deck-artist-name">The Weeknd • Daft Punk</div>
                        </div>
                      </div>

                      {/* Equalizer Visualizer Bars */}
                      <div className="deck-equalizer">
                        {[40, 75, 55, 90, 60, 85, 45, 100, 70, 50, 95, 65, 80, 55, 90, 40].map((h, i) => (
                          <div
                            key={i}
                            className="eq-bar"
                            style={{
                              animationDuration: `${0.6 + (i % 5) * 0.15}s`,
                              animationDelay: `${(i % 4) * 0.1}s`,
                              maxHeight: `${h}%`
                            }}
                          />
                        ))}
                      </div>

                      <div className="deck-track-footer">
                        <span className="deck-karaoke-preview">
                          <Mic2 size={12} /> "I'm tryna put you in the worst mood..."
                        </span>
                        <span className="deck-time">3:50</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Authentication Card */}
            <div className="login-stage-right">
              <div className="auth-gateway-card">
                <div className="auth-card-header">
                  <div className="auth-logo-badge">
                    <img
                      src="https://donpollobot.vercel.app/donpollo-icon.jpg"
                      alt="Don Pollo Logo"
                      className="auth-logo-img"
                    />
                  </div>
                  <h2 className="auth-title">{t('loginWelcome')}</h2>
                  <p className="auth-subtitle">{t('loginWelcomeDesc')}</p>
                </div>

                <div className="auth-card-body">
                  {/* Primary Discord Button */}
                  <button className="auth-btn-discord" onClick={loginWithDiscord}>
                    <div className="auth-btn-shine" />
                    <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="white" style={{ flexShrink: 0 }}>
                      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                    </svg>
                    <span>{t('loginBtn')}</span>
                  </button>

                  {/* Divider */}
                  <div className="auth-divider">
                    <span className="auth-divider-line" />
                    <span className="auth-divider-text">atau</span>
                    <span className="auth-divider-line" />
                  </div>

                  {/* Secondary Guest Button */}
                  <button className="auth-btn-guest" onClick={continueAsGuest}>
                    <Headphones size={17} />
                    <span>Lanjutkan sebagai Tamu (Mode Offline)</span>
                  </button>
                </div>

                {/* Footer security note */}
                <div className="auth-card-footer">
                  <div className="auth-security-badge">
                    <Lock size={12} />
                    <span>Autentikasi resmi aman melalui Discord OAuth2</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    );
  }

  const glassBgUrl = currentSong ? (currentSong.cover || currentSong.thumbnail) : 'https://donpollobot.vercel.app/donpollo-icon.jpg';

  return (
    <div className={`app-layout theme-${settings.theme || 'default'}`} style={{ '--glass-bg': `url(${glassBgUrl})` } as any}>
      {/* Toast Container */}
      <div style={{ position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 9999 }}>
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

      {/* Modal: Keyboard Shortcuts Cheat Sheet */}
      <ShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />


      {/* Modal: Hapus Cache */}
      {showClearCacheConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearCacheConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('clearAudioCache')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{t('confirmClearCache')}</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowClearCacheConfirm(false)}>{t('cancel')}</button>
              <button className="btn-primary" style={{ backgroundColor: '#ff5555', color: 'white' }} onClick={confirmClearCacheAction}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Logout Confirm */}
      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('logout')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{t('confirmLogout')}</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLogoutConfirm(false)}>{t('cancel')}</button>
              <button className="btn-primary" style={{ backgroundColor: '#ff5555', color: 'white' }} onClick={confirmLogoutAction}>{t('logout')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Kick User Confirm */}
      {userToKick && (
        <div className="modal-overlay" onClick={() => setUserToKick(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('kickUser')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {t('confirmKick')} {userToKick.name}?
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setUserToKick(null)}>{t('cancel')}</button>
              <button className="btn-primary" style={{ backgroundColor: '#ff5555', color: 'white' }} onClick={confirmKickAction}>{t('btnKick') || 'Yes, Kick'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clear Queue Confirm */}
      {showClearQueueConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearQueueConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('confirmClearQueueTitle')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{t('confirmClearQueueDesc')}</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowClearQueueConfirm(false)}>{t('cancel')}</button>
              <button className="btn-primary" style={{ backgroundColor: '#ff5555', color: 'white' }} onClick={confirmClearQueueAction}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clear History Confirm */}
      {showClearHistoryConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearHistoryConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('clearHistory')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{t('confirmClearHistory')}</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowClearHistoryConfirm(false)}>{t('cancel')}</button>
              <button className="btn-primary" style={{ backgroundColor: '#ff5555', color: 'white' }} onClick={() => {
                setPlayHistory([]);
                showToast(t('toastHistoryCleared') || 'History cleared!');
                setShowClearHistoryConfirm(false);
              }}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Clear Playlists Confirm */}
      {showClearPlaylistsConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearPlaylistsConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('deleteAllPlaylists')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{t('confirmDeletePlaylists')}</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowClearPlaylistsConfirm(false)}>{t('cancel')}</button>
              <button className="btn-primary" style={{ backgroundColor: '#ff5555', color: 'white' }} onClick={() => {
                setPlaylists([]);
                showToast(t('toastHistoryCleared') || 'Playlists deleted!');
                setShowClearPlaylistsConfirm(false);
              }}>{t('delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Global Fake Loading Overlay */}
      {isGlobalLoading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="loading-state" style={{ background: 'var(--bg-card)', padding: '24px 32px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <Loader2 className="spin" size={40} color="var(--accent-primary)" />
            <div style={{ marginTop: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{t('loadingPleaseWait')}</div>
          </div>
        </div>
      )}

      {/* Modal: Remove Playlist Confirm */}
      {playlistToRemove && (
        <div className="modal-overlay" onClick={() => setPlaylistToRemove(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('removeFromLibrary')}</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{t('confirmRemovePlaylist')}</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setPlaylistToRemove(null)}>{t('cancel')}</button>
              <button className="btn-primary" style={{ backgroundColor: '#ff5555', color: 'white' }} onClick={() => {
                if ((window as any).electronAPI && discordUser) {
                  (window as any).electronAPI.toggleSavePlaylist(discordUser.id, playlistToRemove).then((newSaved: string[]) => {
                    if (newSaved) {
                      setSavedPlaylists(newSaved);
                      showToast(t('toastPlaylistRemoved'), 'success');
                      if (activePlaylistId === playlistToRemove) setActivePage('home');
                    }
                    setPlaylistToRemove(null);
                  });
                }
              }}>{t('removeFromLibrary')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Set Custom Status */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', borderRadius: '16px', boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <MessageSquare size={22} color="var(--accent-primary)" />
              <h3 className="modal-title" style={{ margin: 0 }}>{t('customStatusTitle')}</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '18px', lineHeight: '1.4' }}>
              {t('customStatusDesc')}
            </p>

            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                className="modal-input"
                type="text"
                maxLength={60}
                placeholder={t('customStatusPlaceholder')}
                value={customStatusInput}
                onChange={e => setCustomStatusInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveCustomStatus(customStatusInput, customStatusDuration);
                }}
                autoFocus
                style={{
                  paddingRight: '50px',
                  margin: 0,
                  height: '42px',
                  fontSize: '14px',
                  boxShadow: 'none',
                  outline: 'none'
                }}
              />
              <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text-muted)' }}>
                {customStatusInput.length}/60
              </span>
            </div>

            {/* Template Durasi Status */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="var(--text-secondary)" /> {t('customStatusDuration')}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { label: t('customStatus1h'), hours: 1 },
                  { label: t('customStatus5h'), hours: 5 },
                  { label: t('customStatus12h'), hours: 12 },
                  { label: t('customStatus24h'), hours: 24 }
                ].map(opt => {
                  const isSelected = customStatusDuration === opt.hours;
                  return (
                    <button
                      key={opt.hours}
                      type="button"
                      onClick={() => setCustomStatusDuration(opt.hours)}
                      style={{
                        height: '34px',
                        padding: '0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                        background: isSelected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: 'none',
                        outline: 'none',
                        transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        if (customStatusDuration !== opt.hours) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.16)';
                          e.currentTarget.style.color = '#ffffff';
                        }
                      }}
                      onMouseLeave={e => {
                        if (customStatusDuration !== opt.hours) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Uniform Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              {myCustomStatus ? (
                <button
                  type="button"
                  style={{
                    height: '38px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#f23f43',
                    background: 'rgba(237, 66, 69, 0.08)',
                    border: '1px solid rgba(237, 66, 69, 0.25)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'none',
                    outline: 'none',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(237, 66, 69, 0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(237, 66, 69, 0.08)'}
                  onClick={() => handleSaveCustomStatus('', customStatusDuration)}
                >
                  {t('customStatusClear')}
                </button>
              ) : <div />}
              <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                <button
                  type="button"
                  style={{
                    height: '38px',
                    padding: '0 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'none',
                    outline: 'none',
                    transition: 'background-color 0.15s ease, color 0.15s ease'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; e.currentTarget.style.color = '#ffffff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  onClick={() => setShowStatusModal(false)}
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  style={{
                    height: '38px',
                    padding: '0 22px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#ffffff',
                    background: 'var(--accent-primary)',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'none',
                    filter: 'none',
                    outline: 'none',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-primary)'}
                  onClick={() => handleSaveCustomStatus(customStatusInput, customStatusDuration)}
                >
                  {t('save')}
                </button>
              </div>
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
                  <img src={getDiscordAvatar(discordUser)!} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => handleAvatarError(e, discordUser.id, discordUser.username)} />
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
                { label: t('listeningTime'), value: totalListenSeconds >= 3600 ? `${Math.floor(totalListenSeconds / 3600)}${t('listeningTimeHours')} ${Math.floor((totalListenSeconds % 3600) / 60)}${t('listeningTimeMins')}` : `${Math.floor(totalListenSeconds / 60)}${t('listeningTimeMins')}`, icon: <Clock size={16} /> },
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

      {/* Modal: Share Code */}
      {shareCodeResult && (
        <div className="modal-overlay" onClick={() => setShareCodeResult(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--accent-primary)'
            }}>
              <Share2 size={26} />
            </div>
            <h3 className="modal-title">{t('sharePlaylistTitle')}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              {t('sharePlaylistDesc')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', justifyContent: 'center' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '4px', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{shareCodeResult.code}</span>
              <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--accent-primary)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                title={t('copyCode')}
                onClick={() => {
                  navigator.clipboard.writeText(shareCodeResult.code);
                  showToast(t('codeCopied'), 'success');
                }}>
                <Copy size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '20px' }}>
              {t('sharePlaylistHint')}
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setShareCodeResult(null)}>{t('close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Impor Playlist YouTube */}
      {showImportPlaylist && (
        <div className="modal-overlay" onClick={() => !isImporting && setShowImportPlaylist(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{t('importPlaylist')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px' }}>
              {t('importPlaylistHint')}
            </p>
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
              style={{ marginBottom: '10px' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <input
                id="modal-playlist-cover-upload"
                type="file"
                style={{ display: 'none' }}
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const p = (e.target.files[0] as any).path;
                    if (p) setNewPlaylistAvatar(`file:///${p.replace(/\\/g, '/')}`);
                    else setNewPlaylistAvatar(URL.createObjectURL(e.target.files[0]));
                  }
                }}
              />
              <label
                htmlFor="modal-playlist-cover-upload"
                className="btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '6px 14px',
                  fontSize: '12px',
                  borderRadius: '6px'
                }}
              >
                <Upload size={14} />
                <span>{newPlaylistAvatar ? t('changeFile') : t('chooseFile')}</span>
              </label>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {newPlaylistAvatar ? t('fileChosen') : t('noFileChosen')}
              </span>
            </div>

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
                <p style={{ color: 'var(--text-muted)' }}>{t('noPlaylists')}</p>
                <button className="btn-primary" style={{ marginTop: '12px' }} onClick={() => { setAddToPlaylistSong(null); setShowCreatePlaylist(true); }}>
                  <Plus size={16} /> {t('createPlaylist')}
                </button>
              </div>
            ) : (
              <div className="modal-playlist-list">
                {playlists.filter(pl => pl.discordId === discordUser?.id || pl.collaborators?.includes(discordUser?.id || '')).map(pl => (
                  <div key={pl.id} className="modal-playlist-item" onClick={() => addSongToPlaylist(pl.id, addToPlaylistSong)}>
                    <div className="modal-playlist-art">
                      {isMixPlaylist(pl) ? (
                        <img src={getMixPlaylistCover(pl, { songs: pl.songs, playHistory, likedSongs })} alt="" />
                      ) : pl.avatar ? (
                        <img src={pl.avatar} alt="" />
                      ) : pl.songs[0] ? (
                        <img src={(getCleanThumbnail(pl.songs[0].thumbnail) || getHighResImage(pl.songs[0].cover))} alt="" />
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


      {/* Modal: Collaborators Management */}
      {showCollabModal && collabPlaylistId && (() => {
        const pl = playlists.find(p => p.id === collabPlaylistId);
        if (!pl) return null;
        const isMyPlaylist = !pl.discordId || pl.discordId === discordUser?.id;
        const currentCollabs = pl.collaborators || [];
        
        return (
          <div className="modal-overlay" onClick={() => setShowCollabModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--accent-primary)' }}>
                <Users size={24} />
                <h3 className="modal-title" style={{ margin: 0 }}>{t('collabModalTitle')}</h3>
              </div>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
                {t('collabModalDesc', { '0': pl.name })}
              </p>

              {/* Current Collaborators */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold' }}>{t('currentCollabsLabel', { '0': String(currentCollabs.length) })}</label>
                {currentCollabs.length === 0 ? (
                  <div style={{ padding: '12px', background: 'var(--bg-card-hover)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    {t('noCollabsYet')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {currentCollabs.map(cid => {
                      const friend = onlineUsers.find(u => u.discordId === cid);
                      // Fallback to cached info for offline users
                      const cachedInfo = collabUserCacheRef.current[cid];
                      const displayName = friend?.username || cachedInfo?.username || null;
                      const displayAvatar = friend?.avatarUrl || cachedInfo?.avatarUrl || null;
                      const isOnline = !!friend;
                      return (
                        <div key={cid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-card-hover)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {displayAvatar ? (
                              <div style={{ position: 'relative' }}>
                                <img src={displayAvatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} onError={(e) => handleAvatarError(e, cid, displayName || '')} />
                                {!isOnline && (
                                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#6b7280', border: '1.5px solid var(--bg-card-hover)' }} title="Offline" />
                                )}
                              </div>
                            ) : (
                              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', position: 'relative' }}>
                                {displayName?.charAt(0).toUpperCase() || 'U'}
                                {!isOnline && (
                                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: '#6b7280', border: '1.5px solid var(--bg-card-hover)' }} title="Offline" />
                                )}
                              </div>
                            )}
                            <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{displayName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>{cid.slice(0, 8)}...</span>}</div>
                          </div>
                          {isMyPlaylist && (
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '11px', color: '#ff5555' }} onClick={async () => {
                              const updated = { ...pl, collaborators: currentCollabs.filter(id => id !== cid) };
                              if ((window as any).electronAPI) {
                                await (window as any).electronAPI.savePlaylist(updated);
                                setPlaylists(prev => prev.map(p => p.id === pl.id ? updated : p));
                              }
                              showToast(t('collaboratorRemoved'), 'success');
                            }}>
                              {t('removeCollab')}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Collaborator */}
              {isMyPlaylist && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold' }}>{t('inviteFriendsLabel')}</label>

                  {/* Online Friends List */}
                  {onlineUsers.filter(u => u.discordId !== discordUser?.id && !currentCollabs.includes(u.discordId)).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                      {onlineUsers.filter(u => u.discordId !== discordUser?.id && !currentCollabs.includes(u.discordId)).map(friend => (
                        <div key={friend.discordId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <img src={friend.avatarUrl || getDefaultDiscordAvatar(friend.discordId, friend.username)} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} onError={(e) => handleAvatarError(e, friend.discordId, friend.username)} />
                            <span style={{ fontSize: '12px' }}>{friend.username}</span>
                          </div>
                          <button className="btn-secondary" style={{ padding: '3px 6px', fontSize: '10px' }} onClick={async () => {
                            if ((window as any).electronAPI?.sendCollabInvite) {
                              await (window as any).electronAPI.sendCollabInvite(
                                pl.id,
                                pl.name,
                                discordUser.id,
                                discordUser.global_name || discordUser.username,
                                friend.discordId
                              );
                              showToast(t('inviteSent'), 'success');
                            }
                          }}>
                            {t('sendInvite')}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '12px', background: 'var(--bg-card-hover)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      {t('noCollabsYet')}
                    </div>
                  )}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '24px' }}>
                <button className="btn-secondary" onClick={() => setShowCollabModal(false)}>{t('close')}</button>
              </div>
            </div>
          </div>
        );
      })()}


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
              <div className={`nav-item ${activePage === 'sound-map' ? 'active' : ''}`} onClick={() => navigate('sound-map')}>
                <MapIcon size={24} /> <span className="nav-label">{t('soundMap')}</span>
              </div>
              <div className={`nav-item ${activePage === 'settings' ? 'active' : ''}`} onClick={() => navigate('settings')}>
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
              <button className={`sidebar-list-item ${activePage === 'library' ? 'active' : ''}`} onClick={() => navigate('library')}>
                <div className="sidebar-item-img" style={{ background: 'linear-gradient(135deg, var(--accent-primary), #2a2a2a)' }}>
                  <Heart size={20} color="white" fill="white" />
                </div>
                <div className="sidebar-item-info">
                  <div className="sidebar-item-title">{t('liked')}</div>
                  <div className="sidebar-item-subtitle">{t('playlist')} • {likedSongs.length} {t('songs')}</div>
                </div>
              </button>

              <button className={`sidebar-list-item ${activePage === 'downloads' ? 'active' : ''}`} onClick={() => navigate('downloads')}>
                <div className="sidebar-item-img" style={{ background: 'linear-gradient(135deg, #00c6ff, #0072ff)' }}>
                  <FolderPlus size={20} color="white" />
                </div>
                <div className="sidebar-item-info">
                  <div className="sidebar-item-title">{t('offlineVault')}</div>
                  <div className="sidebar-item-subtitle">{downloadedSongs.length} {t('songsAvailable')}</div>
                </div>
              </button>


              {/* Playlists */}
              {playlists.filter(pl => pl.discordId === discordUser?.id || savedPlaylists.includes(pl.id) || pl.collaborators?.includes(discordUser?.id || '')).map(pl => (
                <button key={pl.id} className={`sidebar-list-item ${(activePage === 'playlist-detail' && activePlaylistId === pl.id) ? 'active' : ''}`} 
                  onClick={() => {
                    setActivePlaylistId(pl.id);
                    navigate('playlist-detail', { playlistId: pl.id });
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu(null);
                    setPlaylistContextMenu({ x: e.clientX, y: e.clientY, playlist: pl });
                  }}
                  onDragOver={(e) => {
                    if (draggedGlobalSong && pl.discordId === discordUser?.id) {
                      e.preventDefault();
                      setDragOverPlaylistId(pl.id);
                    }
                  }}
                  onDragLeave={() => setDragOverPlaylistId(null)}
                  onDrop={async () => {
                    if (draggedGlobalSong && pl.discordId === discordUser?.id) {
                      if (!pl.songs.some(s => s.id === draggedGlobalSong.id)) {
                        const updated = { ...pl, songs: [...pl.songs, draggedGlobalSong] };
                        if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(updated);
                        setPlaylists(prev => prev.map(p => p.id === pl.id ? updated : p));
                        showToast(t('toastAddedToPlaylist', { playlist: pl.name }), 'playlist');
                      } else {
                        showToast(t('toastAlreadyInPlaylist'), 'error');
                      }
                    }
                    setDragOverPlaylistId(null);
                    setDraggedGlobalSong(null);
                  }}
                  style={{
                    border: dragOverPlaylistId === pl.id ? '2px dashed var(--accent-primary)' : '2px solid transparent',
                    background: dragOverPlaylistId === pl.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                    boxSizing: 'border-box'
                  }}
                >
                  <div className="sidebar-item-img">
                    {isMixPlaylist(pl) ? (
                      <img
                        src={getMixPlaylistCover(pl, { songs: pl.songs, playHistory, likedSongs })}
                        alt="cover"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : pl.avatar ? (
                      <img
                        src={pl.avatar}
                        alt="cover"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }}
                        onError={(e) => {
                          if (pl.songs.length > 0) {
                            e.currentTarget.src = (getCleanThumbnail(pl.songs[0].thumbnail) || getHighResImage(pl.songs[0].cover));
                          } else {
                            e.currentTarget.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      pl.songs.length > 0 ? (
                        <img src={(getCleanThumbnail(pl.songs[0].thumbnail) || getHighResImage(pl.songs[0].cover))} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                      ) : (
                        <Music size={24} color="var(--text-secondary)" />
                      )
                    )}
                  </div>
                  <div className="sidebar-item-info">
                    <div className="sidebar-item-title">{pl.name}</div>
                    <div className="sidebar-item-subtitle">{t('playlist')} • {pl.discordId === discordUser?.id ? (discordUser?.global_name || discordUser?.username || t('myProfile')) : (pl as any).authorName || 'Saved'}</div>
                  </div>
                  {pl.discordId !== discordUser?.id && (
                    <div className="sidebar-item-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                      <button style={{ background: 'transparent', border: 'none', padding: '0 4px', cursor: 'pointer', color: 'var(--text-secondary)' }} onMouseOver={e => e.currentTarget.style.color = '#ff5555'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'} title={t('removeFromLibrary')} onClick={(e) => {
                        e.stopPropagation();
                        setPlaylistToRemove(pl.id);
                      }}>
                        <X size={14} />
                      </button>
                    </div>
                  )}
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

                {collabInvites.length > 0 && (
                  <div className="join-requests-container" style={{ marginBottom: '12px', padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginBottom: '8px' }}>Collab Invites</div>
                    {collabInvites.map((invite: any) => (
                      <div key={invite.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                          <strong>{invite.hostName}</strong> invited you to collaborate on <strong>{invite.playlistName}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={async () => {
                            await (window as any).electronAPI.respondCollabInvite(invite.id, 'accepted');
                            setCollabInvites(prev => prev.filter(i => i.id !== invite.id));
                            fetchPlaylists();
                            showToast(`Joined ${invite.playlistName}!`, 'success');
                          }} style={{ flex: 1, padding: '4px 0', backgroundColor: '#23a559', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>{t('accept') || 'Accept'}</button>

                          <button onClick={async () => {
                            await (window as any).electronAPI.respondCollabInvite(invite.id, 'rejected');
                            setCollabInvites(prev => prev.filter(i => i.id !== invite.id));
                          }} style={{ flex: 1, padding: '4px 0', backgroundColor: '#f23f43', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>{t('reject') || 'Reject'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

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
                            if (discordUser) setActivePartyId(discordUser.id);
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
                          <div className="friend-item current-party-block" onClick={() => setPopupPartyId(popupPartyId === effectivePartyId ? null : effectivePartyId)} style={{ flexDirection: 'column', alignItems: 'stretch', padding: '10px', background: 'rgba(var(--accent-primary-rgb), 0.1)', borderRadius: '8px', border: '1px solid rgba(var(--accent-primary-rgb), 0.3)', position: 'relative', marginBottom: '16px', cursor: 'pointer' }}>
                            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
                              <div className="party-avatars" style={{ display: 'flex', marginRight: '12px' }}>
                                {partyAvatars.map((av, idx) => (
                                  <img
                                    key={av.id}
                                    src={av.url}
                                    alt={av.name}
                                    title={av.name}
                                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--background-secondary)', marginLeft: idx === 0 ? '0' : '-12px', zIndex: partyAvatars.length - idx, objectFit: 'cover' }}
                                  />
                                ))}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '4px', letterSpacing: '0.5px' }}>{t('partyMembers')} ({partyAvatars.length})</span>
                                {currentPartyMembers.length > 0 && currentPartyMembers[0].currentSong && currentPartyMembers[0].currentSong.isPlaying ? (
                                  <div className="friend-song" style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', display: 'flex', alignItems: 'center' }} title={currentPartyMembers[0].currentSong.title}>
                                    <Music size={12} style={{ marginRight: '6px', flexShrink: 0 }} /> {currentPartyMembers[0].currentSong.title}
                                  </div>
                                ) : currentSong && isPlaying ? (
                                  <div className="friend-song" style={{ fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', display: 'flex', alignItems: 'center' }} title={currentSong.title}>
                                    <Music size={12} style={{ marginRight: '6px', flexShrink: 0 }} /> {currentSong.title}
                                  </div>
                                ) : (
                                  <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('browsing') || 'Browsing...'}</div>
                                )}
                              </div>
                              {(isGuest || (discordUser && effectivePartyId === discordUser.id)) && (
                                <button
                                  className="leave-party-icon-btn"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (isGuest) {
                                      setIsGuest(false);
                                      setActivePartyId(null);
                                      if (audioRef.current) audioRef.current.pause();
                                      setIsPlaying(false);
                                    } else if (discordUser) {
                                      setActivePartyId(null);
                                      await (window as any).electronAPI?.deleteParty(discordUser.id);
                                    }
                                  }}
                                  title={t('leaveParty')}
                                  style={{ marginLeft: '8px' }}
                                >
                                  <LogOut size={16} />
                                </button>
                              )}
                            </div>

                            <div className={`party-popup-bubble-wrapper ${popupPartyId === effectivePartyId ? 'open' : ''}`}>
                              <div className="party-popup-bubble-inner" onClick={(e) => e.stopPropagation()}>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', padding: '0 4px', marginTop: '12px' }}>{t('partyMembers') || 'Party Members'}</div>
                                {partyAvatars.map(u => (
                                  <div key={u.id} className="party-popup-member hover-bg" style={{ display: 'flex', alignItems: 'center', padding: '6px 4px', borderRadius: '4px', position: 'relative', cursor: 'pointer' }} onClick={() => navigate('profile', { profileId: u.id })}>
                                    <img src={u.url || getDefaultDiscordAvatar(u.id, u.name)} alt={u.name} style={{ width: '24px', height: '24px', borderRadius: '50%', marginRight: '8px', objectFit: 'cover' }} onError={(e) => handleAvatarError(e, u.id, u.name)} />
                                    <div style={{ flex: 1, fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {u.name}
                                      {effectivePartyId === u.id && <span style={{ fontSize: '10px', color: 'var(--accent-primary)', marginLeft: '6px' }}>({t('partyHost')})</span>}
                                    </div>
                                    {effectivePartyId === discordUser.id && u.id !== discordUser.id && (
                                      <button className="kick-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }} title={t('kickUser') || 'Kick User'} onClick={(e) => {
                                        e.stopPropagation();
                                        setUserToKick({ id: u.id, name: u.name });
                                      }}>
                                        <LogOut size={14} style={{ opacity: 0.7 }} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {(() => {
                          const otherParties = new Map<string, any[]>();
                          const standaloneFriends: any[] = [];

                          otherFriends.forEach(user => {
                            const pId = user.partyId || user.discordId;
                            const isParty = user.partyId || otherFriends.some(other => other.partyId === user.discordId);

                            if (isParty) {
                              if (!otherParties.has(pId)) {
                                otherParties.set(pId, []);
                              }
                              otherParties.get(pId)!.push(user);
                            } else {
                              standaloneFriends.push(user);
                            }
                          });

                          return (
                            <>
                              {Array.from(otherParties.entries()).map(([pId, members]) => {
                                const host = members.find(m => m.discordId === pId) || members[0];
                                const partyAvatars = members.map(m => ({
                                  id: m.discordId,
                                  url: m.avatarUrl || `https://ui-avatars.com/api/?name=${m.username}`,
                                  name: m.username
                                }));

                                return (
                                  <div key={`party-${pId}`} className="friend-item current-party-block" onClick={() => setPopupPartyId(popupPartyId === pId ? null : pId)} style={{ flexDirection: 'column', alignItems: 'stretch', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', position: 'relative', marginBottom: '8px', width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%' }}>
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
                                            onError={(e) => handleAvatarError(e, av.id, av.name)}
                                          />
                                        ))}
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '2px', letterSpacing: '0.5px' }}>
                                          {members.length} {t('partyMembers') || 'Party Members'}
                                        </span>
                                        {host.currentSong && host.currentSong.isPlaying ? (
                                          <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', display: 'flex', alignItems: 'center' }} title={host.currentSong.title}>
                                            <Music size={10} style={{ marginRight: '4px', flexShrink: 0, opacity: 0.7 }} /> {host.currentSong.title}
                                          </div>
                                        ) : (
                                          <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('browsing') || 'Browsing...'}</div>
                                        )}

                                        {host.currentSong && host.currentSong.isPlaying && (
                                          <div style={{ marginTop: '6px' }}>
                                            {host.status !== 'dnd' ? (
                                              <button className="listen-along-btn" style={{ padding: '4px 8px', fontSize: '10px', width: 'fit-content' }} onClick={async (e) => {
                                                e.stopPropagation();
                                                if (host.status === 'idle') {
                                                  const success = await (window as any).electronAPI.sendJoinRequest(pId, discordUser.id, discordUser.global_name || discordUser.username);
                                                  if (success) {
                                                    showToast(t('joinRequestSent') || 'Request sent', 'success');
                                                  }
                                                } else {
                                                  setActivePartyId(pId);
                                                  setIsGuest(true);
                                                  showToast(`${t('nowListeningWith') || 'Listening with'} ${host.username}...`, 'success');
                                                }
                                              }}><Headphones size={12} style={{ marginRight: '4px' }} /> {host.status === 'idle' ? t('askToJoin') : t('listenAlong')}</button>
                                            ) : (
                                              <button className="listen-along-btn" disabled style={{ padding: '4px 8px', fontSize: '10px', opacity: 0.5, cursor: 'not-allowed', width: 'fit-content' }}>
                                                <Headphones size={12} style={{ marginRight: '4px' }} /> {t('joinDisabled')}
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className={`party-popup-bubble-wrapper ${popupPartyId === pId ? 'open' : ''}`}>
                                      <div className="party-popup-bubble-inner" onClick={(e) => e.stopPropagation()}>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', padding: '0 4px', marginTop: '12px' }}>{t('partyMembers') || 'Party Members'}</div>
                                        {partyAvatars.map(u => (
                                          <div key={u.id} className="party-popup-member hover-bg" style={{ display: 'flex', alignItems: 'center', padding: '6px 4px', borderRadius: '4px', position: 'relative', cursor: 'pointer' }} onClick={() => navigate('profile', { profileId: u.id })}>
                                            <img src={u.url} alt={u.name} style={{ width: '24px', height: '24px', borderRadius: '50%', marginRight: '8px', objectFit: 'cover' }} />
                                            <div style={{ flex: 1, fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {u.name}
                                              {pId === u.id && <span style={{ fontSize: '10px', color: 'var(--accent-primary)', marginLeft: '6px' }}>({t('partyHost') || 'Host'})</span>}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {standaloneFriends.length === 0 && otherParties.size === 0 && !effectivePartyId ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', marginTop: '12px' }}>{t('noFriendsOnline')}</div>
                              ) : (
                                standaloneFriends.map(user => (
                                  <div key={user.discordId} className="friend-item" onClick={() => { navigate('profile', { profileId: user.discordId }); }} style={{ cursor: 'pointer' }}>
                                    <div className="friend-avatar-container" style={{ position: 'relative' }}>
                                      <img src={user.avatarUrl || getDefaultDiscordAvatar(user.discordId, user.username)} alt={user.username} className="friend-avatar" onError={(e) => handleAvatarError(e, user.discordId, user.username)} />
                                      <div className={`status-dot-avatar status-dot ${user.status || 'online'}`}></div>
                                      {user.customStatus && (
                                        <>
                                          <div className="friend-thought-badge" title={user.customStatus}>
                                            <MessageSquare size={10} color="var(--accent-primary)" />
                                          </div>
                                          <div className="friend-cloud-popover">
                                            {user.customStatus}
                                          </div>
                                        </>
                                      )}
                                    </div>
                                    <div className="friend-info">
                                      <div className="friend-name" style={{ display: 'flex', alignItems: 'center' }}>
                                        {user.username}
                                        {user.platform === 'mobile' && (
                                          <span title={t('playingOnMobile') || 'Playing on Mobile'} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 4px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                                            <Smartphone size={12} color="var(--text-muted)" />
                                          </span>
                                        )}
                                      </div>
                                      {user.currentSong && user.currentSong.isPlaying ? (
                                        <>
                                          <div className="friend-song" title={user.currentSong.title} style={{ display: 'flex', alignItems: 'center' }}><Music size={10} style={{ marginRight: '4px', flexShrink: 0, opacity: 0.7 }} /> {user.currentSong.title}</div>
                                          {user.status !== 'dnd' && (
                                            <button className="listen-along-btn" onClick={async (e) => {
                                              e.stopPropagation();
                                              if (user.status === 'idle') {
                                                const success = await (window as any).electronAPI.sendJoinRequest(user.partyId || user.discordId, discordUser.id, discordUser.global_name || discordUser.username);
                                                if (success) {
                                                  showToast(t('joinRequestSent'), 'success');
                                                }
                                              } else {
                                                setActivePartyId(user.partyId || user.discordId);
                                                setIsGuest(true);
                                                showToast(`${t('nowListeningWith')} ${user.username}...`, 'success');
                                              }
                                            }}><Headphones size={12} style={{ marginRight: '4px' }} /> {user.status === 'idle' ? t('askToJoin') : t('listenAlong')}</button>
                                          )}
                                          {user.status === 'dnd' && (
                                            <button className="listen-along-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                                              <Headphones size={12} style={{ marginRight: '4px' }} /> {t('joinDisabled')}
                                            </button>
                                          )}
                                        </>
                                      ) : (
                                        <div className="friend-song" style={{ color: 'var(--text-muted)' }}>{t('browsing') || 'Browsing...'}</div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </>
                          );
                        })()}
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
                    <div className="dropdown-item" onClick={() => { setCustomStatusInput(myCustomStatus); setShowStatusModal(true); setShowLogoutDropdown(false); }}>
                      <MessageSquare size={16} style={{ marginRight: '8px', color: 'var(--text-secondary)' }} /> {myCustomStatus ? t('customStatusEdit') : t('customStatusSet')}
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="logout-item" onClick={handleLogout}>
                      <LogOut size={16} /> {t('logoutDropdown')}
                    </div>
                  </>
                ) : (
                  <div className="logout-item" onClick={() => { setShowLogoutDropdown(false); navigate('settings'); }} style={{ color: 'var(--text-primary)' }}>
                    <Settings size={16} /> {t('goToSettings')}
                  </div>
                )}
              </div>
            )}
            <button className="user-profile-btn" onClick={() => { if (discordUser) { navigate('profile', { profileId: discordUser.id }); setShowLogoutDropdown(false); } else { setShowLogoutDropdown(!showLogoutDropdown); } }} onContextMenu={(e) => { e.preventDefault(); setShowLogoutDropdown(!showLogoutDropdown); setShowProfileStats(false); }} title={discordUser ? `` : 'Login'}>
              <div className="user-avatar" style={{ position: 'relative' }}>
                {discordUser && getDiscordAvatar(discordUser) ? (
                  <img src={getDiscordAvatar(discordUser)!} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => handleAvatarError(e, discordUser.id, discordUser.username)} />
                ) : (
                  <span>{discordUser ? (discordUser.global_name || discordUser.username).charAt(0).toUpperCase() : 'DP'}</span>
                )}
                {discordUser && (
                  <div className={`status-dot-avatar status-dot ${userStatus}`}></div>
                )}
                {myCustomStatus && (
                  <>
                    <div className="friend-thought-badge" title={myCustomStatus}>
                      <MessageSquare size={10} color="var(--accent-primary)" />
                    </div>
                    <div className="friend-cloud-popover" style={{ left: '0', transform: 'translateY(4px) scale(0.92)' }}>
                      {myCustomStatus}
                    </div>
                  </>
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
            <div className="offline-banner" style={{ background: 'linear-gradient(90deg, #f59e0b, #ef4444)', color: 'white', textAlign: 'center', padding: '8px 16px', fontWeight: '600', fontSize: '13px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)', zIndex: 10 }}>
              <WifiOff size={16} /> <span>{t('offlineMode')} — Mode Offline aktif. Memutar musik dari Offline Vault / Cache lokal.</span>
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
                  <button className="btn-icon" onClick={() => navigate('library')} style={{
                    color: activePage === 'library' ? (settings.theme === 'minimalist' ? 'var(--accent-text, black)' : 'var(--accent-primary)') : 'var(--text-primary)',
                    background: activePage === 'library' && settings.theme === 'minimalist' ? 'var(--accent-primary)' : ''
                  }} title={t('likedSongs') || 'Liked Songs'}><Heart size={20} /></button>
                  <button className="btn-icon" onClick={() => navigate('playlist')} style={{
                    color: (activePage === 'playlist' || activePage === 'playlist-detail') ? (settings.theme === 'minimalist' ? 'var(--accent-text, black)' : 'var(--accent-primary)') : 'var(--text-primary)',
                    background: (activePage === 'playlist' || activePage === 'playlist-detail') && settings.theme === 'minimalist' ? 'var(--accent-primary)' : ''
                  }} title={t('playlist') || 'Playlists'}><ListMusic size={20} /></button>
                  <button className="btn-icon" onClick={() => navigate('downloads')} style={{
                    color: activePage === 'downloads' ? (settings.theme === 'minimalist' ? 'var(--accent-text, black)' : 'var(--accent-primary)') : 'var(--text-primary)',
                    background: activePage === 'downloads' && settings.theme === 'minimalist' ? 'var(--accent-primary)' : ''
                  }} title={t('offlineVault') || 'Offline Vault'}><FolderPlus size={20} /></button>
                  <button className="btn-icon" onClick={() => navigate('settings')} style={{
                    color: activePage === 'settings' ? (settings.theme === 'minimalist' ? 'var(--accent-text, black)' : 'var(--accent-primary)') : 'var(--text-primary)',
                    background: activePage === 'settings' && settings.theme === 'minimalist' ? 'var(--accent-primary)' : ''
                  }} title="Pengaturan"><Settings size={20} /></button>
                  <div style={{ width: '1px', height: '24px', background: 'var(--border-color)', margin: '0 8px' }}></div>
                </div>
              )}
              <div className="nav-arrows" style={settings.theme === 'minimalist' ? { margin: 0 } : {}}>
                <button className="arrow-btn" onClick={goBack} disabled={!canGoBack} style={{ opacity: canGoBack ? 1 : 0.3, cursor: canGoBack ? 'pointer' : 'default', transition: 'opacity 0.2s' }} title="Back"><ChevronLeft size={20} /></button>
                <button className="arrow-btn" onClick={goForward} disabled={!canGoForward} style={{ opacity: canGoForward ? 1 : 0.3, cursor: canGoForward ? 'pointer' : 'default', transition: 'opacity 0.2s' }} title="Forward"><ChevronRight size={20} /></button>
              </div>
            </div>

            <div className="search-container" ref={searchContainerRef} style={settings.theme === 'minimalist' ? { marginLeft: 'auto' } : { position: 'relative' }}>
              <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', alignItems: 'center', position: 'relative', opacity: isOffline ? 0.5 : 1, pointerEvents: isOffline ? 'none' : 'auto' }}>
                <Search size={16} className="search-icon" />
                <input
                  ref={searchInputRef}
                  disabled={isOffline}
                  type="text"
                  className="search-input"
                  placeholder={homeMode === 'podcast' ? t('searchPodcastPlaceholder') : t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => { if (searchQuery.length >= 2) setShowSuggestions(true); }}
                />
              </form>

              {/* Live Search Dropdown */}
              {showSuggestions && searchQuery.length >= 2 && (
                <div className="search-suggestions-dropdown">
                  {homeMode !== 'podcast' && (
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
                  )}
                  {homeMode === 'podcast' && (
                    <div
                      className="suggestion-intent-row"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        openArtistPage(`${searchQuery}__podcast__`);
                        setShowSuggestions(false);
                      }}
                    >
                      <div className="intent-icon"><Mic2 size={18} color="var(--accent-primary)" /></div>
                      <div className="intent-text">
                        <span className="intent-prefix" style={{ color: 'var(--accent-primary)' }}>{t('podcast')} —</span>
                        <span className="intent-keyword">"{searchQuery}"</span>
                      </div>
                    </div>
                  )}

                  {isFetchingSuggestions ? (
                    <div className="suggestion-loading">
                      <Loader2 size={14} className="spin-icon" />
                      <span>{t('searching')}</span>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="suggestion-empty">{t('noResults')} "{searchQuery}"</div>
                  ) : (
                    <>
                      {suggestions.map((song, i) => (
                        <div
                          key={i}
                          className="suggestion-item no-hover-play"
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => {
                            if (homeMode === 'podcast' || song.isPodcastShow) {
                              openArtistPage(`${song.artist} ${song.title}__podcast__`, song.podcastId || song.id, song.feedUrl);
                            } else {
                              playSingleSong(song);
                            }
                            setSearchQuery(song.title);
                            setShowSuggestions(false);
                          }}
                        >
                          <div className="suggestion-thumb">
                            <img src={(getCleanThumbnail(song.thumbnail) || getHighResImage(song.cover))} alt={song.title} />
                          </div>
                          <div className="suggestion-info">
                            <div className="suggestion-title">{song.title}</div>
                            <div className="suggestion-artist-row">
                              <span className="suggestion-artist">{song.artist}</span>
                              {homeMode === 'podcast' ? (
                                <span className="suggestion-badge" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                                  <Mic2 size={10} strokeWidth={2.4} />
                                  <span>{song.genre || 'Podcast'}</span>
                                </span>
                              ) : (() => {
                                const badge = getAudioBadge(song);
                                if (!badge) return null;
                                return (
                                  <span className={`suggestion-badge badge-${badge.type}`}>
                                    {badge.type === 'audio' && <Music size={10} strokeWidth={2.4} />}
                                    {badge.type === 'lyrics' && <FileText size={10} strokeWidth={2.4} />}
                                    {badge.type === 'video' && <Film size={10} strokeWidth={2.4} />}
                                    <span>{badge.type === 'audio' ? t('badgeAudio') : badge.type === 'lyrics' ? t('badgeLyrics') : t('badgeVideo')}</span>
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="suggestion-actions">
                            {homeMode === 'podcast' || song.isPodcastShow ? (
                              <button
                                className="suggestion-btn"
                                title="Episodes"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openArtistPage(`${song.artist} ${song.title}__podcast__`, song.podcastId || song.id, song.feedUrl);
                                  setSearchQuery(song.title);
                                  setShowSuggestions(false);
                                }}
                              >
                                <ListMusic size={15} />
                              </button>
                            ) : (
                              <>
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
                                  className={`suggestion-btn ${isLiked(song) ? 'liked' : ''}`}
                                  title={isLiked(song) ? t('unlikeSong') : t('likeSong')}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleLike(song);
                                  }}
                                >
                                  <Heart size={15} fill={isLiked(song) ? 'currentColor' : 'none'} />
                                </button>
                                <button
                                  className="suggestion-btn"
                                  title={t('addToQueue')}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    simulateLoading(async () => {
                                  if (isGuest && activePartyId) {
                                    await (window as any).electronAPI.sendQueueRequest(activePartyId, discordUser?.id, discordUser?.global_name || discordUser?.username, song);
                                    showToast(`Berhasil meminta Host untuk menambahkan "${song.title}" ke antrean!`, 'success');
                                    setShowSuggestions(false);
                                    return;
                                  }
                                  const augSong = augmentSongWithUser(song);
                                  setQueue(prev => [...prev, augSong]);
                                  if (currentIndex === -1) {
                                    setCurrentIndex(0);
                                    executePlay(song);
                                  } else {
                                    showToast(t('toastAddedToQueue'));
                                  }
                                  setShowSuggestions(false);
                                });
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
                              title={t('downloadSong')}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if ((window as any).electronAPI) {
                                  let songToCache = { ...song };
                                  if (!songToCache.id) {
                                    showToast('Menyiapkan audio...', 'music');
                                    try {
                                      const q = songToCache.originalQuery || `${songToCache.artist} ${songToCache.title} official audio`;
                                      const url = `${API_BASE_URL}/api/search?q=${encodeURIComponent(q)}`;
                                      const data = (window as any).electronAPI
                                        ? await (window as any).electronAPI.fetchUrl(url)
                                        : await (await fetch(url)).json();
                                      const resData = typeof data === 'string' ? JSON.parse(data) : data;
                                      if (resData && resData.results && resData.results.length > 0) {
                                        let candidates = resData.results.filter((item: any) => item.duration >= 50 && item.duration <= 720);
                                        candidates = rankAudioResults(candidates, songToCache.title, songToCache.duration || 0);
                                        const studioCandidates = candidates.filter((item: any) => !isUnwantedTrackVariant(item.title, item.artist));
                                        const validYt = studioCandidates[0] || candidates[0] || resData.results[0];
                                        if (validYt) {
                                          songToCache.id = validYt.id;
                                        }
                                      }
                                    } catch (err) { }
                                  }
                                  if (songToCache.id) {
                                    let streamUrl = `${API_BASE_URL}/api/stream?id=${songToCache.id}`;
                                    if (settings.audioQuality && settings.audioQuality !== 'auto') {
                                      streamUrl += `&quality=${settings.audioQuality}`;
                                    }
                                    (window as any).electronAPI.cacheAudio(songToCache, streamUrl);
                                    showToast(`${t('toastDownloadStarted')} "${songToCache.title}"...`, 'success');
                                  } else {
                                    showToast('Gagal menemukan audio untuk diunduh.', 'error');
                                  }
                                }
                              }}
                            >
                              <Download size={16} />
                            </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="topbar-right-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '60px', justifyContent: 'flex-end' }}>
              <button
                className="btn-icon"
                onClick={() => setShowShortcutsModal(true)}
                title="Keyboard Shortcuts (?)"
                style={{
                  color: 'var(--text-secondary)',
                  padding: '8px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Keyboard size={18} />
              </button>
              {discordUser && (
                <div
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    borderRadius: '50%', border: activePage === 'profile' && activeProfileId === discordUser.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => {
                    navigate('profile', { profileId: discordUser.id });
                  }}
                  title={t('myProfile')}
                >
                  <img src={discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : getDefaultDiscordAvatar(discordUser.id, discordUser.username)} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => handleAvatarError(e, discordUser.id, discordUser.username)} />
                </div>
              )}
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
          {activePage === 'profile' && renderProfilePage()}
          {activePage === 'sound-map' && (
            <div className="main-scroll" style={{ padding: '24px' }}>
              <SoundMap
                t={t}
                onPlaySong={startPlayingFromList}
                theme={settings.theme || 'default'}
                trendingSongs={trendingSongs}
                isTrendingLoading={isTrendingLoading}
                onCountrySelect={(alpha2, name) => {
                  setTrendingCountry({ code: alpha2, name });
                  fetchTrendingSongs(alpha2, name);
                }}
              />
            </div>
          )}
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
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
                      <img
                        src={(getCleanThumbnail(currentSong.thumbnail) || getHighResImage(currentSong.cover))}
                        className="player-cover"
                        alt="cover"
                        style={{
                          marginRight: 0,
                          animation: isPlaying ? 'spin 12s linear infinite' : 'none',
                          borderRadius: '50%',
                          border: '2px solid var(--surface-tertiary)',
                          boxShadow: isPlaying ? '0 0 10px rgba(0, 255, 170, 0.2)' : 'none',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </div>
                    <div className="player-info">
                      <span className="player-title" title={currentSong.title}>{currentSong.title}</span>
                      <span className="player-artist" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{currentSong.artist}</span>
                    </div>
                    <button className={`chat-btn ${isLiked(currentSong.id) ? 'liked' : ''}`} style={{ color: isLiked(currentSong.id) ? 'var(--accent-primary)' : 'var(--text-secondary)', marginLeft: '12px' }} onClick={() => toggleLike(currentSong)} title={isLiked(currentSong.id) ? t('btnUnlike') : t('btnLike')}>
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
                  {currentSong?.isPodcast && !(isGuest && activePartyId) && (
                    <button
                      className="chat-btn"
                      onClick={() => {
                        if (audioRef.current) {
                          const nextT = Math.max(0, audioRef.current.currentTime - 15);
                          audioRef.current.currentTime = nextT;
                          setProgress(nextT);
                        }
                      }}
                      title={t('podcastSkipBack')}
                      style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px' }}
                    >
                      -15s
                    </button>
                  )}
                  <button className="chat-btn" onClick={handlePrev} disabled={(loopMode === 'off' && currentIndex <= 0) || (isGuest && !!activePartyId)} style={{ opacity: ((loopMode === 'off' && currentIndex <= 0) || (isGuest && !!activePartyId)) ? 0.3 : 1, cursor: (isGuest && activePartyId) ? 'not-allowed' : 'pointer' }} title={t('btnPrevious')}><SkipBack size={22} fill="currentColor" /></button>
                  <button className="chat-play-btn" onClick={togglePlay} disabled={!currentSong || (isGuest && !!activePartyId)} style={{ opacity: (!currentSong || (isGuest && !!activePartyId)) ? 0.3 : 1, cursor: (isGuest && activePartyId) ? 'not-allowed' : 'pointer' }} title={isPlaying ? t('btnPause') : t('btnPlay')}>
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: '4px' }} />}
                  </button>
                  <button className="chat-btn" onClick={handleNext} disabled={(loopMode === 'off' && settings.autoplay === false && currentIndex >= queue.length - 1) || (isGuest && !!activePartyId)} style={{ opacity: ((loopMode === 'off' && settings.autoplay === false && currentIndex >= queue.length - 1) || (isGuest && !!activePartyId)) ? 0.3 : 1, cursor: (isGuest && activePartyId) ? 'not-allowed' : 'pointer' }} title={t('btnNext')}><SkipForward size={22} fill="currentColor" /></button>
                  {currentSong?.isPodcast && !(isGuest && activePartyId) && (
                    <button
                      className="chat-btn"
                      onClick={() => {
                        if (audioRef.current) {
                          const nextT = Math.min(audioRef.current.duration || duration, audioRef.current.currentTime + 30);
                          audioRef.current.currentTime = nextT;
                          setProgress(nextT);
                        }
                      }}
                      title={t('podcastSkipForward')}
                      style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px' }}
                    >
                      +30s
                    </button>
                  )}
                  <button className="chat-btn" onClick={toggleLoopMode} style={{ color: loopMode !== 'off' ? 'var(--accent-primary)' : 'var(--text-secondary)' }} title={loopMode === 'all' ? t('loopPlaylist') : loopMode === 'one' ? t('loopOne') : t('loopOff')}>{loopMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}</button>
                  {currentSong?.isPodcast && !(isGuest && activePartyId) && (
                    <button
                      onClick={() => {
                        const speeds = [0.75, 1, 1.25, 1.5, 2];
                        const nextSpeed = speeds[(speeds.indexOf(podcastSpeed) + 1) % speeds.length];
                        setPodcastSpeed(nextSpeed);
                        localStorage.setItem('donpollo_podcast_speed', String(nextSpeed));
                        if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
                      }}
                      title={t('podcastSpeedLabel')}
                      style={{
                        background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-color)',
                        color: 'var(--accent-primary)', borderRadius: '999px', padding: '2px 8px',
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer', marginLeft: '4px'
                      }}
                    >
                      {podcastSpeed}x
                    </button>
                  )}
                </div>
                <div className="player-progress-container">
                  <span className="chat-time">{formatTime(progress)}</span>
                  <div className="chat-progress-bar" onClick={(e) => { if (isGuest && activePartyId) return; handleSeek(e); }} style={{ cursor: (isGuest && activePartyId) ? 'default' : 'pointer' }}>
                    <div className="chat-progress-fill" style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}>
                      <div className="chat-progress-thumb"></div>
                    </div>
                  </div>
                  <span className="chat-time">{formatTime(duration)}</span>
                </div>
              </div>
              <div className="player-right">
                {settings.showVisualizer !== false && currentSong && (
                  <div style={{ width: '72px', height: '24px', marginRight: '6px', display: 'flex', alignItems: 'center' }} title="Audio Visualizer">
                    <AudioVisualizer analyser={analyserNodeRef.current} isPlaying={isPlaying} variant="compact" barCount={16} height={22} />
                  </div>
                )}
                <button
                  onClick={() => {
                    const newVal = !(settings.autoplay !== false);
                    const nextSettings = { ...settings, autoplay: newVal };
                    setSettings(nextSettings);
                    localStorage.setItem('donpollo_settings', JSON.stringify(nextSettings));
                  }}
                  title={`${t('autoplayLabel')}: ${settings.autoplay !== false ? 'ON' : 'OFF'}`}
                  style={{
                    width: '34px',
                    height: '18px',
                    borderRadius: '999px',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: settings.autoplay !== false ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.22)',
                    transition: 'background-color 0.2s ease',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: settings.autoplay !== false ? 'var(--accent-text, #000000)' : '#ffffff',
                      color: settings.autoplay !== false ? 'var(--accent-primary)' : '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: settings.autoplay !== false ? 'translateX(16px)' : 'translateX(0px)',
                      transition: 'transform 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    }}
                  >
                    {settings.autoplay !== false ? (
                      <Play size={8} fill="currentColor" style={{ marginLeft: '1px' }} />
                    ) : (
                      <Pause size={8} fill="currentColor" />
                    )}
                  </span>
                </button>
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
            <div className="friend-activity-inner main-scroll">
              <div className="sidebar-header" style={{ padding: '0 0 12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '8px' }}>
                <div className="sidebar-title" style={{ fontSize: '12px' }}>{t('friendActivityTitle')}</div>
                <div className="sidebar-subtitle" style={{ fontSize: '11px' }}>{t('friendActivitySubtitle')}</div>
              </div>

              {collabInvites.length > 0 && (
                <div className="join-requests-container" style={{ marginBottom: '12px', padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700, marginBottom: '8px' }}>Collab Invites</div>
                  {collabInvites.map((invite: any) => (
                    <div key={invite.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                        <strong>{invite.hostName}</strong> invited you to collaborate on <strong>{invite.playlistName}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={async () => {
                          await (window as any).electronAPI.respondCollabInvite(invite.id, 'accepted');
                          setCollabInvites(prev => prev.filter(i => i.id !== invite.id));
                          fetchPlaylists();
                          showToast(`Joined ${invite.playlistName}!`, 'success');
                        }} style={{ flex: 1, padding: '4px 0', backgroundColor: '#23a559', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>{t('accept') || 'Accept'}</button>

                        <button onClick={async () => {
                          await (window as any).electronAPI.respondCollabInvite(invite.id, 'rejected');
                          setCollabInvites(prev => prev.filter(i => i.id !== invite.id));
                        }} style={{ flex: 1, padding: '4px 0', backgroundColor: '#f23f43', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>{t('reject') || 'Reject'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
                        <div className="friend-item current-party-block" onClick={() => setPopupPartyId(popupPartyId === effectivePartyId ? null : effectivePartyId)} style={{ flexDirection: 'row', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', position: 'relative', marginBottom: '8px', width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
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
                            {currentPartyMembers.length > 0 && currentPartyMembers[0].currentSong && currentPartyMembers[0].currentSong.isPlaying ? (
                              <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', display: 'flex', alignItems: 'center' }} title={currentPartyMembers[0].currentSong.title}>
                                <Music size={10} style={{ marginRight: '4px', flexShrink: 0, opacity: 0.7 }} /> {currentPartyMembers[0].currentSong.title}
                              </div>
                            ) : currentSong && isPlaying ? (
                              <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', display: 'flex', alignItems: 'center' }} title={currentSong.title}>
                                <Music size={10} style={{ marginRight: '4px', flexShrink: 0, opacity: 0.7 }} /> {currentSong.title}
                              </div>
                            ) : (
                              <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('browsing') || 'Browsing...'}</div>
                            )}
                          </div>
                          {(isGuest || (discordUser && effectivePartyId === discordUser.id)) && (
                            <button
                              className="leave-party-icon-btn"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (isGuest) {
                                  setIsGuest(false);
                                  setActivePartyId(null);
                                  if (audioRef.current) audioRef.current.pause();
                                  setIsPlaying(false);
                                } else if (discordUser) {
                                  setActivePartyId(null);
                                  await (window as any).electronAPI?.deleteParty(discordUser.id);
                                }
                              }}
                              title={t('leaveParty')}
                              style={{ marginLeft: '8px' }}
                            >
                              <LogOut size={16} />
                            </button>
                          )}

                          {popupPartyId === effectivePartyId && (
                            <div className="party-popup-bubble" style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: '4px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', padding: '0 4px' }}>{t('partyMembers') || 'Party Members'}</div>
                              {partyAvatars.map(u => (
                                <div key={u.id} className="party-popup-member hover-bg" style={{ display: 'flex', alignItems: 'center', padding: '6px 4px', borderRadius: '4px', position: 'relative', cursor: 'pointer' }} onClick={() => navigate('profile', { profileId: u.id })}>
                                  <img src={u.url} alt={u.name} style={{ width: '24px', height: '24px', borderRadius: '50%', marginRight: '8px', objectFit: 'cover' }} />
                                  <div style={{ flex: 1, fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {u.name}
                                    {effectivePartyId === u.id && <span style={{ fontSize: '10px', color: 'var(--accent-primary)', marginLeft: '6px' }}>({t('partyHost')})</span>}
                                  </div>
                                  {effectivePartyId === discordUser.id && u.id !== discordUser.id && (
                                    <button className="kick-btn" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }} title={t('kickUser') || 'Kick User'} onClick={(e) => {
                                      e.stopPropagation();
                                      setUserToKick({ id: u.id, name: u.name });
                                    }}>
                                      <MinusCircle size={14} />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {isGuest && (
                                <button
                                  style={{ width: '100%', marginTop: '8px', padding: '6px', background: 'rgba(242, 63, 67, 0.1)', color: '#f23f43', border: '1px solid rgba(242, 63, 67, 0.3)', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onClick={() => {
                                    setIsGuest(false);
                                    setActivePartyId(null);
                                    setPopupPartyId(null);
                                    if (audioRef.current) audioRef.current.pause();
                                    setIsPlaying(false);
                                  }}
                                >
                                  <LogOut size={12} style={{ marginRight: '6px' }} /> {t('leaveParty') || 'Leave Party'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {otherFriends.length === 0 && !effectivePartyId ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', marginTop: '12px' }}>{t('noFriendsOnline')}</div>
                      ) : (
                        (() => {
                          const groupsMap = new Map<string, any[]>();
                          otherFriends.forEach(u => {
                            const gId = u.partyId || u.discordId;
                            if (!groupsMap.has(gId)) groupsMap.set(gId, []);
                            groupsMap.get(gId)!.push(u);
                          });
                          const groupedFriends = Array.from(groupsMap.values());

                          return groupedFriends.map(group => {
                            if (group.length > 1) {
                              const hostUser = group.find(u => u.discordId === (group[0].partyId || group[0].discordId)) || group[0];
                              const targetId = hostUser.discordId;

                              return (
                                <div key={`party-${targetId}`} className="friend-item current-party-block" onClick={() => setPopupPartyId(popupPartyId === targetId ? null : targetId)} style={{ flexDirection: 'row', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', position: 'relative', marginBottom: '8px', width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                                  <div className="party-avatars" style={{ display: 'flex', marginRight: '12px' }}>
                                    {group.map((u, idx) => (
                                      <img
                                        key={u.discordId}
                                        src={u.avatarUrl || `https://ui-avatars.com/api/?name=${u.username}`}
                                        alt={u.username}
                                        title={u.username}
                                        style={{
                                          width: '28px',
                                          height: '28px',
                                          borderRadius: '50%',
                                          border: '2px solid var(--background-secondary)',
                                          marginLeft: idx === 0 ? '0' : '-10px',
                                          zIndex: group.length - idx,
                                          objectFit: 'cover'
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--accent-primary)', fontWeight: 600, marginBottom: '2px', letterSpacing: '0.5px' }}>
                                      {t('listenAlong')}
                                    </span>
                                    {group[0].currentSong && group[0].currentSong.isPlaying ? (
                                      <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', display: 'flex', alignItems: 'center' }} title={group[0].currentSong.title}>
                                        <Music size={10} style={{ marginRight: '4px', flexShrink: 0, opacity: 0.7 }} /> {group[0].currentSong.title}
                                      </div>
                                    ) : (
                                      <div className="friend-song" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('browsing') || 'Browsing...'}</div>
                                    )}
                                  </div>
                                  <button
                                    className="join-party-icon-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      simulateLoading(async () => {
                                        if (hostUser.status === 'idle') {
                                          const success = await (window as any).electronAPI.sendJoinRequest(targetId, discordUser.id, discordUser.global_name || discordUser.username);
                                          if (success) showToast(t('joinRequestSent'), 'success');
                                        } else if (hostUser.status !== 'dnd') {
                                          setActivePartyId(targetId);
                                          setIsGuest(true);
                                          showToast(`${t('nowListeningWith')} party...`, 'success');
                                        }
                                      });
                                    }}
                                    title={hostUser.status === 'idle' ? t('askToJoin') : t('listenAlong')}
                                    style={{ marginLeft: '8px', cursor: hostUser.status === 'dnd' ? 'not-allowed' : 'pointer' }}
                                    disabled={hostUser.status === 'dnd'}
                                  >
                                    <Headphones size={16} style={{ opacity: hostUser.status === 'dnd' ? 0.5 : 1 }} />
                                  </button>

                                  {popupPartyId === targetId && (
                                    <div className="party-popup-bubble" style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.5)', marginTop: '4px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', padding: '0 4px' }}>{t('partyMembers') || 'Party Members'}</div>
                                      {group.map(u => (
                                        <div key={u.discordId} className="party-popup-member hover-bg" style={{ display: 'flex', alignItems: 'center', padding: '6px 4px', borderRadius: '4px', position: 'relative', cursor: 'pointer' }} onClick={() => navigate('profile', { profileId: u.discordId })}>
                                          <img src={u.avatarUrl || getDefaultDiscordAvatar(u.discordId, u.username)} alt={u.username} style={{ width: '24px', height: '24px', borderRadius: '50%', marginRight: '8px', objectFit: 'cover' }} onError={(e) => handleAvatarError(e, u.discordId, u.username)} />
                                          <div style={{ flex: 1, fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {u.username}
                                            {targetId === u.discordId && <span style={{ fontSize: '10px', color: 'var(--accent-primary)', marginLeft: '6px' }}>({t('partyHost')})</span>}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            } else {
                              const user = group[0];
                              return (
                                <div key={user.discordId} className="friend-item" onClick={() => { navigate('profile', { profileId: user.discordId }); }} style={{ cursor: 'pointer' }}>
                                  <div className="friend-avatar-container" style={{ position: 'relative' }}>
                                    <img src={user.avatarUrl || getDefaultDiscordAvatar(user.discordId, user.username)} alt={user.username} className="friend-avatar" onError={(e) => handleAvatarError(e, user.discordId, user.username)} />
                                    <div className={`status-dot-avatar status-dot ${user.status || 'online'}`}></div>
                                    {user.customStatus && (
                                      <>
                                        <div className="friend-thought-badge" title={user.customStatus}>
                                          <MessageSquare size={10} color="var(--accent-primary)" />
                                        </div>
                                        <div className="friend-cloud-popover">
                                          {user.customStatus}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  <div className="friend-info">
                                    <div className="friend-name" style={{ display: 'flex', alignItems: 'center' }}>
                                      {user.username}
                                      {user.platform === 'mobile' && (
                                        <div className="mobile-tooltip-container" onClick={(e) => e.stopPropagation()}>
                                          <Smartphone size={12} color="var(--text-muted)" />
                                          <div className="mobile-tooltip-text">{t('playingOnMobile') || 'Playing on Mobile'}</div>
                                        </div>
                                      )}
                                    </div>
                                    {user.currentSong && user.currentSong.isPlaying ? (
                                      <>
                                        <div className="friend-song" title={user.currentSong.title} style={{ display: 'flex', alignItems: 'center' }}><Music size={10} style={{ marginRight: '4px', flexShrink: 0, opacity: 0.7 }} /> {user.currentSong.title}</div>
                                        {user.status !== 'dnd' && (
                                          <button className="listen-along-btn" onClick={(e) => {
                                            e.stopPropagation();
                                            simulateLoading(async () => {
                                              if (user.status === 'idle') {
                                                const success = await (window as any).electronAPI.sendJoinRequest(user.partyId || user.discordId, discordUser.id, discordUser.global_name || discordUser.username);
                                                if (success) {
                                                  showToast(t('joinRequestSent'), 'success');
                                                }
                                              } else {
                                                setActivePartyId(user.partyId || user.discordId);
                                                setIsGuest(true);
                                                showToast(`${t('nowListeningWith')} ${user.username}...`, 'success');
                                              }
                                            });
                                          }}><Headphones size={12} style={{ marginRight: '4px' }} /> {user.status === 'idle' ? t('askToJoin') : t('listenAlong')}</button>
                                        )}
                                        {user.status === 'dnd' && (
                                          <button className="listen-along-btn" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} onClick={(e) => e.stopPropagation()}>
                                            <Headphones size={12} style={{ marginRight: '4px' }} /> {t('joinDisabled')}
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <div className="friend-song" style={{ color: 'var(--text-muted)' }}>{t('browsing') || 'Browsing...'}</div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          });
                        })()
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* RIGHT SIDEBAR */}
        <div className={`right-sidebar ${!isRightSidebarOpen && settings.theme !== 'minimalist' ? 'closed' : ''} ${settings.theme === 'minimalist' ? 'xbox-widget left-widget ' + (isRightSidebarOpen ? 'expanded' : 'collapsed') : ''}`} style={rightSidebarMode === 'lyrics' && currentSong ? {
          backgroundImage: `url(${getCleanThumbnail(currentSong.thumbnail) || getHighResImage(currentSong.cover)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: settings.theme === 'minimalist' ? 'fixed' : 'relative'
        } : undefined}>
          {settings.theme === 'minimalist' && (
            <div className="xbox-widget-header" onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)} style={{ position: 'relative', zIndex: 1, borderBottom: isRightSidebarOpen ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div className="xbox-widget-header-info">
                <div className="xbox-widget-title">{rightSidebarMode === 'lyrics' ? t('lyricsPanel') : rightSidebarMode === 'trending' ? t('soundMapTrendingIn') || 'Trending' : t('queue')}</div>
                {currentSong && <div className="xbox-widget-subtitle">{currentSong.title}</div>}
              </div>
              <div className="xbox-widget-actions">
                <button style={{ background: 'none', border: 'none', color: rightSidebarMode === 'queue' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', marginRight: '8px' }} onClick={(e) => { e.stopPropagation(); setRightSidebarMode('queue'); }} title="Queue">
                  <ListMusic size={16} />
                </button>
                <button style={{ background: 'none', border: 'none', color: rightSidebarMode === 'lyrics' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer', marginRight: '8px' }} onClick={(e) => { e.stopPropagation(); setRightSidebarMode('lyrics'); }} title="Lyrics">
                  <Mic2 size={16} />
                </button>
                {isRightSidebarOpen ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </div>
            </div>
          )}

          {rightSidebarMode === 'lyrics' && currentSong && (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {rightSidebarMode === 'trending' && trendingCountry && (
                  <img src={`https://flagcdn.com/w40/${trendingCountry.code.toLowerCase()}.png`} alt="Flag" style={{ width: '32px', borderRadius: '4px', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
                )}
                <div>
                  <div className="sidebar-title">{rightSidebarMode === 'lyrics' ? t('lyricsPanel') : rightSidebarMode === 'trending' ? t('soundMapTrendingIn') || 'Trending in' : t('queue')}</div>
                  <div className="sidebar-subtitle">
                    {rightSidebarMode === 'lyrics' ? (currentSong ? currentSong.title : 'No song') : rightSidebarMode === 'trending' ? (trendingCountry ? trendingCountry.name : 'Select a country') : `${Math.max(0, queue.length - Math.max(0, currentIndex))} ${t('songs')} • ${formatTime(queue.slice(Math.max(0, currentIndex)).reduce((acc, s) => acc + (s.duration || 0), 0))}`}
                  </div>
                </div>
              </div>
              <div className="sidebar-actions">
                <button style={{ background: 'none', border: 'none', color: rightSidebarMode === 'queue' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setRightSidebarMode('queue')} title="Queue">
                  <ListMusic size={18} />
                </button>
                <button style={{ background: 'none', border: 'none', color: rightSidebarMode === 'lyrics' ? 'var(--accent-primary)' : 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setRightSidebarMode('lyrics')} title="Lyrics">
                  <Mic2 size={18} />
                </button>
                <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: '8px' }} onClick={() => setIsRightSidebarOpen(false)} title="Tutup">
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          {rightSidebarMode === 'lyrics' ? (
            <div className="lyrics-mode" style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowLyricTranslation(prev => !prev)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setShowSidebarLyricsLangMenu(prev => !prev);
                      }}
                      style={{
                        background: showLyricTranslation ? 'var(--accent-primary)' : 'transparent',
                        border: '1px solid var(--accent-primary)',
                        color: showLyricTranslation ? (settings.theme === 'minimalist' ? 'black' : 'white') : 'var(--accent-primary)',
                        fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: '3px'
                      }}
                      title={`${t('translateLyrics')} (Klik kanan: pilih bahasa)`}
                    >
                      <Languages size={11} />
                    </button>
                    {showSidebarLyricsLangMenu && (
                      <div
                        onMouseLeave={() => setShowSidebarLyricsLangMenu(false)}
                        style={{
                          position: 'absolute',
                          top: 'calc(100% + 6px)',
                          left: 0,
                          minWidth: '145px',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '4px',
                          boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
                          zIndex: 50,
                        }}
                      >
                        {[
                          { code: 'auto', label: t('lyricsLangAuto') || 'Auto' },
                          { code: 'id', label: 'Indonesia' },
                          { code: 'en', label: 'English' },
                          { code: 'ja', label: '日本語' },
                          { code: 'ko', label: '한국어' },
                          { code: 'es', label: 'Español' },
                          { code: 'fr', label: 'Français' },
                        ].map(opt => {
                          const active = (settings.lyricsTargetLang || 'auto') === opt.code;
                          return (
                            <div
                              key={opt.code}
                              onClick={() => {
                                handleChangeLyricsTargetLang(opt.code);
                                setShowSidebarLyricsLangMenu(false);
                              }}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
                                fontWeight: active ? 700 : 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                              }}
                            >
                              <span>{opt.label}</span>
                              {active && <Check size={12} />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <button onClick={() => updateAndSaveLyricsOffset(-0.5)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer' }}>-0.5s</button>
                  <div
                    onClick={() => updateAndSaveLyricsOffset(0, true)}
                    title={t('resetOffsetTooltip')}
                    style={{ backgroundColor: 'var(--accent-primary)', color: settings.theme === 'minimalist' ? 'black' : 'white', fontSize: '11px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                  >
                    {lyricsOffset}s
                  </div>
                  <button onClick={() => updateAndSaveLyricsOffset(0.5)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '11px', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer' }}>+0.5s</button>
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
                    const transLine = showLyricTranslation && translatedLyrics?.[i];
                    return (
                      <div key={i} data-lyric-idx={i} className={`lyrics-line ${isActive ? 'active' : 'inactive'}`} onClick={() => jumpToLyric(line.time)}>
                        <div>{showRomanized && line.romanizedText ? line.romanizedText : line.text}</div>
                        {transLine && (
                          <div style={{ fontSize: '0.76em', opacity: 0.72, marginTop: '3px', fontWeight: 400 }}>{transLine}</div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px', fontSize: '14px' }}>{plainLyrics}</div>
                )}
              </div>
            </div>
          ) : rightSidebarMode === 'trending' ? (
            <div className="queue-list" style={{ overflowY: 'auto', padding: '16px' }}>
              {isTrendingLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                  <Loader2 size={32} className="spinning" style={{ marginBottom: '16px', color: 'var(--accent-primary)' }} />
                  <p>{t('soundMapLoading')}</p>
                </div>
              ) : trendingError ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  <Music size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                  <p>{trendingError}</p>
                </div>
              ) : trendingSongs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <button 
                      className="btn-primary pop-in-anim" 
                      style={{ width: '100%', padding: '10px 16px', fontSize: '13px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                      onClick={() => startPlayingFromList(trendingSongs, 0)}
                    >
                      <Play size={14} fill="currentColor" /> {t('playAll')}
                    </button>
                  </div>
                  {trendingSongs.map((song, i) => (
                    <div 
                      key={i} 
                      className={`suggestion-item pop-in-anim`} 
                      onClick={() => playSingleSong(song)}
                      onContextMenu={(e) => handleContextMenu(e, song)}
                      draggable={true} 
                      onDragStart={(e) => { setDraggedGlobalSong(song); applyDragGhost(e, song); }} 
                      onDragEnd={(e) => { setDraggedGlobalSong(null); (e.currentTarget as HTMLElement).classList.remove('dragging-origin'); }}
                      style={{ 
                        borderRadius: '8px', 
                        padding: '8px 12px', 
                        background: 'rgba(255,255,255,0.03)',
                        animationDelay: `${(i + 1) * 0.05}s`
                      }}
                    >
                      <div style={{ width: '24px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                        {i + 1}
                      </div>
                      <div className="suggestion-thumb">
                        <img src={song.cover} alt={song.title} />
                      </div>
                      <div className="suggestion-info">
                        <div className="suggestion-title">{song.title}</div>
                        <div className="suggestion-artist">{song.artist}</div>
                      </div>
                      <div className="suggestion-actions" style={{ display: 'flex' }}>
                        <button className="suggestion-btn" style={{ opacity: 1 }}>
                          <Play size={14} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px', fontSize: '14px' }}>
                  {t('soundMapSelectCountry')}
                </div>
              )}
            </div>
          ) : (
            <div className="queue-list"
                 onDragOver={(e) => {
                   if (draggedGlobalSong) {
                     e.preventDefault();
                     setDragOverQueueList(true);
                   }
                 }}
                 onDragLeave={() => setDragOverQueueList(false)}
                 onDrop={async () => {
                   if (draggedGlobalSong) {
                     if (isGuest && activePartyId) {
                       await (window as any).electronAPI.sendQueueRequest(activePartyId, discordUser?.id, discordUser?.global_name || discordUser?.username, draggedGlobalSong);
                       showToast(`Berhasil meminta Host untuk menambahkan "${draggedGlobalSong.title}" ke antrean!`, 'success');
                     } else {
                       const augSong = augmentSongWithUser(draggedGlobalSong);
                       setQueue(prev => [...prev, augSong]);
                       setOriginalQueue(prev => [...prev, augSong]);
                       if (currentIndex === -1) {
                         setCurrentIndex(0);
                         executePlay(augSong);
                       } else {
                         showToast(t('toastAddedToQueue'));
                       }
                     }
                     setDraggedGlobalSong(null);
                     setDragOverQueueList(false);
                   }
                 }}
                 style={{ border: dragOverQueueList ? '2px dashed var(--accent-primary)' : '2px solid transparent', background: dragOverQueueList ? 'rgba(255,255,255,0.05)' : 'transparent', boxSizing: 'border-box', transition: 'all 0.2s' }}
            >
              {queue.length - Math.max(0, currentIndex) <= 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', marginTop: '32px' }}>{t('emptyQueue')}</div>
              ) : (
                <>
                  {queue.map((song, idx) => {
                    if (idx < currentIndex) return null;
                    const isPlayingNow = currentSong?.id === song.id;
                    return (
                      <div key={idx} className={`queue-item ${isPlayingNow ? 'playing' : ''}`}
                        draggable={!isPlayingNow && !(isGuest && activePartyId)}
                        onDragStart={(e) => {
                          setDraggedQueueIdx(idx);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnter={() => {
                          if (draggedQueueIdx === null || isPlayingNow) return;
                          setDragOverQueueIdx(idx);
                        }}
                        onDragEnd={() => {
                          if (draggedQueueIdx !== null && dragOverQueueIdx !== null && draggedQueueIdx !== dragOverQueueIdx) {
                            setQueue(prev => {
                              const newQ = [...prev];
                              const draggedItem = newQ[draggedQueueIdx];
                              newQ.splice(draggedQueueIdx, 1);
                              newQ.splice(dragOverQueueIdx, 0, draggedItem);
                              setOriginalQueue(newQ);
                              return newQ;
                            });

                            setCurrentIndex(prev => {
                              if (prev === draggedQueueIdx) {
                                return dragOverQueueIdx;
                              } else if (draggedQueueIdx < prev && dragOverQueueIdx >= prev) {
                                return prev - 1;
                              } else if (draggedQueueIdx > prev && dragOverQueueIdx <= prev) {
                                return prev + 1;
                              }
                              return prev;
                            });
                          }
                          setDraggedQueueIdx(null);
                          setDragOverQueueIdx(null);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: draggedQueueIdx === idx ? 0.5 : 1, borderTop: dragOverQueueIdx === idx && dragOverQueueIdx < draggedQueueIdx! ? '2px solid var(--accent-primary)' : 'none', borderBottom: dragOverQueueIdx === idx && dragOverQueueIdx > draggedQueueIdx! ? '2px solid var(--accent-primary)' : 'none', transition: 'all 0.2s' }}>
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '12px', cursor: (isGuest && activePartyId) ? 'default' : 'pointer', minWidth: 0 }} onClick={() => { if (isGuest && activePartyId) return; setCurrentIndex(idx); executePlay(song); }}>
                          <img src={(getCleanThumbnail(song.thumbnail) || getHighResImage(song.cover))} alt={song.title} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                          <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
                            <div title={song.title} style={{ fontSize: "13px", fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</span>
                              {song.isAutoplay && (
                                <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: 'var(--accent-primary)', flexShrink: 0 }}>{t('autoplayBadge')}</span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</div>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>{formatTime(song.duration)}</div>
                        </div>

                        {song.addedBy && !!(activePartyId || (discordUser && onlineUsers.some(u => u.partyId === discordUser.id))) && (
                          <div className="queue-added-by" style={{ marginLeft: '4px', flexShrink: 0 }} title={`${t('addedByUser')} ${song.addedBy.name}`}>
                            <img src={song.addedBy.avatarUrl || getDefaultDiscordAvatar(song.addedBy.id, song.addedBy.name)} alt={song.addedBy.name} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }} onError={(e) => handleAvatarError(e, song.addedBy.id, song.addedBy.name)} />
                          </div>
                        )}

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
                    <div className="clear-queue" onClick={() => setShowClearQueueConfirm(true)}>{t('clearQueue')}</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR */}

      {/* VIBRANT THEME — BOTTOM NAVIGATION BAR */}
      {settings.theme === 'vibrant' && !isWidgetMode && (
        <nav className="vibrant-bottom-nav">
          <button
            className={`vibrant-nav-btn ${activePage === 'home' ? 'active' : ''}`}
            onClick={goHome}
            title={t('home')}
          >
            <Home size={22} />
            <span>{t('home')}</span>
          </button>
          <button
            className={`vibrant-nav-btn ${activePage === 'library' ? 'active' : ''}`}
            onClick={() => navigate('library')}
            title={t('yourLibrary')}
          >
            <Library size={22} />
            <span>{t('yourLibrary')}</span>
          </button>
          <button
            className={`vibrant-nav-btn ${(activePage === 'playlist' || activePage === 'playlist-detail') ? 'active' : ''}`}
            onClick={() => setShowCreatePlaylist(true)}
            title={t('createPlaylist')}
          >
            <Plus size={24} />
            <span>{t('createPlaylist')}</span>
          </button>
          <button
            className={`vibrant-nav-btn ${activePage === 'downloads' ? 'active' : ''}`}
            onClick={() => navigate('downloads')}
            title={t('downloads')}
          >
            <Download size={22} />
            <span>{t('downloads')}</span>
          </button>
          <button
            className={`vibrant-nav-btn ${activePage === 'settings' ? 'active' : ''}`}
            onClick={() => navigate('settings')}
            title={t('settings')}
          >
            <Settings size={22} />
            <span>{t('settings')}</span>
          </button>
        </nav>
      )}

      {/* FULLSCREEN PLAYER */}
      <FullscreenPlayer
        isOpen={isWidgetMode}
        onClose={() => setIsWidgetMode(false)}
        currentSong={currentSong}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        isShuffled={isShuffled}
        loopMode={loopMode}
        showWidgetOverlay={showWidgetOverlay}
        setShowWidgetOverlay={setShowWidgetOverlay}
        lyricsData={lyricsData}
        plainLyrics={plainLyrics}
        lyricsOffset={lyricsOffset}
        updateAndSaveLyricsOffset={updateAndSaveLyricsOffset}
        showRomanized={showRomanized}
        setShowRomanized={setShowRomanized}
        showLyricTranslation={showLyricTranslation}
        setShowLyricTranslation={setShowLyricTranslation}
        translatedLyrics={translatedLyrics}
        isTranslatingLyrics={isTranslatingLyrics}
        lyricsTargetLang={settings.lyricsTargetLang || 'auto'}
        onChangeLyricsTargetLang={handleChangeLyricsTargetLang}
        widgetLyricsRef={widgetLyricsRef}
        handleUserScroll={handleUserScroll}
        jumpToLyric={jumpToLyric}
        isLiked={isLiked}
        toggleLike={toggleLike}
        toggleShuffle={toggleShuffle}
        togglePlay={togglePlay}
        handlePrev={handlePrev}
        handleNext={handleNext}
        toggleLoopMode={toggleLoopMode}
        handleSeek={handleSeek}
        formatTime={formatTime}
        t={t}
      />
      {contextMenu && (() => {
        const left = Math.max(10, Math.min(contextMenu.x, window.innerWidth - 230));
        const top = Math.max(10, Math.min(contextMenu.y, window.innerHeight - 260));
        return (
          <div className="context-menu" style={{ left: `${left}px`, top: `${top}px`, position: 'fixed', zIndex: 9999 }}>
            {!(isGuest && activePartyId) && (
              <div className="context-menu-item" onClick={() => {
                const newQ = [...queue];
                const augSong = augmentSongWithUser(contextMenu.song);
                newQ.splice(currentIndex + 1, 0, augSong);
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
              const augSong = augmentSongWithUser(contextMenu.song);
              setQueue(prev => [...prev, augSong]);
              setOriginalQueue(prev => [...prev, augSong]);
              if (currentIndex === -1) {
                setCurrentIndex(0);
                executePlay(augSong);
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
            {!contextMenu.song.isPodcast && (
              <div className="context-menu-item" onClick={() => {
                if ((window as any).electronAPI?.cacheAudio) {
                  let streamUrl = `${API_BASE_URL}/api/stream?id=${contextMenu.song.id}`;
                  if (settings.audioQuality && settings.audioQuality !== 'auto') {
                    streamUrl += `&quality=${settings.audioQuality}`;
                  }
                  (window as any).electronAPI.cacheAudio(contextMenu.song, streamUrl);
                  showToast(`${t('toastDownloadStarted')} "${contextMenu.song.title}"...`, 'success');
                } else {
                  showToast(t('downloadDesktopOnly'), 'error');
                }
                setContextMenu(null);
              }}>
                <DownloadCloud size={16} /> {t('downloadSong')}
              </div>
            )}
          </div>
        );
      })()}

      {/* Playlist Context Menu */}
      {playlistContextMenu && (() => {
        const left = Math.max(10, Math.min(playlistContextMenu.x, window.innerWidth - 210));
        const top = Math.max(10, Math.min(playlistContextMenu.y, window.innerHeight - 120));
        return (
          <div className="context-menu" style={{ left: `${left}px`, top: `${top}px`, position: 'fixed', zIndex: 9999 }}>
            <div className="context-menu-item" onClick={() => {
              const pl = playlistContextMenu.playlist;
              if ((window as any).electronAPI?.cacheAudio) {
                const toDownload = pl.songs.filter((s: any) => !downloadedSongs.some(ds => ds.id === s.id) && !activeDownloads[s.id]);
                if (toDownload.length === 0) {
                  showToast(t('allSongsDownloaded'), 'success');
                } else {
                  showToast(t('startDownloadingSongs', { '0': String(toDownload.length) }), 'success');
                  toDownload.forEach((song: any) => {
                    let streamUrl = `${API_BASE_URL}/api/stream?id=${song.id}`;
                    if (settings.audioQuality && settings.audioQuality !== 'auto') {
                      streamUrl += `&quality=${settings.audioQuality}`;
                    }
                    (window as any).electronAPI.cacheAudio(song, streamUrl);
                  });
                }
              }
              setPlaylistContextMenu(null);
            }}>
              <DownloadCloud size={16} /> {t('downloadAll')}
            </div>
            {playlistContextMenu.playlist.discordId === discordUser?.id ? (
              <div className="context-menu-item" onClick={() => {
                setPlaylistToDelete(playlistContextMenu.playlist.id);
                setPlaylistContextMenu(null);
              }} style={{ color: '#ff5555' }}>
                <Trash2 size={16} /> {t('deletePlaylist')}
              </div>
            ) : (
              <div className="context-menu-item" onClick={() => {
                setPlaylistToRemove(playlistContextMenu.playlist.id);
                setPlaylistContextMenu(null);
              }} style={{ color: '#ff5555' }}>
                <Trash2 size={16} /> {t('removeFromLibrary')}
              </div>
            )}
          </div>
        );
      })()}

      {/* Floating Download Manager UI */}
      {Object.keys(activeDownloads).length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: currentSong ? '100px' : '20px',
          right: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '16px',
          width: '280px',
          zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {t('downloadingCount').replace('{0}', String(Object.keys(activeDownloads).length))}
            </span>
            <DownloadCloud size={16} color="var(--accent-primary)" />
          </div>
          <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.values(activeDownloads).map((d, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.songData.title}
                </span>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.progress}%`, background: 'var(--accent-primary)', transition: 'width 0.2s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vibe Check Popup */}
      {showVibeCheck && (
        <div className="vibe-check-overlay" onClick={() => setShowVibeCheck(false)}>
          <div className="vibe-check-modal" onClick={e => e.stopPropagation()}>
            <button className="vibe-close-btn" onClick={() => setShowVibeCheck(false)}>
              <X size={20} />
            </button>

            <h3>{t('vibeCheckTitle')}</h3>
            <p>{t('vibeCheckPrompt')}</p>
            <div className="vibe-options">
              {(['chill', 'happy', 'energetic', 'sad'] as VibeType[]).map(mood => {
                const targetId = `vibe_temp_${mood}`;
                const vPl = madeForYouPlaylists.find(p => p.id === targetId);
                const cfg = VIBE_CONFIGS[mood];
                return (
                  <button
                    key={mood}
                    className="vibe-btn"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => {
                      if ((window as any).electronAPI?.trackMood) {
                        (window as any).electronAPI.trackMood(mood);
                      }
                      setSelectedVibeMood(mood);
                      localStorage.setItem('donpollo_current_vibe', mood);
                      setShowVibeCheck(false);
                      if (FEATURE_FLAGS.ENABLE_PLAYLIST_MIX && vPl) {
                        openMadeForYouPlaylist(vPl);
                      } else {
                        showToast(t('moodSaved') || 'Mood tersimpan!', 'success');
                      }
                    }}
                  >
                    {renderMixIcon(cfg?.iconName || mood, 16)}
                    <span>{t(`mood${mood.charAt(0).toUpperCase() + mood.slice(1)}` as any)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Wrapped Story Modal */}
      <WrappedStoryModal
        isOpen={showWrappedStory}
        wrappedData={wrappedData}
        wrappedStoryIndex={wrappedStoryIndex}
        setWrappedStoryIndex={setWrappedStoryIndex}
        onClose={() => setShowWrappedStory(false)}
        discordUser={discordUser}
        apiBaseUrl={API_BASE_URL}
        t={t}
        startPlayingFromList={startPlayingFromList}
      />

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        t={t}
        playlists={playlists}
        madeForYouPlaylists={madeForYouPlaylists}
        playHistory={playHistory}
        likedSongs={likedSongs}
        onPlaySong={(song) => playSingleSong(song)}
        onOpenPlaylist={(pl) => {
          if (pl.isTemporary) openMadeForYouPlaylist(pl);
          else navigate('playlist-detail', { playlistId: pl.id });
        }}
        onSearchQuery={(q) => {
          setSearchQuery(q);
          setShowSuggestions(true);
          navigate('home');
          setTimeout(() => searchInputRef.current?.focus(), 60);
        }}
        actions={[
          {
            id: 'act-play-pause',
            category: t('cmdCatActions'),
            title: isPlaying ? t('btnPause') : t('btnPlay'),
            subtitle: currentSong ? `${currentSong.title} — ${currentSong.artist}` : undefined,
            icon: isPlaying ? <Pause size={16} /> : <Play size={16} />,
            onSelect: () => togglePlay(),
          },
          {
            id: 'act-next',
            category: t('cmdCatActions'),
            title: t('btnNext'),
            icon: <SkipForward size={16} />,
            onSelect: () => handleNext(),
          },
          {
            id: 'act-prev',
            category: t('cmdCatActions'),
            title: t('btnPrevious'),
            icon: <SkipBack size={16} />,
            onSelect: () => handlePrev(),
          },
          {
            id: 'act-shuffle',
            category: t('cmdCatActions'),
            title: t('btnShuffle'),
            icon: <Shuffle size={16} />,
            onSelect: () => toggleShuffle(),
          },
          {
            id: 'act-repeat',
            category: t('cmdCatActions'),
            title: loopMode === 'all' ? t('loopPlaylist') : loopMode === 'one' ? t('loopOne') : t('loopOff'),
            icon: <Repeat size={16} />,
            onSelect: () => toggleLoopMode(),
          },
          {
            id: 'act-theater',
            category: t('cmdCatActions'),
            title: t('btnFullscreen'),
            icon: <Maximize2 size={16} />,
            onSelect: () => setIsWidgetMode(true),
          },
          {
            id: 'act-nav-home',
            category: t('cmdCatActions'),
            title: t('home'),
            icon: <Home size={16} />,
            onSelect: () => goHome(),
          },
          {
            id: 'act-nav-library',
            category: t('cmdCatActions'),
            title: t('yourLibrary'),
            icon: <Library size={16} />,
            onSelect: () => navigate('library'),
          },
          {
            id: 'act-nav-soundmap',
            category: t('cmdCatActions'),
            title: t('soundMap') || 'Sound Map',
            icon: <MapIcon size={16} />,
            onSelect: () => navigate('sound-map'),
          },
          {
            id: 'act-nav-downloads',
            category: t('cmdCatActions'),
            title: t('downloads'),
            icon: <Download size={16} />,
            onSelect: () => navigate('downloads'),
          },
          {
            id: 'act-nav-settings',
            category: t('cmdCatActions'),
            title: t('settings'),
            icon: <Settings size={16} />,
            onSelect: () => navigate('settings'),
          },
          {
            id: 'act-theme-default',
            category: t('themeDisplay'),
            title: `${t('themeDisplay')}: ${t('themeDefault')}`,
            icon: <Paintbrush size={16} />,
            onSelect: () => {
              const next = { ...settings, theme: 'default' };
              setSettings(next);
              localStorage.setItem('donpollo_settings', JSON.stringify(next));
            },
          },
          {
            id: 'act-theme-minimalist',
            category: t('themeDisplay'),
            title: `${t('themeDisplay')}: ${t('themeMinimalist')}`,
            icon: <Paintbrush size={16} />,
            onSelect: () => {
              const next = { ...settings, theme: 'minimalist' };
              setSettings(next);
              localStorage.setItem('donpollo_settings', JSON.stringify(next));
            },
          },
          {
            id: 'act-theme-vibrant',
            category: t('themeDisplay'),
            title: `${t('themeDisplay')}: ${t('themeVibrant')}`,
            icon: <Paintbrush size={16} />,
            onSelect: () => {
              const next = { ...settings, theme: 'vibrant' };
              setSettings(next);
              localStorage.setItem('donpollo_settings', JSON.stringify(next));
            },
          },
        ]}
      />

      {/* Live Party Chat & Floating Emoji Reactions (Listen Along) */}
      {(() => {
        const isHostingParty = !!(discordUser && onlineUsers.some(u => u.partyId === discordUser.id));
        const effectivePartyId = activePartyId || (isHostingParty ? discordUser!.id : null);
        const partyUser = discordUser
          ? { id: discordUser.id, name: discordUser.global_name || discordUser.username, avatar: getDiscordAvatar(discordUser) }
          : null;
        return (
          <PartyChatOverlay
            partyId={effectivePartyId}
            currentUser={partyUser}
            t={t}
          />
        );
      })()}
    </div>
  );
}

export default App;
