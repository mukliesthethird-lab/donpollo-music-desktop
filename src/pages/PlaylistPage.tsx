import React from 'react';
import {
  ListMusic, Play, Users, Share2, Download, DownloadCloud, FolderPlus,
  RefreshCw, Loader2, Heart, Plus, Trash2, Check, Music, FileText, Film
} from 'lucide-react';
import { getAudioBadge, formatTrackLikeSpotify, deduplicateTracks } from '../utils/audioRanking';
import { VIBE_CONFIGS, type VibeType } from '../utils/vibeRecommendation';
import { getMixPlaylistCover, isMixPlaylist } from '../utils/spotifyMixCover';
import { getCleanThumbnail, getHighResImage, applyDragGhost, type Playlist, type DiscordUser, type Page } from '../utils/mediaHelpers';

interface PlaylistPageProps {
  activePage: Page;
  activePlaylistId: string | null;
  playlists: Playlist[];
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  madeForYouPlaylists: Playlist[];
  profilePlaylists?: Playlist[];
  discordUser: DiscordUser | null;
  settings: any;
  playHistory: any[];
  likedSongs: any[];
  downloadedSongs: any[];
  savedPlaylists: string[];
  activeDownloads: Record<string, any>;
  currentSong: any;
  isEditingPlaylistName: boolean;
  setIsEditingPlaylistName: (val: boolean) => void;
  editPlaylistNameValue: string;
  setEditPlaylistNameValue: (val: string) => void;
  handleEditPlaylistName: (id: string) => void;
  setShowAvatarPrompt: (val: boolean) => void;
  setAvatarUrlInput: (val: string) => void;
  setShowCreatePlaylist: (val: boolean) => void;
  setShowImportPlaylist: (val: boolean) => void;
  setShowCollabModal: (val: boolean) => void;
  setCollabPlaylistId: (val: string | null) => void;
  setShareCodeResult: (val: { code: string; expiresAt: string } | null) => void;
  setPlaylistToDelete: (id: string | null) => void;
  setPlaylistToRemove: (id: string | null) => void;
  setActivePage: (page: Page) => void;
  setActiveProfileId: (id: string | null) => void;
  navigate: (page: Page, opts?: any) => void;
  getDefaultDiscordAvatar: (id?: string, name?: string) => string;
  handleAvatarError: (e: any, userId?: string | null, username?: string) => void;
  startPlayingFromList: (list: any[], startIndex: number) => void;
  playSingleSong: (song: any) => void;
  handleContextMenu: (e: React.MouseEvent, song: any) => void;
  setContextMenu: (val: any) => void;
  draggedGlobalSong: any;
  setDraggedGlobalSong: (song: any | null) => void;
  draggedPlaylistSongIdx: number | null;
  setDraggedPlaylistSongIdx: (idx: number | null) => void;
  dragOverPlaylistSongIdx: number | null;
  setDragOverPlaylistSongIdx: (idx: number | null) => void;
  isMixGeneratingId: string | null;
  regenerateMadeForYouMix: (id: string) => void;
  toggleLike: (song: any) => void;
  isLiked: (id?: string) => boolean;
  addSongToPlaylist: (plId: string, song: any, silent?: boolean) => void;
  removeSongFromPlaylist: (playlistId: string, songToRemove: any, index?: number) => Promise<void> | void;
  formatTime: (sec: number) => string;
  showToast: (msg: string, type?: any) => void;
  playlistSearchQuery: string;
  setPlaylistSearchQuery: (q: string) => void;
  playlistSearchResults: any[];
  isPlaylistSearching: boolean;
  handlePlaylistSearch: (e: React.FormEvent) => Promise<void>;
  setPlaylistContextMenu: (val: any) => void;
  API_BASE_URL: string;
  t: (key: any, params?: Record<string, string>) => string;
}

export const PlaylistPage: React.FC<PlaylistPageProps> = ({
  activePage, activePlaylistId, playlists, setPlaylists, madeForYouPlaylists, profilePlaylists = [],
  discordUser, settings, playHistory, likedSongs, downloadedSongs, savedPlaylists,
  activeDownloads, currentSong, isEditingPlaylistName, setIsEditingPlaylistName,
  editPlaylistNameValue, setEditPlaylistNameValue, handleEditPlaylistName,
  setShowAvatarPrompt, setAvatarUrlInput, setShowCreatePlaylist, setShowImportPlaylist,
  setShowCollabModal, setCollabPlaylistId, setShareCodeResult, setPlaylistToDelete,
  setPlaylistToRemove, setActivePage, setActiveProfileId, navigate,
  getDefaultDiscordAvatar, handleAvatarError, startPlayingFromList, playSingleSong,
  handleContextMenu, setContextMenu, draggedGlobalSong, setDraggedGlobalSong,
  draggedPlaylistSongIdx, setDraggedPlaylistSongIdx, dragOverPlaylistSongIdx,
  setDragOverPlaylistSongIdx, isMixGeneratingId, regenerateMadeForYouMix,
  toggleLike, isLiked, addSongToPlaylist, removeSongFromPlaylist, formatTime,
  showToast, playlistSearchQuery, setPlaylistSearchQuery, playlistSearchResults,
  isPlaylistSearching, handlePlaylistSearch, setPlaylistContextMenu, API_BASE_URL, t
}) => {
    if (activePage === 'playlist-detail' && activePlaylistId) {
      const pl =
        playlists.find(p => p.id === activePlaylistId) ||
        madeForYouPlaylists.find(p => p.id === activePlaylistId) ||
        profilePlaylists.find(p => p.id === activePlaylistId);
      if (!pl) return null;
      const isMyPlaylist = (!pl.discordId || pl.discordId === discordUser?.id) && !(pl as any).isTemporary;
      const isCollaborator = pl.collaborators?.includes(discordUser?.id || '') || false;
      const canEditSongs = (isMyPlaylist || isCollaborator) && !(pl as any).isTemporary;
      const isAlgorithmic = Boolean((pl as any).isTemporary || pl.id.startsWith('temp_') || pl.id.startsWith('vibe_temp_'));
      const effectiveSongs = isAlgorithmic
        ? deduplicateTracks(pl.songs.map((s: any) => formatTrackLikeSpotify(s)), 3)
        : pl.songs;
      return (
        <div className="page-content">
          <div className="page-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', minWidth: 0, width: '100%' }}>
              <div
                className="playlist-avatar-large"
                style={{ width: '120px', height: '120px', flexShrink: 0, borderRadius: '8px', backgroundColor: 'var(--surface-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: isMyPlaylist ? 'pointer' : 'default', position: 'relative' }}
                onClick={() => { if (isMyPlaylist) { setAvatarUrlInput(pl.avatar || ''); setShowAvatarPrompt(true); } }}
              >
                {isMixPlaylist(pl) ? (
                  <img
                    src={getMixPlaylistCover(pl, { songs: effectiveSongs, playHistory, likedSongs })}
                    alt={pl.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : pl.avatar ? (
                  <img
                    src={pl.avatar}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      if (pl.songs.length > 0) {
                        e.currentTarget.src = (getCleanThumbnail(pl.songs[0].thumbnail) || getHighResImage(pl.songs[0].cover));
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                ) : (
                  <ListMusic size={48} color="var(--text-muted)" />
                )}
                {isMyPlaylist && (
                  <div className="avatar-overlay" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{t('changeImage')}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
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
                ) : (() => {
                  const isMix = isMixPlaylist(pl);
                  const displayName = (() => {
                    if (isMix) {
                      if (pl.mixType === 'daily_mix' || pl.id === 'temp_mix_daily') return t('dailyMixTitle');
                      if (pl.mixType === 'discover_weekly' || pl.id === 'temp_mix_discover_weekly') return t('discoverWeekly');
                      if (pl.mixType === 'release_radar' || pl.id === 'temp_mix_release_radar') return t('releaseRadar');
                      if ((pl as any).mood) {
                        const cfg = VIBE_CONFIGS[(pl as any).mood as VibeType];
                        if (cfg) return `${t(cfg.labelKey as any)} Mix`;
                      }
                    }
                    return pl.name;
                  })();

                  const displayDescription = (() => {
                    if (isMix) {
                      if (pl.mixType === 'daily_mix' || pl.id === 'temp_mix_daily') return t('dailyMixDesc');
                      if (pl.mixType === 'discover_weekly' || pl.id === 'temp_mix_discover_weekly') return t('discoverWeeklyDesc');
                      if (pl.mixType === 'release_radar' || pl.id === 'temp_mix_release_radar') return t('releaseRadarDesc');
                      if ((pl as any).mood) {
                        const cfg = VIBE_CONFIGS[(pl as any).mood as VibeType];
                        if (cfg && cfg.descriptionKey) return t(cfg.descriptionKey as any);
                      }
                    }
                    return (pl as any).description;
                  })();

                  return (
                    <>
                      <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: 'clamp(22px, 2.1vw, 32px)', lineHeight: 1.18, wordBreak: 'break-word' }}>
                        <span>{displayName}</span>
                        {isMyPlaylist && (
                          <button className="btn-icon" style={{ flexShrink: 0 }} onClick={() => { setEditPlaylistNameValue(pl.name); setIsEditingPlaylistName(true); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                          </button>
                        )}
                      </h1>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px 12px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {(pl as any).isTemporary ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600, background: 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                              {t('madeForYou')} • {t('temporaryMix')}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => { if (pl.discordId) { setActiveProfileId(pl.discordId); setActivePage('profile'); } }}>
                            {(pl as any).authorAvatar ? (
                              <img src={(pl as any).authorAvatar} alt="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                            ) : (
                              <div className="user-avatar" style={{ width: '24px', height: '24px', fontSize: '10px', flexShrink: 0 }}>
                                {((pl as any).authorName || discordUser?.global_name || discordUser?.username || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span style={{ fontSize: '14px', fontWeight: '600', color: 'white', transition: 'text-decoration 0.2s' }} onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'} onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}>
                              {isMyPlaylist ? (discordUser?.global_name || discordUser?.username) : ((pl as any).authorName || 'User')}
                            </span>
                          </div>
                        )}
                        <span style={{ color: 'var(--text-muted)' }}>•</span>
                        <p className="page-subtitle" style={{ margin: 0, whiteSpace: 'nowrap' }}>{effectiveSongs.length} {t('songs')}</p>

                        {discordUser && discordUser.id === pl.discordId && (() => {
                          const isPublicPl = !(pl as any).isPrivate && pl.privacy !== 'private';
                          return (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px', whiteSpace: 'nowrap', flexShrink: 0 }} onClick={async () => {
                              const nextPrivate = isPublicPl;
                              const updated = { ...pl, isPrivate: nextPrivate, privacy: nextPrivate ? 'private' : 'public' };
                              setPlaylists(prev => {
                                const nextList = prev.map(p => p.id === pl.id ? updated : p);
                                try {
                                  const suffix = discordUser ? `_${discordUser.id}` : '';
                                  localStorage.setItem(`donpollo_playlists${suffix}`, JSON.stringify(nextList));
                                } catch {}
                                return nextList;
                              });
                              if ((window as any).electronAPI) {
                                await (window as any).electronAPI.savePlaylist(updated);
                              }
                            }}>
                              <div style={{ width: '30px', height: '16px', background: isPublicPl ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)', borderRadius: '10px', position: 'relative', transition: 'all 0.2s' }}>
                                <div style={{ width: '12px', height: '12px', background: isPublicPl ? '#000' : '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: isPublicPl ? '16px' : '2px', transition: 'all 0.2s' }} />
                              </div>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{isPublicPl ? t('isPublic') : t('isPrivate')}</span>
                            </div>
                          );
                        })()}
                      </div>
                      {displayDescription && (
                        <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '650px', lineHeight: 1.4 }}>
                          {displayDescription}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', width: '100%' }}>
              {effectiveSongs.length > 0 && (
                <button className="btn-primary" onClick={() => startPlayingFromList(effectiveSongs, 0)}>
                  <Play size={16} fill="currentColor" /> {t('playAll')}
                </button>
              )}
              {(pl as any).isTemporary && effectiveSongs.length > 0 && (
                <button
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    const permanentPl: Playlist = {
                      ...pl,
                      id: `pl_${Date.now()}`,
                      name: pl.name,
                      avatar: getMixPlaylistCover(pl, { songs: effectiveSongs, playHistory, likedSongs }),
                      songs: effectiveSongs,
                      createdAt: Date.now(),
                      discordId: discordUser?.id || undefined
                    };
                    delete (permanentPl as any).isTemporary;
                    const user = JSON.parse(localStorage.getItem('donpollo_user') || 'null');
                    const suffix = user ? `_${user.id}` : '';
                    const updated = [permanentPl, ...playlists];
                    setPlaylists(updated);
                    localStorage.setItem(`donpollo_playlists${suffix}`, JSON.stringify(updated));
                    showToast(t('playlistSavedToLibrary'), 'success');
                  }}
                >
                  <FolderPlus size={16} /> {t('saveToPlaylist')}
                </button>
              )}
              {(pl as any).isTemporary && (
                <button
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => regenerateMadeForYouMix(pl.id)}
                  disabled={isMixGeneratingId === pl.id}
                >
                  <RefreshCw size={16} className={isMixGeneratingId === pl.id ? 'spinner' : ''} />
                  {isMixGeneratingId === pl.id ? t('remixing') : t('remixVibe')}
                </button>
              )}
              {effectiveSongs.length > 0 && (
                <button className="btn-secondary" onClick={() => {
                  if ((window as any).electronAPI?.cacheAudio) {
                    const toDownload = effectiveSongs.filter(s => !downloadedSongs.some(ds => ds.id === s.id) && !activeDownloads[s.id]);
                    if (toDownload.length === 0) {
                      showToast(t('allSongsDownloaded'), 'success');
                      return;
                    }
                    showToast(t('startDownloadingSongs', { '0': String(toDownload.length) }), 'success');
                    toDownload.forEach(song => {
                      let streamUrl = `${API_BASE_URL}/api/stream?id=${song.id}`;
                      if (settings.audioQuality && settings.audioQuality !== 'auto') {
                        streamUrl += `&quality=${settings.audioQuality}`;
                      }
                      (window as any).electronAPI.cacheAudio(song, streamUrl);
                    });
                  } else {
                    showToast(t('downloadDesktopOnly'), 'error');
                  }
                }}>
                  <DownloadCloud size={16} /> {t('downloadAll')}
                </button>
              )}
              {(isMyPlaylist || isCollaborator) && (
                <button className="btn-secondary" onClick={() => {
                  setCollabPlaylistId(pl.id);
                  setShowCollabModal(true);
                }}>
                  <Users size={16} /> {t('collabButton', { '0': String(pl.collaborators?.length || 0) })}
                </button>
              )}
              {isMyPlaylist && (
                <button className="btn-secondary" onClick={async () => {
                  if ((window as any).electronAPI?.createShareCode) {
                    const result = await (window as any).electronAPI.createShareCode(pl);
                    if (result) setShareCodeResult(result);
                    else showToast(t('shareCodeError'), 'error');
                  }
                }}>
                  <Share2 size={16} /> {t('share')}
                </button>
              )}
              {isMyPlaylist ? (
                <button className="btn-secondary" onClick={() => setPlaylistToDelete(pl.id)} style={{ color: '#ff5555' }}>
                  <Trash2 size={16} /> {t('deletePlaylist')}
                </button>
              ) : discordUser && savedPlaylists.includes(pl.id) && (
                <button className="btn-secondary" onClick={() => setPlaylistToRemove(pl.id)} style={{ color: '#ff5555' }}>
                  <Trash2 size={16} /> {t('removeFromLibrary')}
                </button>
              )}
            </div>
          </div>
          {isMixGeneratingId === pl.id ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 size={36} className="spinner" style={{ margin: '0 auto 16px', color: 'var(--accent-primary)' }} />
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Meracik lagu untuk {pl.name}...
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Menganalisis lagu & musisi favoritmu secara cerdas
              </div>
            </div>
          ) : effectiveSongs.length > 0 ? (
            <div className="library-list">
              {effectiveSongs.map((song, i) => (
                <div key={i} className={`library-item ${currentSong?.id === song.id ? 'playing' : ''}`} onContextMenu={(e) => handleContextMenu(e, song)}
                  draggable={true}
                  onDragStart={(e) => {
                    setDraggedPlaylistSongIdx(i);
                    setDraggedGlobalSong(song);
                    applyDragGhost(e, song);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (canEditSongs) setDragOverPlaylistSongIdx(i);
                  }}
                  onDragLeave={() => setDragOverPlaylistSongIdx(null)}
                  onDrop={async (e) => {
                    if (!canEditSongs) return;
                    e.preventDefault();
                    if (draggedPlaylistSongIdx !== null && draggedPlaylistSongIdx !== i) {
                      const newSongs = [...pl.songs];
                      const [moved] = newSongs.splice(draggedPlaylistSongIdx, 1);
                      newSongs.splice(i, 0, moved);
                      const updated = { ...pl, songs: newSongs };
                      if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(updated);
                      setPlaylists(prev => prev.map(p => p.id === pl.id ? updated : p));
                    } else if (draggedGlobalSong && draggedPlaylistSongIdx === null) {
                      if (!pl.songs.some(s => s.id === draggedGlobalSong.id)) {
                        const newSongs = [...pl.songs];
                        const songWithAddedBy = {
                          ...draggedGlobalSong,
                          addedBy: discordUser ? {
                            id: discordUser.id,
                            username: discordUser.global_name || discordUser.username,
                            avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null
                          } : null
                        };
                        newSongs.splice(i, 0, songWithAddedBy);
                        const updated = { ...pl, songs: newSongs };
                        if ((window as any).electronAPI) await (window as any).electronAPI.savePlaylist(updated);
                        setPlaylists(prev => prev.map(p => p.id === pl.id ? updated : p));
                        showToast(t('toastAddedToPlaylist', { playlist: pl.name }), 'playlist');
                      } else {
                        showToast(t('toastAlreadyInPlaylist'), 'error');
                      }
                    }
                    setDragOverPlaylistSongIdx(null);
                    setDraggedPlaylistSongIdx(null);
                    setDraggedGlobalSong(null);
                  }}
                  onDragEnd={(e) => {
                    setDragOverPlaylistSongIdx(null);
                    setDraggedPlaylistSongIdx(null);
                    setDraggedGlobalSong(null);
                    (e.currentTarget as HTMLElement).classList.remove('dragging-origin');
                  }}
                  style={{
                    borderTop: dragOverPlaylistSongIdx === i ? '2px solid var(--accent-primary)' : 'none',
                    transition: 'border 0.2s',
                  }}
                >
                  {(() => {
                    const cleanSong = formatTrackLikeSpotify(song);
                    return (
                      <>
                        <div className="library-item-art" onClick={() => startPlayingFromList(effectiveSongs, i)}>
                          <img src={(getCleanThumbnail(cleanSong.thumbnail) || getHighResImage(cleanSong.cover))} alt={cleanSong.title} />
                          <div className="library-item-play"><Play size={16} fill="currentColor" /></div>
                        </div>
                        <div className="library-item-info" onClick={() => startPlayingFromList(effectiveSongs, i)}>
                          <div className="library-item-title" title={cleanSong.title}>{cleanSong.title}</div>
                          <div className="library-item-artist" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{cleanSong.artist}</span>
                            {(cleanSong.source === 'itunes' || cleanSong.isOfficialAudio || getAudioBadge(cleanSong)?.type === 'audio') && (
                              <span className="suggestion-badge badge-audio" style={{ fontSize: '10px', padding: '1px 6px' }}>
                                <Music size={10} strokeWidth={2.4} />
                                <span>{t('badgeAudio')}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  {song.addedBy && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '16px', flexShrink: 0 }} title={`Added by ${song.addedBy.username}`}>
                      {song.addedBy.avatar ? (
                        <img src={song.addedBy.avatar || getDefaultDiscordAvatar(song.addedBy.id, song.addedBy.name)} alt="" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => handleAvatarError(e, song.addedBy.id, song.addedBy.name)} />
                      ) : (
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 'bold' }}>
                          {song.addedBy.username?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>
                        {song.addedBy.username}
                      </span>
                    </div>
                  )}
                  <div className="library-item-duration">{formatTime(song.duration)}</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="library-item-action"
                      onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
                      style={{ color: isLiked(song) ? '#ff6b9d' : 'var(--text-secondary)' }}
                      title="Like"
                    >
                      <Heart size={16} fill={isLiked(song) ? 'currentColor' : 'none'} />
                    </button>
                    {canEditSongs && (
                      <button
                        className="library-item-action"
                        onClick={(e) => { e.stopPropagation(); removeSongFromPlaylist(pl.id, song, i); }}
                        title="Hapus dari playlist"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (pl as any).isTemporary ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Belum ada lagu dalam playlist ini.</div>
              <button
                className="btn-primary"
                style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onClick={() => regenerateMadeForYouMix(pl.id)}
              >
                <RefreshCw size={15} /> Racik Lagu Sekarang
              </button>
            </div>
          ) : (
            <div className="empty-state">
              <ListMusic size={64} color="var(--text-muted)" />
              <h3>{t('noPlaylists')}</h3>
              <p>{t('addSongs')}</p>
            </div>
          )}

          {/* Search bar inside playlist */}
          {canEditSongs && (
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
                  {playlistSearchResults.map((song, i) => {
                    const isAdded = pl.songs.some(s => (song.id && s.id === song.id) || (s.title === song.title && s.artist === song.artist));
                    const badge = getAudioBadge(song);
                    return (
                      <div key={i} className="library-item"
                        draggable={true}
                        onDragStart={(e) => { setDraggedGlobalSong(song); applyDragGhost(e, song); }}
                        onDragEnd={(e) => { setDraggedGlobalSong(null); (e.currentTarget as HTMLElement).classList.remove('dragging-origin'); }}
                      >
                        <div
                          className="library-item-art"
                          onClick={() => playSingleSong(song)}
                          title={t('playSong')}
                          style={{ cursor: 'pointer' }}
                        >
                          <img src={(getCleanThumbnail(song.thumbnail) || getHighResImage(song.cover))} alt={song.title} />
                          <div className="library-item-play"><Play size={16} fill="currentColor" /></div>
                        </div>
                        <div className="library-item-info">
                          <div className="library-item-title" title={song.title}>{song.title}</div>
                          <div className="library-item-artist" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{song.artist}</span>
                            {badge && (
                              <span className={`suggestion-badge badge-${badge.type}`}>
                                {badge.type === 'audio' && <Music size={10} strokeWidth={2.4} />}
                                {badge.type === 'lyrics' && <FileText size={10} strokeWidth={2.4} />}
                                {badge.type === 'video' && <Film size={10} strokeWidth={2.4} />}
                                <span>{badge.type === 'audio' ? t('badgeAudio') : badge.type === 'lyrics' ? t('badgeLyrics') : t('badgeVideo')}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="library-item-duration">{formatTime(song.duration)}</div>
                        <button
                          className={isAdded ? "btn-secondary" : "btn-primary"}
                          onClick={() => addSongToPlaylist(pl.id, song)}
                          disabled={isAdded}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          {isAdded ? (
                            <>
                              <Check size={14} />
                              <span>{t('addedToPlaylist')}</span>
                            </>
                          ) : (
                            <>
                              <Plus size={14} />
                              <span>{t('addSongs')}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      );
    }

    return (
      <div className="page-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>{t('myLibrary')}</h1>
            <p className="page-subtitle">{playlists.filter(pl => pl.discordId === discordUser?.id || savedPlaylists.includes(pl.id) || pl.collaborators?.includes(discordUser?.id || '')).length} {t('playlist')}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" onClick={() => setShowImportPlaylist(true)}>
              <Download size={16} /> {t('importPlaylist')}
            </button>
            <button className="btn-primary" onClick={() => setShowCreatePlaylist(true)}>
              <Plus size={16} /> {t('createPlaylist')}
            </button>
          </div>
        </div>
        {playlists.filter(pl => pl.discordId === discordUser?.id || savedPlaylists.includes(pl.id) || pl.collaborators?.includes(discordUser?.id || '')).length > 0 ? (
          <div className="playlist-grid">
            {playlists.filter(pl => pl.discordId === discordUser?.id || savedPlaylists.includes(pl.id) || pl.collaborators?.includes(discordUser?.id || '')).map(pl => (
              <div key={pl.id} className="playlist-card" onClick={() => { navigate('playlist-detail', { playlistId: pl.id }); }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu(null);
                  setPlaylistContextMenu({ x: e.clientX, y: e.clientY, playlist: pl });
                }}>
                <div className="playlist-card-art">
                  {isMixPlaylist(pl) ? (
                    <img src={getMixPlaylistCover(pl, { songs: pl.songs, playHistory, likedSongs })} alt={pl.name} />
                  ) : pl.avatar ? (
                    <img src={pl.avatar} alt={pl.name} />
                  ) : pl.songs.length > 0 ? (
                    <img src={(getCleanThumbnail(pl.songs[0].thumbnail) || getHighResImage(pl.songs[0].cover))} alt={pl.name} />
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
