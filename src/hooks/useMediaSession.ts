import { useEffect } from 'react';
import { getHighResImage, getCleanThumbnail } from '../utils/mediaHelpers';

interface UseMediaSessionParams {
  currentSong: any;
  isPlaying: boolean;
  progress: number;
  duration: number;
  podcastSpeed: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  setProgress: (val: number) => void;
  togglePlayRef: React.RefObject<() => void>;
  handlePrevRef: React.RefObject<() => void>;
  handleNextRef: React.RefObject<() => void>;
}

export function useMediaSession({
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
}: UseMediaSessionParams) {
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;

    if (!currentSong) {
      ms.metadata = null;
      ms.playbackState = 'none';
      return;
    }

    const artworkUrl = getHighResImage(currentSong.cover) || getCleanThumbnail(currentSong.thumbnail);
    try {
      ms.metadata = new MediaMetadata({
        title: currentSong.title || 'DonPollo Music',
        artist: currentSong.artist || 'Unknown Artist',
        album: currentSong.album || (currentSong.isPodcast ? 'Podcast' : 'DonPollo Music'),
        artwork: artworkUrl ? [
          { src: artworkUrl, sizes: '512x512', type: 'image/jpeg' },
          { src: artworkUrl, sizes: '256x256', type: 'image/jpeg' }
        ] : []
      });
    } catch {}

    ms.playbackState = isPlaying ? 'playing' : 'paused';

    try {
      if (typeof ms.setPositionState === 'function' && duration > 0 && Number.isFinite(duration)) {
        ms.setPositionState({
          duration,
          playbackRate: currentSong.isPodcast ? podcastSpeed : 1,
          position: Math.min(Math.max(0, progress), duration)
        });
      }
    } catch {}
  }, [currentSong, isPlaying, progress, duration, podcastSpeed]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const safeSetHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try { ms.setActionHandler(action, handler); } catch {}
    };

    safeSetHandler('play', () => togglePlayRef.current?.());
    safeSetHandler('pause', () => togglePlayRef.current?.());
    safeSetHandler('previoustrack', () => handlePrevRef.current?.());
    safeSetHandler('nexttrack', () => handleNextRef.current?.());
    safeSetHandler('seekto', (details) => {
      if (audioRef.current && typeof details.seekTime === 'number') {
        audioRef.current.currentTime = details.seekTime;
        setProgress(details.seekTime);
      }
    });
    safeSetHandler('seekbackward', (details) => {
      if (audioRef.current) {
        const nextT = Math.max(0, audioRef.current.currentTime - (details.seekOffset || 15));
        audioRef.current.currentTime = nextT;
        setProgress(nextT);
      }
    });
    safeSetHandler('seekforward', (details) => {
      if (audioRef.current) {
        const nextT = Math.min(audioRef.current.duration || duration, audioRef.current.currentTime + (details.seekOffset || 30));
        audioRef.current.currentTime = nextT;
        setProgress(nextT);
      }
    });
  }, [duration, audioRef, setProgress, togglePlayRef, handlePrevRef, handleNextRef]);
}
