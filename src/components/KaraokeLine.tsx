import React, { useEffect, useRef, useState } from 'react';
import { computeKaraokeWords, type LyricWord } from '../utils/karaokeLyrics';

interface KaraokeLineProps {
  text: string;
  lineStartTime: number;
  lineEndTime: number;
  currentTime: number;
  isPlaying?: boolean;
  enhancedWords?: LyricWord[];
  activeColor?: string;
  inactiveColor?: string;
  textShadow?: string;
  noSpaces?: boolean;
}

export const KaraokeLine: React.FC<KaraokeLineProps> = ({
  text,
  lineStartTime,
  lineEndTime,
  currentTime,
  isPlaying = true,
  enhancedWords,
  activeColor = '#FFFFFF',
  inactiveColor = 'rgba(255, 255, 255, 0.36)',
  textShadow,
  noSpaces,
}) => {
  const [smoothTime, setSmoothTime] = useState(currentTime);
  const anchorRef = useRef({ baseTime: currentTime, perfNow: performance.now() });

  // Re-anchor whenever audio progress jumps (seek, initial sync, or drift > 120ms)
  useEffect(() => {
    const estimated = isPlaying
      ? anchorRef.current.baseTime + (performance.now() - anchorRef.current.perfNow) / 1000
      : anchorRef.current.baseTime;

    if (!isPlaying || Math.abs(currentTime - estimated) > 0.12 || currentTime < estimated - 0.05) {
      anchorRef.current = { baseTime: currentTime, perfNow: performance.now() };
      setSmoothTime(currentTime);
    }
  }, [currentTime, isPlaying, text, lineStartTime]);

  // Local 60fps requestAnimationFrame loop (only re-renders this single active line)
  useEffect(() => {
    if (!isPlaying) return;
    anchorRef.current = { baseTime: currentTime, perfNow: performance.now() };

    let rafId = 0;
    const tick = () => {
      const nextTime = anchorRef.current.baseTime + (performance.now() - anchorRef.current.perfNow) / 1000;
      setSmoothTime(Math.min(lineEndTime, Math.max(lineStartTime, nextTime)));
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, lineStartTime, lineEndTime, text]);

  const words = computeKaraokeWords(text, lineStartTime, lineEndTime, smoothTime, enhancedWords);
  if (words.length === 0) return <>{text}</>;

  const isCjkNoSpace =
    noSpaces ?? (!text.includes(' ') && /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text));

  return (
    <span style={{ display: 'inline', whiteSpace: 'pre-wrap' }}>
      {words.map((item, idx) => {
        const pct = item.fillPercent;

        return (
          <React.Fragment key={idx}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span style={{ color: inactiveColor, textShadow }}>
                {item.word}
              </span>
              {pct > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    color: activeColor,
                    textShadow,
                    clipPath: pct >= 100 ? undefined : `inset(0 ${(100 - pct).toFixed(1)}% 0 0)`,
                    pointerEvents: 'none',
                    whiteSpace: 'pre',
                  }}
                >
                  {item.word}
                </span>
              )}
            </span>
            {!isCjkNoSpace && idx < words.length - 1 ? ' ' : ''}
          </React.Fragment>
        );
      })}
    </span>
  );
};
