import React from 'react';
import { Play, Loader2, Heart, Mic2, Music } from 'lucide-react';
import { getCleanThumbnail, getHighResImage, applyDragGhost } from '../utils/mediaHelpers';

interface ArtistPageProps {
  activeArtist: string | null;
  artistSongs: any[];
  artistFilter: 'popular' | 'newest';
  setArtistFilter: React.Dispatch<React.SetStateAction<'popular' | 'newest'>>;
  isArtistLoading: boolean;
  isArtistPodcast: boolean;
  activePodcastMeta: { podcastId?: string; feedUrl?: string } | null;
  currentSong: any;
  isPlaying: boolean;
  fetchArtistSongs: (artist: string, filter: 'popular' | 'newest', isPodcast?: boolean, podcastId?: string, feedUrl?: string) => void;
  startPlayingFromList: (list: any[], startIndex: number) => void;
  playSingleSong: (song: any) => void;
  handleContextMenu: (e: React.MouseEvent, song: any) => void;
  setDraggedGlobalSong: (song: any | null) => void;
  formatTime: (sec: number) => string;
  toggleLike: (song: any) => void;
  isLiked: (id?: string) => boolean;
  t: (key: any) => string;
}

export const ArtistPage: React.FC<ArtistPageProps> = ({
  activeArtist,
  artistSongs,
  artistFilter,
  setArtistFilter,
  isArtistLoading,
  isArtistPodcast,
  activePodcastMeta,
  currentSong,
  isPlaying,
  fetchArtistSongs,
  startPlayingFromList,
  playSingleSong,
  handleContextMenu,
  setDraggedGlobalSong,
  formatTime,
  toggleLike,
  isLiked,
  t,
}) => (
  <div className="main-scroll artist-page" style={{ position: 'relative' }}>
    {artistSongs.length > 0 && (
      <div className="artist-hero-mosaic">
        <div className="mosaic-grid">
          {artistSongs.slice(0, 30).map((song, i) => (
            <img key={i} src={(getCleanThumbnail(song.thumbnail) || getHighResImage(song.cover))} alt="" />
          ))}
        </div>
        <div className="mosaic-overlay" />
      </div>
    )}
    <div className="artist-hero" style={{ position: 'relative', zIndex: 1 }}>
      <div className="artist-hero-info">
        <h1 className="artist-hero-name">{activeArtist}</h1>
        <p className="artist-hero-label">{isArtistPodcast ? t('podcast') : t('artistPage')}</p>
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
                if (activeArtist) fetchArtistSongs(activeArtist, 'popular', isArtistPodcast, activePodcastMeta?.podcastId, activePodcastMeta?.feedUrl);
              }}
            >
              {t('filterPopular')}
            </button>
            <button
              className={`filter-btn ${artistFilter === 'newest' ? 'active' : ''}`}
              onClick={() => {
                setArtistFilter('newest');
                if (activeArtist) fetchArtistSongs(activeArtist, 'newest', isArtistPodcast, activePodcastMeta?.podcastId, activePodcastMeta?.feedUrl);
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
              draggable={true}
              onDragStart={(e) => { setDraggedGlobalSong(song); applyDragGhost(e, song); }}
              onDragEnd={(e) => { setDraggedGlobalSong(null); (e.currentTarget as HTMLElement).classList.remove('dragging-origin'); }}
            >
              <div className="song-index">
                {currentSong?.id === song.id && isPlaying ? (
                  <div className="playing-eq"><div /><div /><div /></div>
                ) : (
                  <span>{idx + 1}</span>
                )}
                <div className="play-overlay"><Play size={12} fill="currentColor" /></div>
              </div>
              <div className="song-thumb-wrapper">
                <img src={(getCleanThumbnail(song.thumbnail) || getHighResImage(song.cover))} alt={song.title} className="song-thumb" />
              </div>
              <div className="song-info">
                <div className="song-title">{song.title}</div>
                <div className="song-artist" onClick={(e) => e.stopPropagation()}>{song.artist}</div>
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
          {isArtistPodcast ? <Mic2 size={40} /> : <Music size={40} />}
          <p>{t('noResults')}</p>
        </div>
      ) : null}
    </div>
  </div>
);
