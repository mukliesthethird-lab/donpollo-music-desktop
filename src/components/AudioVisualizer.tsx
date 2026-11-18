import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  variant?: 'compact' | 'theater';
  barCount?: number;
  height?: number;
  className?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  isPlaying,
  variant = 'compact',
  barCount = 36,
  height = 28,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const smoothedRef = useRef<Float32Array>(new Float32Array(barCount));

  useEffect(() => {
    if (smoothedRef.current.length !== barCount) {
      smoothedRef.current = new Float32Array(barCount);
    }
  }, [barCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const getAccentColor = () => {
      const style = getComputedStyle(document.documentElement);
      return style.getPropertyValue('--accent-primary').trim() || '#1db954';
    };

    let running = true;

    const draw = () => {
      if (!running) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
          canvas.width = Math.floor(rect.width * dpr);
          canvas.height = Math.floor(rect.height * dpr);
        }
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (analyser && dataArray && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      }

      const accent = getAccentColor();
      const gap = (variant === 'theater' ? 4 : 2.5) * dpr;
      const totalGap = gap * (barCount - 1);
      const barWidth = Math.max(2 * dpr, (w - totalGap) / barCount);

      let hasActiveEnergy = false;

      for (let i = 0; i < barCount; i++) {
        let target = 0;
        if (analyser && dataArray && isPlaying) {
          // Focus on musical frequency range (skip very highest bins which are often empty)
          const usableBins = Math.max(barCount, Math.floor(dataArray.length * 0.72));
          const binIndex = Math.min(dataArray.length - 1, Math.floor((i / barCount) * usableBins));
          target = dataArray[binIndex] / 255;
        }

        // Smooth attack / decay
        const prev = smoothedRef.current[i] || 0;
        const next = target > prev ? prev + (target - prev) * 0.45 : prev * 0.86;
        smoothedRef.current[i] = next;

        if (next > 0.01) hasActiveEnergy = true;

        const barH = Math.max(2 * dpr, next * (h * 0.92));
        const x = i * (barWidth + gap);
        const y = h - barH;

        ctx.fillStyle = accent;
        ctx.globalAlpha = variant === 'theater' ? 0.35 + next * 0.55 : 0.25 + next * 0.55;

        const radius = Math.min(barWidth / 2, 3 * dpr);
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barH, [radius, radius, 0, 0]);
        } else {
          ctx.rect(x, y, barWidth, barH);
        }
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      if (isPlaying || hasActiveEnergy) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      running = false;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [analyser, isPlaying, barCount, variant]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: '100%',
        height: `${height}px`,
        display: 'block',
        pointerEvents: 'none',
      }}
    />
  );
};
