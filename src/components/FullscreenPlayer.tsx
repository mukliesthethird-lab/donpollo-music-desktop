import React, { useState } from 'react';
import { X, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Repeat1, Languages, Check } from 'lucide-react';
import { getCleanThumbnail, getHighResImage } from '../utils/mediaHelpers';

interface FullscreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: any;
  isPlaying: boolean;
  progress: number;
  duration: number;
  isShuffled: boolean;
  loopMode: 'off' | 'all' | 'one';
  showWidgetOverlay: boolean;
  setShowWidgetOverlay: (val: boolean) => void;
  lyricsData: { time: number; text: string; romanizedText?: string; isInstrumental?: boolean }[] | null;
  plainLyrics: string;
  lyricsOffset: number;
  updateAndSaveLyricsOffset: (delta: number, isReset?: boolean) => void;
  showRomanized: boolean;
  setShowRomanized: (val: boolean) => void;
  showLyricTranslation: boolean;
  setShowLyricTranslation: React.Dispatch<React.SetStateAction<boolean>>;
  translatedLyrics: string[] | null;
  isTranslatingLyrics: boolean;
  lyricsTargetLang: string;
  onChangeLyricsTargetLang: (lang: string) => void;
  widgetLyricsRef: React.RefObject<HTMLDivElement | null>;
  handleUserScroll: () => void;
  jumpToLyric: (time: number) => void;
  isLiked: (id?: string) => boolean;
  toggleLike: (song: any) => void;
  toggleShuffle: () => void;
  togglePlay: () => void;
  handlePrev: () => void;
  handleNext: () => void;
  toggleLoopMode: () => void;
  handleSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
  formatTime: (sec: number) => string;
  t: (key: any) => string;
}

const LYRICS_LANG_OPTIONS = [
  { code: 'auto', label: 'Auto' },
  { code: 'id', label: 'Indonesia' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
];

export const FullscreenPlayer: React.FC<FullscreenPlayerProps> = ({
  isOpen,
  onClose,
  currentSong,
  isPlaying,
  progress,
  duration,
  isShuffled,
  loopMode,
  showWidgetOverlay,
  setShowWidgetOverlay,
  lyricsData,
  plainLyrics,
  lyricsOffset,
  updateAndSaveLyricsOffset,
  showRomanized,
  setShowRomanized,
  showLyricTranslation,
  setShowLyricTranslation,
  translatedLyrics,
  isTranslatingLyrics,
  lyricsTargetLang,
  onChangeLyricsTargetLang,
  widgetLyricsRef,
  handleUserScroll,
  jumpToLyric,
  isLiked,
  toggleLike,
  toggleShuffle,
  togglePlay,
  handlePrev,
  handleNext,
  toggleLoopMode,
  handleSeek,
  formatTime,
  t,
}) => {
  const [showLangMenu, setShowLangMenu] = useState(false);

  if (!isOpen) return null;

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    const fallback = 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?auto=format&fit=crop&w=500&q=80';
    if (target.src.includes('maxresdefault.jpg')) {
      target.src = target.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
    } else if (target.src.includes('hqdefault.jpg')) {
      target.src = target.src.replace('hqdefault.jpg', 'mqdefault.jpg');
    } else if (target.src !== fallback) {
      target.src = fallback;
    }
  };

  return (
    <div className="fullscreen-player">
      <div className="fs-background">
        <img
          key={currentSong?.id || 'bg'}
          src={(getCleanThumbnail(currentSong?.thumbnail) || getHighResImage(currentSong?.cover))}
          onError={handleImgError}
          alt="bg"
        />
      </div>

      <div className="fs-content">
        <div className="fs-left">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '14px', position: 'relative', zIndex: 20 }}>
            <div style={{ display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '2px 4px', backdropFilter: 'blur(10px)' }}>
              <button onClick={() => updateAndSaveLyricsOffset(-0.5)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '11px', padding: '3px 6px', cursor: 'pointer' }}>-0.5s</button>
              <span onClick={() => updateAndSaveLyricsOffset(0, true)} title={t('resetOffsetTooltip')} style={{ color: 'var(--accent-primary)', fontSize: '11px', fontWeight: 700, padding: '3px 6px', cursor: 'pointer' }}>{lyricsOffset}s</span>
              <button onClick={() => updateAndSaveLyricsOffset(0.5)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '11px', padding: '3px 6px', cursor: 'pointer' }}>+0.5s</button>
            </div>
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
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowLyricTranslation(prev => !prev)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowLangMenu(prev => !prev);
                }}
                style={{
                  background: showLyricTranslation ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  fontSize: '12px', padding: '4px 10px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                  backdropFilter: 'blur(10px)',
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  transition: 'all 0.2s'
                }}
                title={`${isTranslatingLyrics ? t('translatingLyrics') : t('translateLyrics')} (Right-click: language)`}
              >
                <Languages size={14} /> {isTranslatingLyrics ? '...' : t('translateLyrics')}
              </button>
              {showLangMenu && (
                <div
                  onMouseLeave={() => setShowLangMenu(false)}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    minWidth: '140px',
                    background: 'rgba(15, 23, 42, 0.94)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: '10px',
                    padding: '4px',
                    backdropFilter: 'blur(14px)',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.55)',
                    zIndex: 30,
                  }}
                >
                  {LYRICS_LANG_OPTIONS.map(opt => {
                    const active = (lyricsTargetLang || 'auto') === opt.code;
                    return (
                      <div
                        key={opt.code}
                        onClick={() => {
                          onChangeLyricsTargetLang(opt.code);
                          setShowLangMenu(false);
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          color: active ? 'var(--accent-primary)' : 'white',
                          fontWeight: active ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: active ? 'rgba(255,255,255,0.08)' : 'transparent',
                        }}
                      >
                        <span>{opt.code === 'auto' ? (t('lyricsLangAuto') || 'Auto') : opt.label}</span>
                        {active && <Check size={12} />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="fs-art-container" onMouseEnter={() => setShowWidgetOverlay(true)} onMouseLeave={() => setShowWidgetOverlay(false)}>
              <img
                key={currentSong?.id || 'art'}
                src={(getCleanThumbnail(currentSong?.thumbnail) || getHighResImage(currentSong?.cover))}
                onError={handleImgError}
                alt="art"
                className="fs-art"
              />

              <div className={`fs-art-overlay ${showWidgetOverlay ? 'visible' : ''}`}>
                <div className="fs-overlay-top">
                  <button className="fs-overlay-btn" onClick={onClose} title="Close Fullscreen"><X size={20} /></button>
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
                    <button onClick={toggleLoopMode} style={{ color: loopMode !== 'off' ? 'var(--accent-primary)' : 'white' }} title={loopMode === 'all' ? t('loopPlaylist') : loopMode === 'one' ? t('loopOne') : t('loopOff')}>{loopMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}</button>
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
          <div className="fs-lyrics-container" ref={widgetLyricsRef} onWheel={handleUserScroll} onTouchMove={handleUserScroll} onMouseDown={handleUserScroll}>
            {lyricsData && lyricsData.length > 0 ? (
              lyricsData.map((line, idx) => {
                const nextLineTime = idx < lyricsData.length - 1 ? lyricsData[idx + 1].time : duration;
                const isActive = (progress - lyricsOffset) >= line.time && (progress - lyricsOffset) < nextLineTime;
                if (line.isInstrumental) return null;
                const transLine = showLyricTranslation && translatedLyrics?.[idx];
                return (
                  <div key={idx} data-lyric-idx={idx} className={`fs-lyric-line ${isActive ? 'active' : ''}`} onClick={() => jumpToLyric(line.time)}>
                    <div>{showRomanized && line.romanizedText ? line.romanizedText : line.text}</div>
                    {transLine && (
                      <div style={{ fontSize: '0.62em', opacity: 0.72, marginTop: '4px', fontWeight: 400 }}>{transLine}</div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="fs-lyric-line active">{plainLyrics || 'Instrumental'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
