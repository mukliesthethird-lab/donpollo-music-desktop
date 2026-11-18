import React from 'react';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { getCleanThumbnail, getHighResImage, type DiscordUser } from '../utils/mediaHelpers';

interface WrappedStoryModalProps {
  isOpen: boolean;
  wrappedData: any;
  wrappedStoryIndex: number;
  setWrappedStoryIndex: React.Dispatch<React.SetStateAction<number>>;
  onClose: () => void;
  discordUser: DiscordUser | null;
  apiBaseUrl: string;
  t: (key: any) => string;
  startPlayingFromList: (list: any[], startIndex: number) => void;
}

export const WrappedStoryModal: React.FC<WrappedStoryModalProps> = ({
  isOpen,
  wrappedData,
  wrappedStoryIndex,
  setWrappedStoryIndex,
  onClose,
  discordUser,
  apiBaseUrl,
  t,
  startPlayingFromList,
}) => {
  if (!isOpen || !wrappedData) return null;

  return (
    <div className="wrapped-story-modal-overlay" onClick={onClose}>
      {wrappedData.topSongs?.[0]?.song && (
        <audio
          autoPlay
          loop
          src={`${apiBaseUrl}/api/stream?id=${wrappedData.topSongs[0].song.id}&quality=auto`}
          onCanPlay={(e: any) => { e.target.volume = 0.4; }}
          style={{ display: 'none' }}
        />
      )}

      <div className="wrapped-story-modal-wrapper">
        <button className="story-close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }}>
          <X size={32} />
        </button>

        {wrappedStoryIndex > 0 && (
          <button className="story-nav-btn left" onClick={(e) => { e.stopPropagation(); setWrappedStoryIndex(prev => prev - 1); }}>
            <ChevronLeft size={32} />
          </button>
        )}

        <div className="wrapped-story-modal" onClick={(e) => e.stopPropagation()}>
          <div className="wrapped-bg-animated">
            <div className="orb orb-1"></div>
            <div className="orb orb-2"></div>
            <div className="orb orb-3"></div>
            <div className="orb orb-4"></div>
          </div>

          <div className="story-progress-container">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="story-progress-bar">
                <div className={`story-progress-fill ${i === wrappedStoryIndex ? 'active' : i < wrappedStoryIndex ? 'completed' : ''}`} />
              </div>
            ))}
          </div>

          <div className="story-content">
            {wrappedStoryIndex === 0 && (
              <div className="story-slide slide-1">
                <div className="story-user-profile zoom-in-anim">
                  <div className="avatar-ring-container">
                    <img
                      src={discordUser?.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : `https://ui-avatars.com/api/?name=${encodeURIComponent(discordUser?.global_name || discordUser?.username || 'User')}&background=random`}
                      alt="Avatar"
                      className="story-avatar"
                    />
                    <div className="avatar-ring"></div>
                  </div>
                  <h2 className="story-username slide-up-anim delay-1">{discordUser?.global_name || discordUser?.username || 'User'}</h2>
                </div>
                <h1 className="story-title-massive slide-up-anim delay-2" style={{ marginTop: '30px' }}>{t('storyWelcome')}</h1>
              </div>
            )}
            {wrappedStoryIndex === 1 && (
              <div className="story-slide slide-2">
                <h2 className="story-subtitle slide-right-anim">{t('storyUniqueSongs').replace('{0}', '')}</h2>
                <div className="story-minutes-highlight pop-in-anim delay-1">
                  {(wrappedData.uniqueSongsCount || 0).toLocaleString()}
                </div>
              </div>
            )}
            {wrappedStoryIndex === 2 && (
              <div className="story-slide slide-3">
                <h2 className="story-subtitle slide-left-anim">{t('storyUniqueArtists').replace('{0}', '')}</h2>
                <div className="story-minutes-highlight pop-in-anim delay-1" style={{ color: '#fff' }}>
                  {(wrappedData.uniqueArtistsCount || 0).toLocaleString()}
                </div>
              </div>
            )}
            {wrappedStoryIndex === 3 && (
              <div className="story-slide slide-4">
                <h2 className="story-subtitle slide-down-anim" style={{ letterSpacing: '8px' }}>TIME SPENT</h2>
                <div className="story-minutes-highlight pop-in-anim delay-1">
                  {Math.floor(wrappedData.totalListenSeconds / 60).toLocaleString()}
                </div>
                <h1 className="story-title slide-up-anim delay-1">MINUTES</h1>
                <div className="story-vibe-box slide-up-anim delay-2">
                  <span className="vibe-emoji">{wrappedData.topMood === 'happy' ? '☀️' : wrappedData.topMood === 'sad' ? '🌧️' : wrappedData.topMood === 'chill' ? '☕' : '⚡'}</span>
                  <div className="vibe-text-container">
                    <span className="vibe-label">Your Vibe</span>
                    <span className="vibe-text">{wrappedData.topMood ? t(`mood${wrappedData.topMood.charAt(0).toUpperCase() + wrappedData.topMood.slice(1)}` as any).replace(/☀️ |🌧️ |☕ |⚡ /g, '') : '-'}</span>
                  </div>
                </div>
              </div>
            )}
            {wrappedStoryIndex === 4 && (
              <div className="story-slide slide-5">
                <div className="spotify-21-top-song-layout pop-in-anim delay-1">
                  {wrappedData.topSongs?.[0] && (
                    <>
                      <div className="s21-cover-container">
                        <div className="s21-band">
                          <div className="s21-band-text">2026 2026 2026 2026 2026 2026</div>
                        </div>
                        <img src={(getCleanThumbnail(wrappedData.topSongs[0].song.thumbnail) || getHighResImage(wrappedData.topSongs[0].song.cover))} className="s21-top-song-cover" alt="Top Song" />
                      </div>

                      <div className="s21-top-song-text-block slide-up-anim delay-2">
                        <p className="s21-text-normal">Your top song of the year</p>
                        <p className="s21-text-normal">was <span className="s21-text-highlight">{wrappedData.topSongs[0].song.title}</span></p>
                        <p className="s21-text-normal">by <span className="s21-text-highlight">{wrappedData.topSongs[0].song.artist}</span></p>
                      </div>

                      <div className="s21-top-song-stat-block slide-up-anim delay-2">
                        <p className="s21-text-small">You played it a totally reasonable</p>
                        <p className="s21-text-small"><span className="s21-text-highlight">{wrappedData.topSongs[0].count}</span> times. As is your right.</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            {wrappedStoryIndex === 5 && (
              <div className="story-slide slide-6">
                <h1 className="story-title-massive slide-down-anim" style={{ fontSize: '48px', marginBottom: '20px' }}>{t('storySongs')}</h1>
                <div className="story-top-songs staggered-list">
                  {wrappedData.topSongs.slice(0, 5).map((item: any, idx: number) => (
                    <div key={idx} className={`story-song-item pop-in-anim delay-list-${idx + 1}`}>
                      <span className="story-song-rank">#{idx + 1}</span>
                      <img src={(getCleanThumbnail(item.song.thumbnail) || getHighResImage(item.song.cover))} alt={item.song.title} />
                      <div className="story-song-info">
                        <span className="story-song-title">{item.song.title}</span>
                        <span className="story-song-artist">{item.song.artist}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="btn-primary slide-up-anim delay-list-6 glass-btn" style={{ marginTop: '50px' }} onClick={() => {
                  onClose();
                  const playlistSongs = wrappedData.topSongs.map((item: any) => item.song);
                  startPlayingFromList(playlistSongs, 0);
                }}>
                  <Play size={20} fill="currentColor" style={{ marginRight: '10px' }} />
                  {t('playYourTopSongs')}
                </button>
              </div>
            )}
            {wrappedStoryIndex === 6 && (
              <div className="story-slide slide-7">
                <div className="spotify-top-artist-layout pop-in-anim delay-1">
                  {wrappedData.topArtists?.[0]?.cover && (
                    <img src={(getCleanThumbnail(wrappedData.topArtists[0].cover) || getHighResImage(wrappedData.topArtists[0].cover))} className="spotify-top-artist-cover" alt="Top Artist" />
                  )}
                  <h1 className="spotify-top-artist-name">{wrappedData.topArtists?.[0]?.artist || 'Unknown'}</h1>
                  <div className="spotify-top-artist-sub">Your Top Artist</div>
                </div>
              </div>
            )}
            {wrappedStoryIndex === 7 && (
              <div className="story-slide slide-8">
                <h1 className="story-title-massive slide-down-anim" style={{ fontSize: '48px', marginBottom: '20px' }}>{t('storyTopArtistsList')}</h1>
                <div className="story-top-songs staggered-list">
                  {wrappedData.topArtists.slice(0, 5).map((item: any, idx: number) => (
                    <div key={idx} className={`story-song-item pop-in-anim delay-list-${idx + 1} artist-list-item`}>
                      <span className="story-song-rank">#{idx + 1}</span>
                      {item.cover && (
                        <img src={(getCleanThumbnail(item.cover) || getHighResImage(item.cover))} className="artist-cover-small" alt={item.artist} />
                      )}
                      <div className="story-song-info">
                        <span className="story-song-title">{item.artist}</span>
                        <span className="story-song-artist">{item.count} Plays</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {wrappedStoryIndex === 8 && (
              <div className="story-slide slide-9">
                <div className="final-spotify-layout pop-in-anim delay-1">
                  {wrappedData.topArtists?.[0]?.cover && (
                    <img src={(getCleanThumbnail(wrappedData.topArtists[0].cover) || getHighResImage(wrappedData.topArtists[0].cover))} className="final-spotify-cover" alt="Top Artist" />
                  )}
                  <div className="final-spotify-columns">
                    <div className="final-spotify-col">
                      <div className="final-spotify-col-title">Top Artists</div>
                      {wrappedData.topArtists.slice(0, 5).map((item: any, idx: number) => (
                        <div key={idx} className="final-spotify-col-item">
                          <span className="idx">{idx + 1}</span> <span className="name">{item.artist}</span>
                        </div>
                      ))}
                      <div className="final-spotify-col-title" style={{ marginTop: '30px' }}>Minutes Listened</div>
                      <div className="final-spotify-col-stat">{Math.floor(wrappedData.totalListenSeconds / 60).toLocaleString()}</div>
                    </div>
                    <div className="final-spotify-col">
                      <div className="final-spotify-col-title">Top Songs</div>
                      {wrappedData.topSongs.slice(0, 5).map((item: any, idx: number) => (
                        <div key={idx} className="final-spotify-col-item">
                          <span className="idx">{idx + 1}</span> <span className="name">{item.song.title}</span>
                        </div>
                      ))}
                      <div className="final-spotify-col-title" style={{ marginTop: '30px' }}>Top Vibe</div>
                      <div className="final-spotify-col-stat">{wrappedData.topMood ? t(`mood${wrappedData.topMood.charAt(0).toUpperCase() + wrappedData.topMood.slice(1)}` as any).replace(/☀️ |🌧️ |☕ |⚡ /g, '') : '-'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {wrappedStoryIndex < 8 && (
          <button className="story-nav-btn right" onClick={(e) => { e.stopPropagation(); setWrappedStoryIndex(prev => prev + 1); }}>
            <ChevronRight size={32} />
          </button>
        )}
      </div>
    </div>
  );
};
