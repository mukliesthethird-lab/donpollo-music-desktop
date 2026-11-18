import type { VibeType } from './vibeRecommendation';

const BPM_CACHE_KEY = 'donpollo_bpm_cache';
const MAX_BPM_CACHE = 250;

function getBpmCache(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BPM_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveBpmCache(cache: Record<string, number>) {
  try {
    const entries = Object.entries(cache);
    if (entries.length > MAX_BPM_CACHE) {
      localStorage.setItem(BPM_CACHE_KEY, JSON.stringify(Object.fromEntries(entries.slice(-MAX_BPM_CACHE))));
    } else {
      localStorage.setItem(BPM_CACHE_KEY, JSON.stringify(cache));
    }
  } catch {}
}

function makeTrackKey(title: string, artist: string): string {
  return `${(artist || '').toLowerCase().trim()}__${(title || '').toLowerCase().trim()}`;
}

async function fetchJsonWithTimeout(
  url: string,
  fetchUrlFn?: (url: string) => Promise<any>,
  timeoutMs = 2500
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) return await res.json();
    } catch {
      if (fetchUrlFn) {
        const raw = await Promise.race([
          fetchUrlFn(url),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeoutMs))
        ]);
        return typeof raw === 'string' ? JSON.parse(raw) : raw;
      }
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
  return null;
}

/**
 * Fetches track BPM from Deezer's free public API (no API key required) with localStorage caching.
 */
export async function fetchTrackBpm(
  title: string,
  artist: string,
  fetchUrlFn?: (url: string) => Promise<any>
): Promise<number | null> {
  const key = makeTrackKey(title, artist);
  const cache = getBpmCache();
  if (typeof cache[key] === 'number') {
    return cache[key] > 0 ? cache[key] : null;
  }

  const cleanTitle = (title || '').replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
  const cleanArtist = (artist || '').split(/[,&]/)[0].trim();
  if (!cleanTitle) return null;

  const q = cleanArtist ? `artist:"${cleanArtist}" track:"${cleanTitle}"` : cleanTitle;
  const searchData = await fetchJsonWithTimeout(
    `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`,
    fetchUrlFn
  );

  const trackId = searchData?.data?.[0]?.id;
  if (!trackId) {
    cache[key] = 0;
    saveBpmCache(cache);
    return null;
  }

  const trackDetail = await fetchJsonWithTimeout(`https://api.deezer.com/track/${trackId}`, fetchUrlFn);
  const bpm = typeof trackDetail?.bpm === 'number' && trackDetail.bpm > 0 ? Math.round(trackDetail.bpm) : 0;

  cache[key] = bpm;
  saveBpmCache(cache);
  return bpm > 0 ? bpm : null;
}

const SAD_KEYWORDS = /\b(sad|cry|crying|tears|broken|heartbreak|lonely|alone|goodbye|bye|die|death|grief|pain|hurt|sorry|regret|miss you|missing|empty|dark|ghost|galau|sedih|luka|pergi|hancur|menangis|duka|kecewa|sesal|pilu|sepi|hilang|sendiri|menunggu|lelah|rapuh)\b/i;
const HAPPY_KEYWORDS = /\b(happy|sunshine|sun|smile|laugh|dance|dancing|party|good|bright|joy|celebrate|summer|paradise|magic|love|kiss|golden|feel good|ceria|bahagia|senyum|menari|cerah|bersama|indah|asik|sempurna)\b/i;
const CHILL_KEYWORDS = /\b(chill|lofi|lo-fi|coffee|cafe|breeze|soft|calm|dream|moon|sunset|night|midnight|slow|ocean|rain|cloud|warm|cozy|santai|tenang|senja|kopi|malam|angin|teduh|nyaman)\b/i;
const ENERGETIC_KEYWORDS = /\b(fire|power|run|hype|jump|thunder|electric|beat|club|gym|workout|fast|rush|boom|wild|alive|unstoppable|champion|energy|semangat|api|lari|menggila|juara|bangkit)\b/i;

export interface MoodScores {
  happy: number;
  sad: number;
  chill: number;
  energetic: number;
}

/**
 * Multi-signal mood scoring: Genre (iTunes) + Tempo/BPM (Deezer) + Title/Album Keywords.
 */
export function computeMoodScores(track: any, bpm?: number | null): MoodScores {
  const scores: MoodScores = { happy: 0, sad: 0, chill: 0, energetic: 0 };
  const text = `${track?.title || ''} ${track?.album || ''}`.trim();
  const genre = (track?.genre || '').toLowerCase();

  // 1. Genre signal
  if (/dance|electronic|edm|disco|funk|house/.test(genre)) {
    scores.energetic += 25;
    scores.happy += 20;
    scores.sad -= 20;
  } else if (/pop|k-pop|j-pop/.test(genre)) {
    scores.happy += 12;
    scores.energetic += 8;
  } else if (/r&b|soul|jazz|indie|alternative|lo-fi/.test(genre)) {
    scores.chill += 22;
    scores.sad += 6;
  } else if (/singer\/songwriter|acoustic|classical|folk|soundtrack/.test(genre)) {
    scores.sad += 18;
    scores.chill += 16;
    scores.energetic -= 20;
  } else if (/rock|metal|punk|hip-hop|rap/.test(genre)) {
    scores.energetic += 18;
  }

  // 2. Tempo / BPM signal
  if (bpm && bpm > 0) {
    if (bpm >= 122) {
      scores.energetic += 35;
      scores.happy += 18;
      scores.sad -= 30;
    } else if (bpm >= 105) {
      scores.happy += 26;
      scores.energetic += 14;
      scores.sad -= 12;
    } else if (bpm >= 85) {
      scores.chill += 24;
    } else {
      scores.sad += 30;
      scores.chill += 15;
      scores.happy -= 22;
      scores.energetic -= 30;
    }
  }

  // 3. Keyword signal
  if (SAD_KEYWORDS.test(text)) {
    scores.sad += 38;
    scores.happy -= 45;
    scores.energetic -= 40;
  }
  if (HAPPY_KEYWORDS.test(text)) {
    scores.happy += 32;
    scores.sad -= 35;
  }
  if (CHILL_KEYWORDS.test(text)) {
    scores.chill += 30;
    scores.energetic -= 15;
  }
  if (ENERGETIC_KEYWORDS.test(text)) {
    scores.energetic += 32;
    scores.sad -= 35;
  }

  return scores;
}

/**
 * Enriches candidate tracks with BPM (in fast bounded batches) and filters/ranks them
 * so only tracks matching the target vibe remain.
 */
export async function filterAndRankByMood(
  tracks: any[],
  targetVibe: VibeType,
  fetchUrlFn?: (url: string) => Promise<any>
): Promise<any[]> {
  if (!tracks || tracks.length === 0) return [];

  // Limit BPM lookups to top 30 candidates in batches of 6 for speed
  const toCheck = tracks.slice(0, 30);
  const bpmMap = new Map<number, number | null>();

  for (let i = 0; i < toCheck.length; i += 6) {
    const batch = toCheck.slice(i, i + 6);
    const bpms = await Promise.all(
      batch.map(t => fetchTrackBpm(t.title, t.artist, fetchUrlFn).catch(() => null))
    );
    bpms.forEach((b, idx) => {
      bpmMap.set(i + idx, b);
    });
  }

  const scored = tracks.map((track, idx) => {
    const bpm = bpmMap.get(idx) ?? null;
    const scores = computeMoodScores(track, bpm);
    const targetScore = scores[targetVibe];

    // Check if an opposite mood strongly dominates
    const isConflicting =
      (targetVibe === 'happy' && scores.sad > scores.happy + 10) ||
      (targetVibe === 'energetic' && scores.sad > scores.energetic + 10) ||
      (targetVibe === 'sad' && (scores.happy > scores.sad + 15 || scores.energetic > scores.sad + 15));

    return {
      track: {
        ...track,
        bpm: bpm || track.bpm,
        detectedMoodScores: scores,
      },
      targetScore,
      isConflicting,
    };
  });

  const filtered = scored
    .filter(item => !item.isConflicting && item.targetScore >= 0)
    .sort((a, b) => b.targetScore - a.targetScore)
    .map(item => item.track);

  // Fallback: if strict filtering left fewer than 12 tracks, relax to non-conflicting
  if (filtered.length < 12) {
    return scored
      .filter(item => !item.isConflicting)
      .sort((a, b) => b.targetScore - a.targetScore)
      .map(item => item.track);
  }

  return filtered;
}
