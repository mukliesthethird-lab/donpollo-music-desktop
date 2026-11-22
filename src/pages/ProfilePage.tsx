import React from 'react';
import {
  Loader2, UserCircle, X, Edit3, MessageSquare, MinusCircle,
  PlusCircle, Clock, Trophy, Heart, ListMusic
} from 'lucide-react';
import type { DiscordUser, Page } from '../utils/mediaHelpers';

interface ProfilePageProps {
  isLoadingProfile: boolean;
  profileData: any;
  setProfileData: React.Dispatch<React.SetStateAction<any>>;
  activeProfileId: string | null;
  discordUser: DiscordUser | null;
  onlineUsers: any[];
  isEditingBanner: boolean;
  setIsEditingBanner: (val: boolean) => void;
  bannerInputUrl: string;
  setBannerInputUrl: (val: string) => void;
  myCustomStatus: string;
  setCustomStatusInput: (val: string) => void;
  setShowStatusModal: (val: boolean) => void;
  following: string[];
  setFollowing: React.Dispatch<React.SetStateAction<string[]>>;
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
  listenerPercentile: number | null;
  savedPlaylists: string[];
  setSavedPlaylists: React.Dispatch<React.SetStateAction<string[]>>;
  setActivePlaylistId: (id: string | null) => void;
  setActivePage: (page: Page) => void;
  navigate?: (page: Page, opts?: any) => void;
  approvedLyricsCount?: number;
  handleAvatarError: (e: any, userId?: string | null, username?: string) => void;
  startPlayingFromList: (list: any[], startIndex: number) => void;
  handleContextMenu: (e: React.MouseEvent, song: any) => void;
  formatTime: (sec: number) => string;
  showToast: (msg: string, type?: any) => void;
  t: (key: any) => string;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  isLoadingProfile,
  profileData,
  setProfileData,
  activeProfileId,
  discordUser,
  onlineUsers,
  isEditingBanner,
  setIsEditingBanner,
  bannerInputUrl,
  setBannerInputUrl,
  myCustomStatus,
  setCustomStatusInput,
  setShowStatusModal,
  following,
  setFollowing,
  settings,
  setSettings,
  listenerPercentile,
  savedPlaylists,
  setSavedPlaylists,
  setActivePlaylistId,
  setActivePage,
  navigate,
  approvedLyricsCount = 0,
  handleAvatarError,
  startPlayingFromList,
  handleContextMenu,
  formatTime,
  showToast,
  t,
}) => {
  if (isLoadingProfile) return <div className="loading-state" style={{ marginTop: '50px' }}><Loader2 className="spin" size={40} color="var(--accent-primary)" /></div>;
  if (!profileData && activeProfileId !== discordUser?.id) return <div className="empty-state" style={{ marginTop: '50px' }}><UserCircle size={64} color="var(--text-secondary)" /><p>Profil tidak ditemukan.</p></div>;

  const isMe = activeProfileId === discordUser?.id;
  const onlineFriend = onlineUsers.find(u => u.discordId === activeProfileId);

  const displayUsername = profileData?.username ||
    (isMe && discordUser ? (discordUser.global_name || discordUser.username) :
      (onlineFriend ? onlineFriend.username : 'Unknown User'));

  const displayAvatar = profileData?.avatarUrl ||
    (isMe && discordUser ? (discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : `https://ui-avatars.com/api/?name=${discordUser.username}`) :
      (onlineFriend ? (onlineFriend.avatarUrl || `https://ui-avatars.com/api/?name=${onlineFriend.username}`) : `https://ui-avatars.com/api/?name=${displayUsername}`));

  const isPrivateStats = !isMe && !profileData?.privacySettings?.publicStats;
  const isPrivateLikes = !isMe && !profileData?.privacySettings?.publicLikedSongs;
  const displayBanner = profileData?.bannerUrl || null;

  return (
    <div className="profile-container" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="profile-header" style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '24px',
        padding: '80px 40px 40px 40px',
        background: displayBanner ? `url(${displayBanner}) center/cover no-repeat` : 'linear-gradient(to bottom, rgba(80,80,80,0.6), rgba(18,18,18,1))',
        boxShadow: '0 4px 60px rgba(0,0,0,0.5)'
      }}>
        {displayBanner && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent, rgba(18,18,18,1))' }} />}

        {isMe && (
          <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 2 }}>
            {isEditingBanner ? (
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.8)', padding: '8px', borderRadius: '8px', backdropFilter: 'blur(10px)' }}>
                <input
                  type="text"
                  value={bannerInputUrl}
                  onChange={(e) => setBannerInputUrl(e.target.value)}
                  placeholder={t('enterBannerUrl') || 'Banner URL'}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', width: '250px' }}
                  autoFocus
                />
                <input type="file" accept="image/*" style={{ display: 'none' }} id="banner-upload" onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const p = (e.target.files[0] as any).path;
                    if (p) setBannerInputUrl(`file:///${p.replace(/\\/g, '/')}`);
                    else setBannerInputUrl(URL.createObjectURL(e.target.files[0]));
                  }
                }} />
                <label htmlFor="banner-upload" style={{ cursor: 'pointer', padding: '6px', margin: 0, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  title="Upload Image">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                </label>
                <button style={{ padding: '6px 16px', fontSize: '12px', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onClick={() => {
                    const newBannerUrl = bannerInputUrl;
                    setProfileData((prev: any) => ({ ...prev, bannerUrl: newBannerUrl }));
                    if ((window as any).electronAPI && discordUser) {
                      (window as any).electronAPI.updateBanner(discordUser.id, newBannerUrl)
                        .then((ok: boolean) => { if (!ok) showToast('Gagal menyimpan banner', 'error'); });
                    }
                    setIsEditingBanner(false);
                  }}>{t('save') || 'Save'}
                </button>
                <button style={{ padding: '6px', background: 'transparent', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: 0.7, transition: 'opacity 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.opacity = '1'}
                  onMouseOut={e => e.currentTarget.style.opacity = '0.7'}
                  onClick={() => setIsEditingBanner(false)}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                className="btn-icon"
                style={{ background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '50%' }}
                onClick={() => {
                  setBannerInputUrl(displayBanner || '');
                  setIsEditingBanner(true);
                }}
                title={t('editBanner') || "Edit Banner"}
              >
                <Edit3 size={18} color="white" />
              </button>
            )}
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '24px', width: '100%', alignItems: 'flex-end' }}>
          <img src={displayAvatar} alt={displayUsername} style={{ width: '160px', height: '160px', borderRadius: '50%', objectFit: 'cover', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }} onError={(e) => handleAvatarError(e, activeProfileId, displayUsername)} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', color: 'var(--text-secondary)' }}>{t('profile') || 'Profil'}</div>
            <h1 style={{ fontSize: '56px', fontWeight: '900', margin: '0 0 12px 0', letterSpacing: '-2px', lineHeight: '1', color: 'var(--text-primary)' }}>{displayUsername}</h1>

            {/* Custom Status Cloud Thought Bubble */}
            {(() => {
              const userCustomStatus = isMe ? myCustomStatus : (onlineFriend?.customStatus || profileData?.customStatus || '');
              if (userCustomStatus) {
                return (
                  <div
                    className={`profile-cloud-bubble ${isMe ? 'clickable' : ''}`}
                    onClick={() => { if (isMe) { setCustomStatusInput(myCustomStatus); setShowStatusModal(true); } }}
                    title={isMe ? t('customStatusTooltip') : ''}
                    style={{ marginBottom: '14px' }}
                  >
                    <MessageSquare size={16} color="var(--accent-primary)" />
                    <span style={{ fontWeight: 500 }}>{userCustomStatus}</span>
                  </div>
                );
              } else if (isMe) {
                return (
                  <div
                    className="profile-cloud-bubble clickable"
                    onClick={() => { setCustomStatusInput(''); setShowStatusModal(true); }}
                    style={{ marginBottom: '14px', opacity: 0.7, borderStyle: 'dashed' }}
                  >
                    <MessageSquare size={15} color="var(--text-secondary)" />
                    <span style={{ fontSize: '12px' }}>{t('customStatusSet')}</span>
                  </div>
                );
              }
              return null;
            })()}

            <div style={{ display: 'flex', gap: '20px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', alignItems: 'center', flexWrap: 'wrap' }}>
              <span><strong style={{ color: 'var(--text-primary)' }}>{profileData?.followers?.length || 0}</strong> {t('followers')}</span>
              {profileData?.playlists?.length > 0 && <span><strong style={{ color: 'var(--text-primary)' }}>{profileData.playlists.length}</strong> {t('publicPlaylists')}</span>}
              {approvedLyricsCount > 0 && <span><strong style={{ color: '#10B981' }}>{approvedLyricsCount}</strong> {t('verifiedLyrics')}</span>}
            </div>

            {Array.isArray(profileData?.badges) && profileData.badges.length > 0 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                {profileData.badges.map((b: any) => (
                  <span
                    key={b.id}
                    title={b.description || b.name}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: `${b.color || '#5865F2'}22`,
                      border: `1px solid ${b.color || '#5865F2'}66`,
                      color: b.color || '#5865F2',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    <span>
                      {typeof b.icon === 'string' && (b.icon.startsWith('data:image/') || b.icon.startsWith('http')) ? (
                        <img src={b.icon} alt="" style={{ width: '15px', height: '15px', borderRadius: '4px', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        b.icon
                      )}
                    </span>
                    <span>{b.name}</span>
                  </span>
                ))}
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              {!isMe && discordUser && activeProfileId && (
                <button
                  className="primary-btn"
                  style={{
                    background: following.includes(activeProfileId) ? 'transparent' : 'var(--accent-primary)',
                    color: following.includes(activeProfileId) ? 'var(--text-primary)' : '#000',
                    border: following.includes(activeProfileId) ? '1px solid var(--text-secondary)' : 'none',
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 24px', borderRadius: '30px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onClick={async () => {
                    if ((window as any).electronAPI) {
                      const newFollowing = await (window as any).electronAPI.toggleFollow(discordUser.id, activeProfileId);
                      if (newFollowing) {
                        setFollowing(newFollowing);
                        setProfileData((prev: any) => {
                          if (!prev) return prev;
                          const newFollowers = newFollowing.includes(activeProfileId)
                            ? [...(prev.followers || []), discordUser.id]
                            : (prev.followers || []).filter((id: string) => id !== discordUser.id);
                          return { ...prev, followers: newFollowers };
                        });
                      }
                    }
                  }}
                >
                  {following.includes(activeProfileId) ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
                  {following.includes(activeProfileId) ? '-Rep' : '+Rep'}
                </button>
              )}

              {isMe && (
                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setSettings((p: any) => ({ ...p, privacySettings: { ...(p.privacySettings || {}), publicStats: !(settings.privacySettings?.publicStats !== false) } }))}>
                    <div style={{ width: '36px', height: '20px', background: settings.privacySettings?.publicStats !== false ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)', borderRadius: '10px', position: 'relative', transition: 'all 0.2s' }}>
                      <div style={{ width: '16px', height: '16px', background: settings.privacySettings?.publicStats !== false ? '#000' : '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: settings.privacySettings?.publicStats !== false ? '18px' : '2px', transition: 'all 0.2s' }} />
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('isPublic')} {t('listeningTime')}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setSettings((p: any) => ({ ...p, privacySettings: { ...(p.privacySettings || {}), publicLikedSongs: !(settings.privacySettings?.publicLikedSongs !== false) } }))}>
                    <div style={{ width: '36px', height: '20px', background: settings.privacySettings?.publicLikedSongs !== false ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)', borderRadius: '10px', position: 'relative', transition: 'all 0.2s' }}>
                      <div style={{ width: '16px', height: '16px', background: settings.privacySettings?.publicLikedSongs !== false ? '#000' : '#fff', borderRadius: '50%', position: 'absolute', top: '2px', left: settings.privacySettings?.publicLikedSongs !== false ? '18px' : '2px', transition: 'all 0.2s' }} />
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('isPublic')} {t('likedSongs')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-content" style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: '40px', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: '40px', alignItems: 'start' }}>
          {/* Kiri: Stats & Liked Songs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {!isPrivateStats && (
              <div className="profile-section">
                <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}><Clock size={20} color="var(--accent-primary)" /> {t('listeningTime')}</h2>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                    {Math.floor((profileData?.stats?.totalListenSeconds || 0) / 3600)}<span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>h</span> {Math.floor(((profileData?.stats?.totalListenSeconds || 0) % 3600) / 60)}<span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>m</span>
                  </div>
                  {listenerPercentile !== null && listenerPercentile <= 50 && (
                    <div style={{ padding: '4px 10px', background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '6px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Trophy size={14} /> {t('topListener').replace('{percent}', listenerPercentile.toString())}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="profile-section">
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}><Heart size={20} color="#ff4081" /> {t('likedSongs')}</h2>
              {isPrivateLikes ? (
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('isPrivate')}</div>
              ) : profileData?.likedSongs?.length > 0 ? (
                <div className="song-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {profileData.likedSongs.slice(0, 5).map((song: any, i: number) => (
                    <div key={song.id} className="song-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', cursor: 'pointer' }} onClick={() => startPlayingFromList(profileData.likedSongs, i)} onContextMenu={(e) => handleContextMenu(e, song)}>
                      <img src={song.thumbnail || 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?auto=format&fit=crop&w=500&q=80'} alt={song.title} style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} />
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{song.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{song.artist}</div>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{formatTime(song.duration)}</div>
                    </div>
                  ))}
                  {profileData.likedSongs.length > 5 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '10px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', cursor: 'pointer' }} onClick={() => startPlayingFromList(profileData.likedSongs, 0)}>
                      + {profileData.likedSongs.length - 5} {t('songs')}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t('noLikedSongsYet')}</div>
              )}
            </div>
          </div>

          {/* Kanan: Playlists */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <div className="profile-section">
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}><ListMusic size={20} color="var(--accent-primary)" /> {t('publicPlaylists')}</h2>
              {profileData?.playlists?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
                  {profileData.playlists.map((pl: any) => (
                    <div key={pl.id} className="playlist-card" style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', border: '1px solid var(--border-color)' }} onClick={() => { if (navigate) navigate('playlist-detail', { playlistId: pl.id }); else { setActivePlaylistId(pl.id); setActivePage('playlist-detail'); } }}>
                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', marginBottom: '12px', background: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {pl.avatar ? (
                          <img src={pl.avatar} alt={pl.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <ListMusic size={40} color="var(--text-muted)" />
                        )}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{pl.songs?.length || 0} {t('songs')}</span>
                        {(pl as any).saveCount > 0 && (
                          <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-primary)' }}>
                            {(pl as any).saveCount} Saves
                          </span>
                        )}
                      </div>

                      {!isMe && discordUser && (
                        <button className="btn-secondary" style={{ width: '100%', marginTop: '12px', padding: '6px 0', fontSize: '12px', justifyContent: 'center', background: savedPlaylists.includes(pl.id) ? '#ff5555' : '#5865f2', color: 'white', border: 'none' }} onClick={async (e) => {
                          e.stopPropagation();
                          if ((window as any).electronAPI) {
                            const newSaved = await (window as any).electronAPI.toggleSavePlaylist(discordUser.id, pl.id);
                            if (newSaved) {
                              setSavedPlaylists(newSaved);
                              if (newSaved.includes(pl.id)) {
                                showToast(t('toastPlaylistSaved'), 'success');
                              } else {
                                showToast(t('toastPlaylistRemoved'), 'success');
                              }
                            }
                          }
                        }}>
                          {savedPlaylists.includes(pl.id) ? t('removeFromLibrary') : t('saveToLibrary')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Tidak ada playlist publik.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
