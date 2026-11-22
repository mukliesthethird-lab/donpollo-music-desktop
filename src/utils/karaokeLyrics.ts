export interface LyricWord {
  text: string;
  startTime?: number; // seconds
  endTime?: number; // seconds
  weight: number;
}

export interface KaraokeWordState {
  word: string;
  fillPercent: number; // 0..100
}

const WORD_TAG_RE = /<(\d{2}):(\d{2})\.(\d{2,3})>/g;
const YRC_LINE_RE = /^\[(\d+),(\d+)\](.*)$/;
const YRC_WORD_RE = /\((\d+),(\d+),\d+\)([^()]*)/g;

/**
 * Parses NetEase YRC word-synced lyrics format:
 * [18940,3660](18940,270,0)We're (19210,180,0)no ...
 */
export function parseNetEaseYRC(
  yrc: string
): { time: number; text: string; isInstrumental?: boolean; words?: LyricWord[] }[] | null {
  if (!yrc) return null;
  const parsed: { time: number; text: string; isInstrumental?: boolean; words?: LyricWord[] }[] = [];

  for (const rawLine of yrc.split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('{')) continue;

    const lineMatch = trimmed.match(YRC_LINE_RE);
    if (!lineMatch) continue;

    const lineStartSec = parseInt(lineMatch[1], 10) / 1000;
    const body = lineMatch[3] || '';
    const wordMatches = Array.from(body.matchAll(YRC_WORD_RE));

    if (wordMatches.length === 0) {
      const clean = body.trim();
      if (!clean || clean === '♪' || clean === '♩') {
        parsed.push({ time: lineStartSec, text: '', isInstrumental: true });
      } else {
        parsed.push({ time: lineStartSec, text: clean });
      }
      continue;
    }

    const words: LyricWord[] = [];
    let joinedText = '';
    for (const wm of wordMatches) {
      const wStart = parseInt(wm[1], 10) / 1000;
      const wDur = parseInt(wm[2], 10) / 1000;
      const wRaw = wm[3] || '';
      joinedText += wRaw;
      const wClean = wRaw.trim();
      if (wClean) {
        words.push({
          text: wClean,
          startTime: wStart,
          endTime: wStart + Math.max(0.06, wDur),
          weight: computeWordWeight(wClean),
        });
      }
    }

    const finalText = joinedText.replace(/\s+/g, ' ').trim();
    if (!finalText) {
      parsed.push({ time: lineStartSec, text: '', isInstrumental: true });
    } else {
      parsed.push({
        time: lineStartSec,
        text: finalText,
        words: words.length > 0 ? words : undefined,
      });
    }
  }

  return parsed.length > 0 ? injectInstrumentalCues(parsed) : null;
}

/**
 * Inserts instrumental countdown markers (• • •) for intros >= 3s
 * and gaps >= 4s between lines so users get a 3-2-1 cue before vocals enter.
 */
export function injectInstrumentalCues<
  T extends { time: number; text: string; isInstrumental?: boolean; words?: LyricWord[] }
>(lines: T[]): T[] {
  if (!lines || lines.length === 0) return lines;
  const result: T[] = [];

  // Intro cue if first lyric line starts at >= 3.0s
  if (!lines[0].isInstrumental && lines[0].time >= 3.0) {
    result.push({ time: 0, text: '', isInstrumental: true } as T);
  }

  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i];
    result.push(cur);

    if (i + 1 < lines.length && !cur.isInstrumental && !lines[i + 1].isInstrumental) {
      const lastWordEnd =
        cur.words && cur.words.length > 0
          ? cur.words[cur.words.length - 1].endTime ?? cur.words[cur.words.length - 1].startTime ?? cur.time
          : cur.time + 2.5;
      const gap = lines[i + 1].time - lastWordEnd;
      if (gap >= 4.0) {
        result.push({ time: Number((lastWordEnd + 0.4).toFixed(3)), text: '', isInstrumental: true } as T);
      }
    }
  }

  return result;
}

/**
 * Parses Enhanced LRC word tags (<mm:ss.xx>) if present on a line.
 * Returns clean display text plus optional per-word timestamps.
 */
export function parseEnhancedLrcLine(rawText: string): {
  cleanText: string;
  words?: LyricWord[];
} {
  if (!rawText || !rawText.includes('<')) {
    return { cleanText: rawText.trim() };
  }

  const matches = Array.from(rawText.matchAll(WORD_TAG_RE));
  if (matches.length === 0) {
    return { cleanText: rawText.trim() };
  }

  const words: LyricWord[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    const ms = parseInt(m[3].padEnd(3, '0'), 10);
    const startTime = min * 60 + sec + ms / 1000;

    const textStart = (m.index ?? 0) + m[0].length;
    const textEnd = i + 1 < matches.length ? (matches[i + 1].index ?? rawText.length) : rawText.length;
    const chunk = rawText.slice(textStart, textEnd).trim();
    if (chunk) {
      words.push({
        text: chunk,
        startTime,
        weight: computeWordWeight(chunk),
      });
    }
  }

  const cleanText = rawText.replace(WORD_TAG_RE, '').replace(/\s+/g, ' ').trim();
  return {
    cleanText,
    words: words.length > 0 ? words : undefined,
  };
}

function computeWordWeight(word: string): number {
  const base = Math.max(1, word.replace(/[.,!?;:'"()[\]~-]/g, '').length);
  let bonus = 0;
  if (/[,;:]/.test(word)) bonus += 1.5;
  if (/[.!?]/.test(word)) bonus += 2.5;
  return base + bonus;
}

function tokenizeLine(text: string): string[] {
  const trimmed = (text || '').trim();
  if (!trimmed) return [];
  // If text has spaces, split into words; otherwise (e.g. Japanese/Chinese without spaces), split characters
  if (trimmed.includes(' ')) {
    return trimmed.split(/\s+/).filter(Boolean);
  }
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(trimmed)) {
    return Array.from(trimmed);
  }
  return [trimmed];
}

/**
 * Computes progressive fill (0..100%) for every word in a lyric line.
 * Uses exact Enhanced LRC timestamps when available, or weighted proportional interpolation otherwise.
 */
export function computeKaraokeWords(
  text: string,
  lineStartTime: number,
  lineEndTime: number,
  currentTime: number,
  enhancedWords?: LyricWord[]
): KaraokeWordState[] {
  if (enhancedWords && enhancedWords.length > 0) {
    const safeEnd = Math.max(lineStartTime + 0.5, lineEndTime);
    return enhancedWords.map((w, idx) => {
      const start = w.startTime ?? lineStartTime;
      const nextStart =
        idx + 1 < enhancedWords.length
          ? (enhancedWords[idx + 1].startTime ?? safeEnd)
          : Math.min(safeEnd, start + Math.max(0.4, w.weight * 0.14));
      // Prefer exact endTime from forced alignment so silent pauses don't stretch or prematurely highlight words
      const end = w.endTime && w.endTime > start ? Math.min(nextStart, w.endTime) : nextStart;
      const span = Math.max(0.08, end - start);
      const rawPct = ((currentTime - start) / span) * 100;
      return {
        word: w.text,
        fillPercent: Math.max(0, Math.min(100, rawPct)),
      };
    });
  }

  const tokens = tokenizeLine(text);
  if (tokens.length === 0) return [];

  // Cap active singing window so long instrumental tails don't drag out short lines
  const rawDuration = Math.max(0.5, lineEndTime - lineStartTime);
  const estimatedSingingWindow = Math.min(rawDuration, Math.max(1.2, tokens.length * 0.85 + 0.8));
  const effectiveDuration = Math.min(rawDuration, estimatedSingingWindow);

  const weights = tokens.map(computeWordWeight);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;

  const elapsed = Math.max(0, currentTime - lineStartTime);
  let cursorTime = 0;

  return tokens.map((word, i) => {
    const wordDuration = (weights[i] / totalWeight) * effectiveDuration;
    const wordStart = cursorTime;
    cursorTime += wordDuration;

    const rawPct = wordDuration > 0 ? ((elapsed - wordStart) / wordDuration) * 100 : 100;
    return {
      word,
      fillPercent: Math.max(0, Math.min(100, rawPct)),
    };
  });
}
