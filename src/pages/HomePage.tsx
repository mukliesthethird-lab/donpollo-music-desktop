import React from 'react';
import {
  Sparkles, Music, Mic2, Play, Pause, Loader2, RefreshCw,
  Headphones, Heart, Clock, ChevronLeft, ChevronRight, Globe,
  ListMusic, FolderPlus, Shuffle, Maximize2, UserCircle, Headset
} from 'lucide-react';
import { FEATURE_FLAGS } from '../config/features';
import {
  cleanBaseSongTitle, isUnwantedTrackVariant, formatTrackLikeSpotify
} from '../utils/audioRanking';
import {
  VIBE_CONFIGS, DEFAULT_MADE_FOR_YOU_PLAYLISTS, extractTopArtists, type VibeType
} from '../utils/vibeRecommendation';
import { getMixPlaylistCover } from '../utils/spotifyMixCover';
import {
  renderMixIcon, getCleanThumbnail, getHighResImage, applyDragGhost, type Playlist
} from '../utils/mediaHelpers';

interface HomePageProps {
  searchResults: any[];
  getGreeting: () => string;
  language: string;
  homeMode: 'music' | 'podcast';
  setHomeMode: (mode: 'music' | 'podcast') => void;
  wrappedData: any;
  setWrappedStoryIndex: (idx: number) => void;
  setShowWrappedStory: (val: boolean) => void;
  selectedVibeMood: VibeType;
  setSelectedVibeMood: (v: VibeType) => void;
  madeForYouPlaylists: Playlist[];
  isMixGeneratingId: string | null;
  generateOrGetMixTracks: (pl: Playlist, forceRefresh?: boolean) => Promise<any[]>;
  playMadeForYouPlaylist: (pl: Playlist, e?: React.MouseEvent) => void;
  regenerateMadeForYouMix: (id: string) => void;
  openMadeForYouPlaylist: (pl: Playlist) => void;
  playHistory: any[];
  setPlayHistory: React.Dispatch<React.SetStateAction<any[]>>;
  likedSongs: any[];
  recommendations: any[];
  hitsInternational: any[];
  hitsIndonesia: any[];
  hitsJapan: any[];
  hitsKorean: any[];
  hitsLatin: any[];
  hitsLocal: any[];
  localCountry: { code: string; name: string; flag?: string } | null;
  topPodcasts: any[];
  podcastsUs: any[];
  podcastsId: any[];
  podcastsJp: any[];
  podcastsKr: any[];
  podcastsLatin: any[];
  podcastHeroIndex: number;
  currentSong: any;
  isPlaying: boolean;
  isShuffled: boolean;
  togglePlay: () => void;
  toggleShuffle: () => void;
  playSingleSong: (song: any) => void;
  startPlayingFromList: (list: any[], startIndex: number) => void;
  toggleLike: (song: any) => void;
  isLiked: (id?: string) => boolean;
  handleContextMenu: (e: React.MouseEvent, song: any) => void;
  setDraggedGlobalSong: (song: any | null) => void;
  openArtistPage: (artist: string, podcastId?: string, feedUrl?: string) => void;
  setAddToPlaylistSong: (song: any) => void;
  setSearchQuery: (q: string) => void;
  setSuggestions: (s: any[]) => void;
  isRecentExpanded: boolean;
  setIsRecentExpanded: (v: boolean) => void;
  isLocalExpanded: boolean;
  setIsLocalExpanded: (v: boolean) => void;
  isIntExpanded: boolean;
  setIsIntExpanded: (v: boolean) => void;
  isIdExpanded: boolean;
  setIsIdExpanded: (v: boolean) => void;
  isJpExpanded: boolean;
  setIsJpExpanded: (v: boolean) => void;
  isKrExpanded: boolean;
  setIsKrExpanded: (v: boolean) => void;
  isLatinExpanded: boolean;
  setIsLatinExpanded: (v: boolean) => void;
  intScrollRef: React.RefObject<HTMLDivElement | null>;
  idScrollRef: React.RefObject<HTMLDivElement | null>;
  jpScrollRef: React.RefObject<HTMLDivElement | null>;
  krScrollRef: React.RefObject<HTMLDivElement | null>;
  latinScrollRef: React.RefObject<HTMLDivElement | null>;
  localScrollRef: React.RefObject<HTMLDivElement | null>;
  recentScrollRef: React.RefObject<HTMLDivElement | null>;
  scrollSlider: (ref: React.RefObject<HTMLDivElement | null>, dir: 'left' | 'right') => void;
  formatTime: (sec: number) => string;
  showToast: (msg: string, type?: any) => void;
  t: (key: any, params?: Record<string, string>) => string;
}

export const HomePage: React.FC<HomePageProps> = ({
  searchResults, getGreeting, language, homeMode, setHomeMode,
  wrappedData, setWrappedStoryIndex, setShowWrappedStory,
  selectedVibeMood, setSelectedVibeMood, madeForYouPlaylists, isMixGeneratingId,
  generateOrGetMixTracks, playMadeForYouPlaylist, regenerateMadeForYouMix,
  openMadeForYouPlaylist, playHistory, setPlayHistory, likedSongs, recommendations,
  hitsInternational, hitsIndonesia, hitsJapan, hitsKorean, hitsLatin, hitsLocal,
  localCountry, topPodcasts, podcastsUs, podcastsId, podcastsJp, podcastsKr, podcastsLatin,
  podcastHeroIndex, currentSong, isPlaying, isShuffled,
  togglePlay, toggleShuffle, playSingleSong, startPlayingFromList, toggleLike, isLiked,
  handleContextMenu, setDraggedGlobalSong, openArtistPage, setAddToPlaylistSong,
  setSearchQuery, setSuggestions, isRecentExpanded, setIsRecentExpanded,
  isLocalExpanded, setIsLocalExpanded, isIntExpanded, setIsIntExpanded,
  isIdExpanded, setIsIdExpanded, isJpExpanded, setIsJpExpanded,
  isKrExpanded, setIsKrExpanded, isLatinExpanded, setIsLatinExpanded,
  intScrollRef, idScrollRef, jpScrollRef, krScrollRef, latinScrollRef, localScrollRef, recentScrollRef,
  scrollSlider, formatTime, showToast, t
}) => (
    <div className="main-scroll">
      {searchResults.length === 0 ? (
        <div className="home-dashboard">

          {/* ── Greeting ─────────────────────────────── */}
          <div className="home-greeting">
            <span className="greeting-text">{getGreeting()}</span>
            <span className="greeting-date">
              {new Date().toLocaleDateString(language === 'en' ? 'en-US' : language === 'ja' ? 'ja-JP' : language === 'ko' ? 'ko-KR' : 'id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* ── Home Mode Toggle ─────────────────────── */}
          <div className="home-mode-toggle">
            <button
              id="home-mode-music-btn"
              className={`home-mode-btn ${homeMode === 'music' ? 'active' : ''}`}
              onClick={() => { setHomeMode('music'); setSearchQuery(''); setSuggestions([]); }}
            >
              <Music size={15} />
              {t('music')}
            </button>
            <button
              id="home-mode-podcast-btn"
              className={`home-mode-btn ${homeMode === 'podcast' ? 'active' : ''}`}
              onClick={() => { setHomeMode('podcast'); setSearchQuery(''); setSuggestions([]); }}
            >
              <Mic2 size={15} />
              {t('podcast')}
            </button>
          </div>

          {/* ── Podcast Mode Content ─────────────────── */}
          {homeMode === 'podcast' && (
            <div className="podcast-home-content">
              {topPodcasts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <Mic2 size={52} style={{ opacity: 0.25 }} />
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{t('loadingPodcasts')}</div>
                  <div style={{ width: '200px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '40%', background: 'var(--accent-primary)', borderRadius: '2px', animation: 'shimmer-bar 1.4s ease-in-out infinite' }} />
                  </div>
                </div>
              ) : (
                <>
                  {/* Podcast Featured Showcase */}
                  {topPodcasts.length >= 1 && (() => {
                    const hero = topPodcasts[podcastHeroIndex] || topPodcasts[0];
                    return (
                      <div className="podcast-showcase-container">
                        <div className="podcast-showcase-hero" onClick={() => openArtistPage(`${hero.artist} ${hero.title}__podcast__`, hero.podcastId || hero.id, hero.feedUrl)} onContextMenu={(e) => handleContextMenu(e, hero)}>
                          <div className="podcast-showcase-bg" style={{ backgroundImage: `url(${hero.thumbnail})` }} />
                          <div className="podcast-showcase-content">
                            <img src={hero.thumbnail} alt={hero.title} className="podcast-showcase-art" />
                            <div className="podcast-showcase-info">
                              <div className="podcast-showcase-badge">🎙️ {t('podcast')}</div>
                              <h2 className="podcast-showcase-title">{hero.title}</h2>
                              <p className="podcast-showcase-author">{hero.artist}</p>
                              <div className="podcast-showcase-actions">
                                <button className="showcase-episodes" onClick={(e) => { e.stopPropagation(); openArtistPage(`${hero.artist} ${hero.title}__podcast__`, hero.podcastId || hero.id, hero.feedUrl); }}>
                                  <ListMusic size={18} /> Episodes
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Podcast Grids */}
                  {(() => {
                    const renderPodcastGrid = (title: string, items: any[], icon: string | React.ReactNode) => {
                      if (!items || items.length === 0) return null;
                      return (
                        <section className="home-section">
                          <div className="section-header-v2">
                            <div className="section-header-left">
                              {typeof icon === 'string' && icon.startsWith('http') ? (
                                <img src={icon} alt="" style={{ width: '24px', height: '16px', objectFit: 'cover', borderRadius: '3px' }} />
                              ) : (
                                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>{icon}</span>
                              )}
                              <h2 className="section-title-v2">{title}</h2>
                            </div>
                          </div>
                          <div className="podcast-grid-container">
                            {items.map((item, i) => (
                              <div
                                key={i}
                                className={`podcast-card ${currentSong?.id === item.id ? 'podcast-card-playing' : ''}`}
                                onClick={() => openArtistPage(`${item.artist} ${item.title}__podcast__`, item.podcastId || item.id, item.feedUrl)}
                                onContextMenu={(e) => handleContextMenu(e, item)}
                              >
                                <div className="podcast-card-art">
                                  <img src={item.thumbnail} alt={item.title} />
                                  {currentSong?.id === item.id && isPlaying && (
                                    <div className="card-v2-eq">
                                      <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                                    </div>
                                  )}
                                </div>
                                <div className="podcast-card-info">
                                  <div className="podcast-card-genre">{item.genre}</div>
                                  <div className="podcast-card-title" title={item.title}>{item.title}</div>
                                  <div className="podcast-card-host">{item.artist}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    };

                    return (
                      <>
                        {renderPodcastGrid(t('topPodcasts') + " (Global)", podcastsUs, <Globe size={20} />)}
                        {renderPodcastGrid(t('topPodcasts') + " (Indonesia)", podcastsId, 'https://flagcdn.com/w40/id.png')}
                        {renderPodcastGrid(t('topPodcasts') + " (Japan)", podcastsJp, 'https://flagcdn.com/w40/jp.png')}
                        {renderPodcastGrid(t('topPodcasts') + " (Korea)", podcastsKr, 'https://flagcdn.com/w40/kr.png')}
                        {renderPodcastGrid(t('topPodcasts') + " (Latin)", podcastsLatin, 'https://flagcdn.com/w40/mx.png')}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* ── Music Mode: Bento + Sections ─────────── */}
          {homeMode === 'music' && (<>

            {/* ── Wrapped Dashboard Hero ──────── */}
            {wrappedData && wrappedData.historyCount > 0 && (new Date().getDate() <= 7 || localStorage.getItem('force_wrapped_visible') === 'true') && (
              <div className="wrapped-editorial-hero">
                 {wrappedData?.topSongs && wrappedData.topSongs.length > 0 && (
                    <div className="editorial-bg-collage">
                       {Array.from({ length: 32 }).map((_, idx) => {
                          const songData = wrappedData.topSongs[idx % wrappedData.topSongs.length].song;
                          return (
                             <div 
                                key={idx} 
                                className="editorial-collage-item" 
                                style={{ backgroundImage: `url(${getCleanThumbnail(songData.thumbnail) || getHighResImage(songData.cover)})` }}
                             />
                          );
                       })}
                    </div>
                 )}
                 <h2 className="editorial-title">Your <span className="editorial-title-accent">Wrapped</span></h2>
                 <p className="editorial-sentence">
                    {t('wrappedEditorialP1')}<span className="ed-highlight">{Math.floor(wrappedData.totalListenSeconds / 60)} {t('listeningTimeMins')}</span>{t('wrappedEditorialP2')}
                    <span className="ed-highlight">{wrappedData.topMood ? t(`mood${wrappedData.topMood.charAt(0).toUpperCase() + wrappedData.topMood.slice(1)}` as any) : '-'}</span>
                    {t('wrappedEditorialP3')}<span className="ed-highlight">{wrappedData.historyCount}</span>{t('wrappedEditorialP4')}
                 </p>
                 <div className="editorial-actions">
                    <button className="editorial-btn-primary" onClick={() => {
                        if (wrappedData?.topSongs) {
                            const playlistSongs = wrappedData.topSongs.map((item: any) => item.song);
                            startPlayingFromList(playlistSongs, 0);
                        }
                    }}>
                       <Play size={18} fill="currentColor" /> {t('playYourTopSongs')}
                    </button>
                    <button className="editorial-btn-secondary" onClick={() => {
                        setWrappedStoryIndex(0);
                        setShowWrappedStory(true);
                    }}>
                       <Maximize2 size={18} /> {t('viewYourStory')}
                    </button>
                 </div>
              </div>
            )}

            {/* ── Desktop Editorial "Dibuat Untuk Kamu" (Personalized Mixes) ── */}
            {FEATURE_FLAGS.ENABLE_PLAYLIST_MIX && (
            <section className="home-section mfy-shelf-container" id="made-for-you-shelf">
              {/* Honest, Clear Header */}
              <div className="section-header-v2" style={{ flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <div className="section-header-left">
                  <span className="mfy-header-icon" style={{ display: 'flex', alignItems: 'center' }}><Sparkles size={20} /></span>
                  <div>
                    <h2 className="section-title-v2" style={{ margin: 0 }}>{t('madeForYou')}</h2>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {t('madeForYouDesc')}
                    </div>
                  </div>
                </div>

                {/* Tactile Mood Filter Tabs */}
                <div className="mfy-mood-tabs" role="tablist" aria-label="Pilih Mood">
                  {([
                    { id: 'chill', labelKey: 'vibeMoodChill' },
                    { id: 'happy', labelKey: 'vibeMoodHappy' },
                    { id: 'energetic', labelKey: 'vibeMoodEnergetic' },
                    { id: 'sad', labelKey: 'vibeMoodSad' }
                  ] as { id: VibeType; labelKey: any }[]).map(item => {
                    const isSelected = selectedVibeMood === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`mfy-mood-tab-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedVibeMood(item.id);
                          localStorage.setItem('donpollo_current_vibe', item.id);
                          const targetPl = madeForYouPlaylists.find(p => p.id === `vibe_temp_${item.id}`);
                          if (targetPl && (!targetPl.songs || targetPl.songs.length === 0)) {
                            generateOrGetMixTracks(targetPl);
                          }
                        }}
                      >
                        {renderMixIcon(VIBE_CONFIGS[item.id]?.iconName, 13)}
                        <span>{t(item.labelKey)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Asymmetric Split Layout: Left Spotlight (Active Mood Mix) + Right Companions */}
              {(() => {
                const currentVibePl = madeForYouPlaylists.find(p => p.id === `vibe_temp_${selectedVibeMood}`) || DEFAULT_MADE_FOR_YOU_PLAYLISTS.find(p => p.id === `vibe_temp_${selectedVibeMood}`)!;
                const discoverWeeklyPl = madeForYouPlaylists.find(p => p.id === 'temp_mix_discover_weekly') || DEFAULT_MADE_FOR_YOU_PLAYLISTS.find(p => p.id === 'temp_mix_discover_weekly')!;
                const dailyMixPl = madeForYouPlaylists.find(p => p.id === 'temp_mix_daily') || DEFAULT_MADE_FOR_YOU_PLAYLISTS.find(p => p.id === 'temp_mix_daily')!;
                const releaseRadarPl = madeForYouPlaylists.find(p => p.id === 'temp_mix_release_radar') || DEFAULT_MADE_FOR_YOU_PLAYLISTS.find(p => p.id === 'temp_mix_release_radar')!;

                const isVibeGenerating = isMixGeneratingId === currentVibePl?.id;
                const vibeSongs = currentVibePl?.songs || [];
                const vibeCover = getMixPlaylistCover(currentVibePl, {
                  id: currentVibePl?.id || `vibe_temp_${selectedVibeMood}`,
                  name: currentVibePl?.name || 'Mood Mix',
                  mixType: currentVibePl?.mixType || 'vibe_mix',
                  mood: selectedVibeMood,
                  songs: vibeSongs,
                  playHistory,
                  likedSongs
                });

                const formatSec = (sec?: number) => {
                  if (!sec || isNaN(sec)) return '';
                  const m = Math.floor(sec / 60);
                  const s = Math.floor(sec % 60);
                  return `${m}:${s < 10 ? '0' : ''}${s}`;
                };

                const companionList = [
                  {
                    pl: discoverWeeklyPl,
                    title: t('discoverWeekly'),
                    desc: t('discoverWeeklyDesc'),
                    badge: t('weeklyUpdateBadge')
                  },
                  {
                    pl: dailyMixPl,
                    title: t('dailyMixTitle'),
                    desc: t('dailyMixDesc'),
                    badge: t('dailyUpdateBadge')
                  },
                  {
                    pl: releaseRadarPl,
                    title: t('releaseRadar'),
                    desc: t('releaseRadarDesc'),
                    badge: t('newReleaseBadge')
                  }
                ];

                return (
                  <div className="mfy-split-layout">
                    {/* LEFT: Spotlight Card with Direct Song Preview & Play */}
                    <div className="mfy-spotlight-card">
                      <div className="mfy-spotlight-top">
                        {vibeCover ? (
                          <img src={vibeCover} alt={currentVibePl?.name || 'Vibe Mix'} className="mfy-spotlight-cover" />
                        ) : (
                          <div
                            className="mfy-spotlight-cover"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-muted)'
                            }}
                          >
                            <Music size={32} />
                          </div>
                        )}

                        <div className="mfy-spotlight-meta">
                          <div>
                            <span className="mfy-spotlight-badge">{t('mixMoodSelected')}</span>
                            <h3 className="mfy-spotlight-title">
                              {VIBE_CONFIGS[selectedVibeMood]?.labelKey
                                ? `${t(VIBE_CONFIGS[selectedVibeMood].labelKey as any)} Mix`
                                : (currentVibePl?.name || 'Mood Mix')}
                            </h3>
                            <p className="mfy-spotlight-desc">
                              {t(VIBE_CONFIGS[selectedVibeMood]?.descriptionKey as any) || currentVibePl?.description}
                            </p>
                          </div>

                          <div className="mfy-spotlight-actions">
                            <button
                              type="button"
                              className="mfy-btn-play-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (currentVibePl) playMadeForYouPlaylist(currentVibePl, e);
                              }}
                              title={t('playAll')}
                            >
                              {isVibeGenerating ? (
                                <Loader2 size={15} className="spinner" />
                              ) : (
                                <Play size={15} fill="currentColor" />
                              )}
                              <span>{t('btnPlay')} ({vibeSongs.length > 0 ? `${vibeSongs.length} ${t('songs')}` : 'Mix'})</span>
                            </button>

                            <button
                              type="button"
                              className="mfy-btn-secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (currentVibePl) regenerateMadeForYouMix(currentVibePl.id);
                              }}
                              title={t('remixVibeTooltip')}
                            >
                              <RefreshCw size={13} className={isVibeGenerating ? 'spinner' : ''} />
                              <span>{t('remixVibe')}</span>
                            </button>

                            <button
                              type="button"
                              className="mfy-btn-secondary"
                              onClick={() => {
                                if (currentVibePl) openMadeForYouPlaylist(currentVibePl);
                              }}
                              title={t('openMixTooltip')}
                            >
                              <span>{t('openMix')}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Song Preview Rows */}
                      <div className="mfy-tracklist-preview">
                        <div className="mfy-tracklist-header">
                          <span>{t('tracklistPreview')}</span>
                          <span>{vibeSongs.length > 0 ? t('mixSongsCount').replace('{0}', String(vibeSongs.length)) : ''}</span>
                        </div>

                        {vibeSongs.length === 0 ? (
                          <div className="mfy-tracklist-empty">
                            {isVibeGenerating ? t('loadingMixRecommendation') : t('emptyMixPrompt')}
                          </div>
                        ) : (
                          vibeSongs.slice(0, 3).map((rawSong: any, sIdx: number) => {
                            const song = formatTrackLikeSpotify(rawSong) || rawSong;
                            const isThisPlaying = currentSong?.id === song.id && isPlaying;
                            return (
                              <div
                                key={song.id || sIdx}
                                className={`mfy-track-row ${currentSong?.id === song.id ? 'is-active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startPlayingFromList(vibeSongs, sIdx);
                                }}
                                title={`Putar ${song.title} - ${song.artist}`}
                              >
                                <div className="mfy-track-left">
                                  <span className="mfy-track-num">
                                    {isThisPlaying ? '▶' : sIdx + 1}
                                  </span>
                                  <div className="mfy-track-info">
                                    <span className="mfy-track-title">{song.title}</span>
                                    <span className="mfy-track-artist">{song.artist}</span>
                                  </div>
                                </div>
                                {song.duration ? (
                                  <span className="mfy-track-duration">{formatSec(song.duration)}</span>
                                ) : null}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* RIGHT: Companion Algorithmic Mixes (Discover, Daily, Release) */}
                    <div className="mfy-companion-list">
                      {companionList.map(({ pl, title, desc, badge }) => {
                        if (!pl) return null;
                        const hasSongs = pl.songs && pl.songs.length > 0;
                        const isGenerating = isMixGeneratingId === pl.id;
                        const cover = getMixPlaylistCover(pl, {
                          songs: pl.songs,
                          playHistory,
                          likedSongs
                        });

                        const artistPreview = (() => {
                          const andMore = t('andOthers') || 'dan lainnya';
                          if (hasSongs) {
                            const artList = Array.from(new Set(pl.songs.map((s: any) => s.artist).filter(Boolean))).slice(0, 3);
                            if (artList.length > 0) return artList.join(', ') + `, ${andMore}`;
                          }
                          const userTop = extractTopArtists(playHistory, likedSongs, 3);
                          if (userTop.length > 0) return userTop.join(', ') + `, ${andMore}`;
                          return desc;
                        })();

                        return (
                          <div
                            key={pl.id}
                            className="mfy-companion-card"
                            onClick={() => openMadeForYouPlaylist(pl)}
                            title={`${t('openMix')} ${title}`}
                          >
                            <div className="mfy-companion-left">
                              {cover ? (
                                <img src={cover} alt={title} className="mfy-companion-thumb" />
                              ) : (
                                <div className="mfy-companion-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                  <Music size={20} />
                                </div>
                              )}
                              <div className="mfy-companion-meta">
                                <div className="mfy-companion-title">{title}</div>
                                <div className="mfy-companion-desc" title={artistPreview}>
                                  {artistPreview}
                                </div>
                                <div className="mfy-companion-note">
                                  {badge} • {hasSongs ? `${pl.songs.length} ${t('songs')}` : t('readyToPlay')}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="mfy-companion-play-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                playMadeForYouPlaylist(pl, e);
                              }}
                              title={`${t('btnPlay')} ${title}`}
                            >
                              {isGenerating ? (
                                <Loader2 size={16} className="spinner" />
                              ) : (
                                <Play size={16} fill="currentColor" style={{ marginLeft: '1px' }} />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </section>
            )}

            {/* ── Daily Mix & Highlights (Desktop Editorial) ──────── */}
            {FEATURE_FLAGS.ENABLE_DAILY_MIX_SHELF && (() => {
              const getDailyMix = () => {
                const mix: any[] = [];
                const isDuplicate = (s: any) => {
                  if (!s || !s.title) return true;
                  const base = cleanBaseSongTitle(s.title);
                  return mix.some(m => m.id === s.id || (base && cleanBaseSongTitle(m.title) === base));
                };

                // 1. HERO SPOTLIGHT:
                // If a song is currently playing, suggest the previous track from history rather than repeating the current song!
                const prevSessionTrack = playHistory.find(s => s && s.id !== currentSong?.id && !isUnwantedTrackVariant(s.title, s.artist));
                const heroCandidate = prevSessionTrack || playHistory[0] || hitsInternational[0];

                if (heroCandidate) {
                  const isFromHistory = playHistory.some(s => s.id === heroCandidate.id);
                  mix.push({ ...heroCandidate, bentoTag: isFromHistory ? 'JUMP BACK IN' : 'TOP PICK' });
                }

                // 2. FAVORITE (from liked songs):
                const favs = likedSongs.filter(s => !isDuplicate(s) && !isUnwantedTrackVariant(s.title, s.artist)).slice(0, 1);
                favs.forEach(s => mix.push({ ...s, bentoTag: 'FAVORITE' }));

                // 3. SUGGESTED (from recommendations or curated hits):
                const recPool = recommendations.length > 0 ? recommendations : hitsInternational.slice(1);
                const usableRecs = recPool.filter(s => !isDuplicate(s) && !isUnwantedTrackVariant(s.title, s.artist)).slice(0, 1);
                usableRecs.forEach(s => mix.push({ ...s, bentoTag: 'SUGGESTED' }));

                // 4. TRENDING (from international hits):
                const trendingPool = hitsInternational.filter(s => !isDuplicate(s) && !isUnwantedTrackVariant(s.title, s.artist)).slice(0, 1);
                trendingPool.forEach(s => mix.push({ ...s, bentoTag: 'TRENDING' }));

                // 5. RECENTLY PLAYED (from history, if not already used as hero):
                const recentPool = playHistory.filter(s => !isDuplicate(s) && !isUnwantedTrackVariant(s.title, s.artist)).slice(0, 1);
                recentPool.forEach(s => mix.push({ ...s, bentoTag: 'RECENTLY PLAYED' }));

                // 6. Fill any remaining slots up to 6 with diverse unique tracks
                const fallbackPool = [...hitsInternational, ...likedSongs, ...recommendations, ...playHistory]
                  .filter(s => !isDuplicate(s) && !isUnwantedTrackVariant(s.title, s.artist));
                while (mix.length < 6 && fallbackPool.length > 0) {
                  const candidate = fallbackPool.shift();
                  if (candidate && !isDuplicate(candidate)) {
                    mix.push({ ...candidate, bentoTag: 'TOP PICK' });
                  }
                }

                return mix;
              };

              const rawMix = getDailyMix();
              if (rawMix.length === 0) return null;

              const getTagLabel = (tag: string) => {
                switch (tag) {
                  case 'JUMP BACK IN': return t('tagJumpBackIn');
                  case 'TOP PICK': return t('tagTopPick');
                  case 'FAVORITE': return t('tagFavorite');
                  case 'SUGGESTED': return t('tagSuggested');
                  case 'RECENTLY PLAYED': return t('tagRecentlyPlayed');
                  case 'TRENDING': return t('tagTrending');
                  default: return tag;
                }
              };

              const dailyMix = rawMix.map(item => {
                const formatted = formatTrackLikeSpotify(item);
                return {
                  ...item,
                  title: formatted?.title || item.title,
                  artist: formatted?.artist || item.artist,
                  thumbnail: formatted?.thumbnail || item.thumbnail,
                  cover: formatted?.cover || item.cover,
                  tagLabel: getTagLabel(item.bentoTag)
                };
              });

              return (
                <section className="home-section daily-shelf-container">
                  <div className="section-header-v2" style={{ marginBottom: '12px', justifyContent: 'space-between' }}>
                    <div className="section-header-left">
                      <span className="daily-header-icon" style={{ display: 'flex', alignItems: 'center' }}>
                        <Headphones size={20} />
                      </span>
                      <div>
                        <h2 className="section-title-v2" style={{ margin: 0 }}>{t('dailyMixShelfTitle')}</h2>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {t('dailyMixShelfDesc')}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mfy-btn-secondary"
                      onClick={() => startPlayingFromList(dailyMix, 0)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Play size={12} fill="currentColor" />
                      <span>{t('playAll')}</span>
                    </button>
                  </div>

                  <div className="daily-highlights-grid">
                    {dailyMix.slice(0, 6).map((item, i) => {
                      const isCurrentPlaying = currentSong?.id === item.id && isPlaying;
                      const isCurrentActive = currentSong?.id === item.id;
                      const isLiked = likedSongs.some(s => s.id === item.id);
                      const imgUrl = getCleanThumbnail(item.thumbnail) || getHighResImage(item.cover);

                      return (
                        <div
                          key={item.id || i}
                          className={`daily-quick-tile ${isCurrentActive ? 'is-active' : ''}`}
                          onClick={() => {
                            if (isCurrentActive) togglePlay();
                            else playSingleSong(item);
                          }}
                          onContextMenu={(e) => handleContextMenu(e, item)}
                          draggable={true}
                          onDragStart={(e) => { setDraggedGlobalSong(item); applyDragGhost(e, item); }}
                          onDragEnd={(e) => { setDraggedGlobalSong(null); (e.currentTarget as HTMLElement).classList.remove('dragging-origin'); }}
                        >
                          <div className="daily-quick-bg" style={{ backgroundImage: `url(${imgUrl})` }} />
                          <div className="daily-quick-thumb-wrap">
                            <img src={imgUrl} alt={item.title} className="daily-quick-thumb" />
                          </div>

                          <div className="daily-quick-meta">
                            <span className="daily-quick-tag">{item.tagLabel}</span>
                            <div className="daily-quick-title" title={item.title}>{item.title}</div>
                            <div className="daily-quick-artist" title={item.artist}>{item.artist}</div>
                          </div>

                          <div className="daily-quick-actions">
                            {isCurrentPlaying && (
                              <div className="daily-eq-mini">
                                <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                              </div>
                            )}
                            <button
                              type="button"
                              className={`daily-quick-like ${isLiked ? 'liked' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLike(item);
                              }}
                              title={isLiked ? t('unlikeSong') : t('likeSong')}
                            >
                              <Heart
                                size={14}
                                fill={isLiked ? 'var(--accent-primary, #3b82f6)' : 'none'}
                                color={isLiked ? 'var(--accent-primary, #3b82f6)' : 'var(--text-secondary)'}
                              />
                            </button>
                            <button
                              type="button"
                              className="daily-quick-play"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isCurrentActive) togglePlay();
                                else playSingleSong(item);
                              }}
                              title={isCurrentPlaying ? t('btnPause') : `${t('btnPlay')} ${item.title}`}
                            >
                              {isCurrentPlaying ? (
                                <Pause size={15} fill="currentColor" />
                              ) : (
                                <Play size={15} fill="currentColor" style={{ marginLeft: '2px' }} />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })()}

            {/* ── Recently Played ──────────────────────── */}
            {playHistory.length > 0 && (
              <section className="home-section" id="recently-played-shelf">
                <div className="section-header-v2" style={{ marginBottom: '14px' }}>
                  <div className="section-header-left">
                    <span className="recent-header-icon" style={{ display: 'flex', alignItems: 'center' }}>
                      <Clock size={20} />
                    </span>
                    <div>
                      <h2 className="section-title-v2" style={{ margin: 0 }}>{t('recentlyPlayed')}</h2>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {playHistory.length} {t('songs')}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span
                      className="show-all"
                      style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}
                      onClick={() => {
                        setPlayHistory([]);
                        showToast(t('toastHistoryCleared'), 'success');
                      }}
                      title={t('clearHistory')}
                    >
                      {t('clearHistory')}
                    </span>
                    <span className="show-all" onClick={() => setIsRecentExpanded(!isRecentExpanded)}>
                      {isRecentExpanded ? t('showLess') : t('viewAll')}
                    </span>
                  </div>
                </div>

                {isRecentExpanded ? (
                  <div className="card-expanded-grid">
                    {playHistory.map((item, i) => {
                      const isThisPlaying = currentSong?.id === item.id && isPlaying;
                      const isThisCurrent = currentSong?.id === item.id;
                      return (
                        <div
                          key={item.id || i}
                          className={`music-card-v2 ${isThisCurrent ? 'music-card-v2-playing' : ''}`}
                          onClick={() => {
                            if (isThisCurrent) togglePlay();
                            else playSingleSong(item);
                          }}
                          onContextMenu={(e) => handleContextMenu(e, item)}
                          draggable={true}
                          onDragStart={(e) => { setDraggedGlobalSong(item); applyDragGhost(e, item); }}
                          onDragEnd={(e) => { setDraggedGlobalSong(null); (e.currentTarget as HTMLElement).classList.remove('dragging-origin'); }}
                          title={isThisPlaying ? t('btnPause') : `${t('btnPlay')} ${item.title}`}
                        >
                          <div className="card-v2-art">
                            <img src={(getCleanThumbnail(item.thumbnail) || getHighResImage(item.cover))} alt={item.title} loading="lazy" />
                            {isThisPlaying && (
                              <div className="card-v2-eq">
                                <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                              </div>
                            )}
                            <button
                              type="button"
                              className={`card-v2-play-btn ${isThisCurrent ? 'is-active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isThisCurrent) togglePlay();
                                else playSingleSong(item);
                              }}
                              title={isThisPlaying ? t('btnPause') : t('playSongBtn')}
                            >
                              {isThisPlaying ? (
                                <Pause size={18} fill="currentColor" />
                              ) : (
                                <Play size={18} fill="currentColor" style={{ marginLeft: '1px' }} />
                              )}
                            </button>
                          </div>
                          <div className="card-v2-info">
                            <div className="card-v2-title" title={item.title}>{item.title}</div>
                            <div className="card-v2-artist" title={item.artist}>{item.artist}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="slider-wrapper">
                    <button className="slider-nav-btn slider-nav-left" onClick={() => scrollSlider(recentScrollRef, 'left')} aria-label="Scroll left">
                      <ChevronLeft size={20} />
                    </button>
                    <div className="card-scroll-container" ref={recentScrollRef}>
                      {playHistory.map((item, i) => {
                        const isThisPlaying = currentSong?.id === item.id && isPlaying;
                        const isThisCurrent = currentSong?.id === item.id;
                        return (
                          <div
                            key={item.id || i}
                            className={`music-card-v2 ${isThisCurrent ? 'music-card-v2-playing' : ''}`}
                            onClick={() => {
                              if (isThisCurrent) togglePlay();
                              else playSingleSong(item);
                            }}
                            onContextMenu={(e) => handleContextMenu(e, item)}
                            draggable={true}
                            onDragStart={(e) => { setDraggedGlobalSong(item); applyDragGhost(e, item); }}
                            onDragEnd={(e) => { setDraggedGlobalSong(null); (e.currentTarget as HTMLElement).classList.remove('dragging-origin'); }}
                            title={isThisPlaying ? t('btnPause') : `${t('btnPlay')} ${item.title}`}
                          >
                            <div className="card-v2-art">
                              <img src={(getCleanThumbnail(item.thumbnail) || getHighResImage(item.cover))} alt={item.title} loading="lazy" />
                              {isThisPlaying && (
                                <div className="card-v2-eq">
                                  <div className="eq-bar" /><div className="eq-bar" /><div className="eq-bar" />
                                </div>
                              )}
                              <button
                                type="button"
                                className={`card-v2-play-btn ${isThisCurrent ? 'is-active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isThisCurrent) togglePlay();
                                  else playSingleSong(item);
                                }}
                                title={isThisPlaying ? t('btnPause') : t('playSongBtn')}
                              >
                                {isThisPlaying ? (
                                  <Pause size={18} fill="currentColor" />
                                ) : (
                                  <Play size={18} fill="currentColor" style={{ marginLeft: '1px' }} />
                                )}
                              </button>
                            </div>
                            <div className="card-v2-info">
                              <div className="card-v2-title" title={item.title}>{item.title}</div>
                              <div className="card-v2-artist" title={item.artist}>{item.artist}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button className="slider-nav-btn slider-nav-right" onClick={() => scrollSlider(recentScrollRef, 'right')} aria-label="Scroll right">
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </section>
            )}



            {/* ── Hits Sections ───────────── */}
            {(() => {
              const renderHitsSection = (title: string, songs: any[], ref: React.RefObject<HTMLDivElement | null>, icon: string | React.ReactNode, isExpanded: boolean, setIsExpanded: (val: boolean) => void) => {
                if (songs.length === 0) return null;
                return (
                  <section className="home-section">
                    <div className="section-header-v2">
                      <div className="section-header-left">
                        {typeof icon === 'string' && icon.startsWith('http') ? (
                          <img src={icon} alt="" style={{ width: '24px', height: '16px', objectFit: 'cover', borderRadius: '3px' }} />
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>{icon}</span>
                        )}
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
                          <div key={i} className={`music-card-v2 ${currentSong?.id === item.id ? 'music-card-v2-playing' : ''}`} onClick={() => playSingleSong(item)} onContextMenu={(e) => handleContextMenu(e, item)} draggable={true} onDragStart={(e) => { setDraggedGlobalSong(item); applyDragGhost(e, item); }} onDragEnd={(e) => { setDraggedGlobalSong(null); (e.currentTarget as HTMLElement).classList.remove('dragging-origin'); }}>
                            <div className="card-v2-art">
                              <img src={(getCleanThumbnail(item.thumbnail) || getHighResImage(item.cover))} alt={item.title} />
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
                            <div key={i} className={`music-card-v2 ${currentSong?.id === item.id ? 'music-card-v2-playing' : ''}`} onClick={() => playSingleSong(item)} onContextMenu={(e) => handleContextMenu(e, item)} draggable={true} onDragStart={(e) => { setDraggedGlobalSong(item); applyDragGhost(e, item); }} onDragEnd={(e) => { setDraggedGlobalSong(null); (e.currentTarget as HTMLElement).classList.remove('dragging-origin'); }}>
                              <div className="card-v2-art">
                                <img src={(getCleanThumbnail(item.thumbnail) || getHighResImage(item.cover))} alt={item.title} />
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
                    renderHitsSection(`${t('trendingLocal')} ${localCountry.name}`, hitsLocal, localScrollRef, `https://flagcdn.com/w40/${localCountry.code.toLowerCase()}.png`, isLocalExpanded, setIsLocalExpanded)}
                  {renderHitsSection(t('hitsInt'), hitsInternational, intScrollRef, <Globe size={20} />, isIntExpanded, setIsIntExpanded)}
                  {renderHitsSection(t('hitsId'), hitsIndonesia, idScrollRef, 'https://flagcdn.com/w40/id.png', isIdExpanded, setIsIdExpanded)}
                  {renderHitsSection(t('hitsJp'), hitsJapan, jpScrollRef, 'https://flagcdn.com/w40/jp.png', isJpExpanded, setIsJpExpanded)}
                  {renderHitsSection(t('hitsKr'), hitsKorean, krScrollRef, 'https://flagcdn.com/w40/kr.png', isKrExpanded, setIsKrExpanded)}
                  {renderHitsSection(t('hitsLatin'), hitsLatin, latinScrollRef, 'https://flagcdn.com/w40/mx.png', isLatinExpanded, setIsLatinExpanded)}
                </>
              );
            })()}
          </>)}

        </div>
      ) : (
        <>
          <div className="hero-section">
            <div className="hero-art-container">
              <div className="hero-glow"></div>
              {currentSong ? (
                <img src={(getCleanThumbnail(currentSong.thumbnail) || getHighResImage(currentSong.cover))} className="hero-art" alt="album art" />
              ) : searchResults.length > 0 ? (
                <img src={(getCleanThumbnail(currentSong.thumbnail) || getHighResImage(currentSong.cover))} className="hero-art" alt="album art" />
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
                <div key={idx} className={`tracklist-item ${currentSong?.id === song.id ? 'playing' : ''}`} onClick={() => playSingleSong(song)} onContextMenu={(e) => handleContextMenu(e, song)}
                  draggable={true}
                  onDragStart={(e) => { setDraggedGlobalSong(song); applyDragGhost(e, song); }}
                  onDragEnd={(e) => { setDraggedGlobalSong(null); (e.currentTarget as HTMLElement).classList.remove('dragging-origin'); }}
                >
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
