import React, { useEffect, useState } from 'react';
import { Lock, Unlock, X, Minus, Plus } from 'lucide-react';
import { KaraokeLine } from './KaraokeLine';
import type { LyricWord } from '../utils/karaokeLyrics';

export interface LyricsOverlayPayload {
  activeText: string;
  nextText?: string;
  translatedText?: string;
  songTitle?: string;
  artist?: string;
  isPlaying?: boolean;
  karaokeMode?: boolean;
  lineStartTime?: number;
  lineEndTime?: number;
  currentTime?: number;
  enhancedWords?: LyricWord[];
}

export const LyricsOverlay: React.FC = () => {
  const [payload, setPayload] = useState<LyricsOverlayPayload>({
    activeText: '♪ Waiting for lyrics... ♪',
    nextText: '',
    translatedText: '',
    isPlaying: false,
  });
  const [locked, setLocked] = useState(true);
  const [fontSize, setFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('donpollo_overlay_font_size');
      return saved ? Math.min(48, Math.max(16, Number(saved))) : 26;
    } catch {
      return 26;
    }
  });
  const [showNext, setShowNext] = useState<boolean>(() => {
    try {
      return localStorage.getItem('donpollo_overlay_show_next') !== 'false';
    } catch {
      return true;
    }
  });
  const [showTranslated, setShowTranslated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('donpollo_overlay_show_trans') !== 'false';
    } catch {
      return true;
    }
  });
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('donpollo_overlay_bg_opacity'));
      return Number.isFinite(saved) ? Math.min(0.85, Math.max(0, saved)) : 0;
    } catch {
      return 0;
    }
  });
  const [lyricColor, setLyricColor] = useState<string>(() => {
    try {
      return localStorage.getItem('donpollo_overlay_color') || '#FFFFFF';
    } catch {
      return '#FFFFFF';
    }
  });

  useEffect(() => {
    // Ensure completely transparent page canvas
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';

    const api = (window as any).electronAPI;
    if (!api) return;

    const unsubUpdate = api.onLyricsOverlayUpdate?.((data: LyricsOverlayPayload) => {
      if (data) setPayload(data);
    });
    const unsubLock = api.onLyricsOverlayLockState?.((isLocked: boolean) => {
      setLocked(isLocked);
    });

    return () => {
      unsubUpdate?.();
      unsubLock?.();
    };
  }, []);

  const changeFontSize = (delta: number) => {
    setFontSize((prev) => {
      const next = Math.min(48, Math.max(16, prev + delta));
      try {
        localStorage.setItem('donpollo_overlay_font_size', String(next));
      } catch { }
      return next;
    });
  };

  const toggleShowNext = () => {
    setShowNext((prev) => {
      const next = !prev;
      try { localStorage.setItem('donpollo_overlay_show_next', String(next)); } catch { }
      return next;
    });
  };

  const toggleShowTranslated = () => {
    setShowTranslated((prev) => {
      const next = !prev;
      try { localStorage.setItem('donpollo_overlay_show_trans', String(next)); } catch { }
      return next;
    });
  };

  const cycleBgOpacity = () => {
    setBgOpacity((prev) => {
      const next = prev < 0.2 ? 0.4 : prev < 0.6 ? 0.72 : 0;
      try { localStorage.setItem('donpollo_overlay_bg_opacity', String(next)); } catch { }
      return next;
    });
  };

  const changeLyricColor = (hex: string) => {
    setLyricColor(hex);
    try { localStorage.setItem('donpollo_overlay_color', hex); } catch { }
  };

  const api = (window as any).electronAPI;

  const textOutlineStyle: React.CSSProperties = {
    textShadow:
      '0 2px 10px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.95), 1.5px 1.5px 0 rgba(0,0,0,0.9), -1.5px -1.5px 0 rgba(0,0,0,0.9), 1.5px -1.5px 0 rgba(0,0,0,0.9), -1.5px 1.5px 0 rgba(0,0,0,0.9)',
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 18px',
        boxSizing: 'border-box',
        background: locked ? (bgOpacity > 0 ? `rgba(12, 14, 20, ${bgOpacity})` : 'transparent') : 'rgba(15, 16, 22, 0.42)',
        borderRadius: locked ? (bgOpacity > 0 ? '14px' : 0) : '14px',
        border: locked ? 'none' : '1px dashed rgba(255,255,255,0.28)',
        userSelect: 'none',
        pointerEvents: locked ? 'none' : 'auto',
        transition: 'background 0.18s ease',
      }}
    >
      {/* Drag & Control Bar (only visible when Unlocked) */}
      {!locked && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(20, 22, 30, 0.88)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: '999px',
            padding: '4px 10px',
            marginBottom: '8px',
            // @ts-ignore
            WebkitAppRegion: 'drag',
            cursor: 'grab',
          }}
        >
          <span style={{ fontSize: '11px', color: '#D1D5DB', fontWeight: 600, marginRight: '4px' }}>
            Drag to Move
          </span>
          <button
            onClick={() => changeFontSize(-2)}
            title="Smaller Font"
            style={{
              // @ts-ignore
              WebkitAppRegion: 'no-drag',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#fff',
              borderRadius: '6px',
              padding: '3px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Minus size={12} />
          </button>
          <span style={{ fontSize: '11px', color: '#9CA3AF', minWidth: '28px', textAlign: 'center' }}>
            {fontSize}px
          </span>
          <button
            onClick={() => changeFontSize(2)}
            title="Larger Font"
            style={{
              // @ts-ignore
              WebkitAppRegion: 'no-drag',
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#fff',
              borderRadius: '6px',
              padding: '3px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Plus size={12} />
          </button>
          <button
            onClick={toggleShowNext}
            title="Toggle Baris Berikutnya"
            style={{
              // @ts-ignore
              WebkitAppRegion: 'no-drag',
              background: showNext ? 'rgba(88, 101, 242, 0.35)' : 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#fff',
              borderRadius: '6px',
              padding: '3px 7px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Next
          </button>
          <button
            onClick={toggleShowTranslated}
            title="Toggle Terjemahan"
            style={{
              // @ts-ignore
              WebkitAppRegion: 'no-drag',
              background: showTranslated ? 'rgba(88, 101, 242, 0.35)' : 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#fff',
              borderRadius: '6px',
              padding: '3px 7px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Trans
          </button>
          <button
            onClick={cycleBgOpacity}
            title="Ubah Opasitas Background saat Locked"
            style={{
              // @ts-ignore
              WebkitAppRegion: 'no-drag',
              background: bgOpacity > 0 ? 'rgba(88, 101, 242, 0.35)' : 'rgba(255,255,255,0.08)',
              border: 'none',
              color: '#fff',
              borderRadius: '6px',
              padding: '3px 7px',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            BG {Math.round(bgOpacity * 100)}%
          </button>
          <div
            style={{
              // @ts-ignore
              WebkitAppRegion: 'no-drag',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '0 4px',
            }}
            title="Warna Lirik Overlay"
          >
            {['#FFFFFF', '#38BDF8', '#34D399', '#FBBF24', '#F472B6'].map((c) => (
              <button
                key={c}
                onClick={() => changeLyricColor(c)}
                style={{
                  width: '13px',
                  height: '13px',
                  borderRadius: '50%',
                  background: c,
                  border: lyricColor.toUpperCase() === c ? '2px solid #5865F2' : '1px solid rgba(255,255,255,0.45)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
            <input
              type="color"
              value={lyricColor}
              onChange={(e) => changeLyricColor(e.target.value)}
              title="Pilih warna kustom"
              style={{ width: '16px', height: '16px', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
            />
          </div>
          <button
            onClick={() => api?.setLyricsOverlayLock?.(true)}
            title="Lock (Click-Through for Games)"
            style={{
              // @ts-ignore
              WebkitAppRegion: 'no-drag',
              background: '#5865F2',
              border: 'none',
              color: '#fff',
              borderRadius: '999px',
              padding: '3px 9px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Lock size={11} /> Lock
          </button>
          <button
            onClick={() => api?.closeLyricsOverlay?.()}
            title="Close Overlay"
            style={{
              // @ts-ignore
              WebkitAppRegion: 'no-drag',
              background: 'rgba(239, 68, 68, 0.2)',
              border: 'none',
              color: '#FCA5A5',
              borderRadius: '999px',
              padding: '3px 5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Floating Lyrics Text */}
      <style>{`
        @keyframes overlayLyricEnter {
          0% {
            opacity: 0.55;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes overlayNextEnter {
          0% {
            opacity: 0.45;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div style={{ textAlign: 'center', maxWidth: '100%' }}>
        <div
          key={`${payload.lineStartTime ?? ''}:${payload.activeText}`}
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: 800,
            color: lyricColor,
            lineHeight: 1.25,
            letterSpacing: '0.2px',
            animation: 'overlayLyricEnter 0.26s cubic-bezier(0.25, 1, 0.5, 1) both',
            ...(payload.karaokeMode ? {} : textOutlineStyle),
          }}
        >
          {payload.karaokeMode &&
            typeof payload.lineStartTime === 'number' &&
            typeof payload.lineEndTime === 'number' &&
            typeof payload.currentTime === 'number' &&
            payload.lineEndTime > payload.lineStartTime ? (
            <KaraokeLine
              text={payload.activeText || '♪ ♪ ♪'}
              lineStartTime={payload.lineStartTime}
              lineEndTime={payload.lineEndTime}
              currentTime={payload.currentTime}
              isPlaying={payload.isPlaying}
              enhancedWords={payload.enhancedWords}
              activeColor={lyricColor}
              inactiveColor="rgba(255, 255, 255, 0.42)"
              textShadow={textOutlineStyle.textShadow as string}
            />
          ) : (
            payload.activeText || '♪ ♪ ♪'
          )}
        </div>

        {showTranslated && !!payload.translatedText && (
          <div
            style={{
              fontSize: `${Math.max(13, Math.round(fontSize * 0.62))}px`,
              fontWeight: 600,
              color: '#A5B4FC',
              marginTop: '4px',
              lineHeight: 1.25,
              ...textOutlineStyle,
            }}
          >
            {payload.translatedText}
          </div>
        )}

        {showNext && !!payload.nextText && (
          <div
            key={payload.nextText}
            style={{
              fontSize: `${Math.max(12, Math.round(fontSize * 0.58))}px`,
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.68)',
              marginTop: '4px',
              lineHeight: 1.25,
              animation: 'overlayNextEnter 0.24s cubic-bezier(0.25, 1, 0.5, 1) both',
              ...textOutlineStyle,
            }}
          >
            {payload.nextText}
          </div>
        )}
      </div>

      {!locked && (
        <div style={{ position: 'absolute', bottom: '4px', right: '10px', fontSize: '10px', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Unlock size={10} /> Ctrl+Shift+K to Lock/Unlock
        </div>
      )}
    </div>
  );
};
