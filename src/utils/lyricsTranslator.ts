/**
 * Lightweight Lyrics Translator with localStorage caching.
 * Uses Google Translate's public GTX endpoint via Electron's fetchText (CORS-free)
 * or standard fetch fallback.
 */

const CACHE_KEY = 'donpollo_lyrics_trans_cache';
const MAX_CACHE_ENTRIES = 40;

interface TranslationCacheEntry {
  lines: string[];
  updatedAt: number;
}

function getCache(): Record<string, TranslationCacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveToCache(key: string, lines: string[]) {
  try {
    const cache = getCache();
    cache[key] = { lines, updatedAt: Date.now() };
    const entries = Object.entries(cache);
    if (entries.length > MAX_CACHE_ENTRIES) {
      entries.sort((a, b) => a[1].updatedAt - b[1].updatedAt);
      const trimmed = Object.fromEntries(entries.slice(entries.length - MAX_CACHE_ENTRIES));
      localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
    } else {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export async function translateLyricsLines(
  songId: string,
  lines: string[],
  targetLang: string
): Promise<string[] | null> {
  if (!lines || lines.length === 0) return null;

  const cacheKey = `${songId}_${targetLang}`;
  const cache = getCache();
  if (cache[cacheKey] && cache[cacheKey].lines.length === lines.length) {
    return cache[cacheKey].lines;
  }

  // Filter non-empty lines while keeping index alignment
  const nonEmptyIndices: number[] = [];
  const nonEmptyTexts: string[] = [];
  lines.forEach((line, idx) => {
    const trimmed = (line || '').trim();
    if (trimmed) {
      nonEmptyIndices.push(idx);
      nonEmptyTexts.push(trimmed);
    }
  });

  if (nonEmptyTexts.length === 0) return lines.map(() => '');

  // Translate in chunks of ~35 lines to keep URL length safe
  const CHUNK_SIZE = 35;
  const translatedNonEmpty: string[] = new Array(nonEmptyTexts.length).fill('');

  try {
    for (let start = 0; start < nonEmptyTexts.length; start += CHUNK_SIZE) {
      const chunk = nonEmptyTexts.slice(start, start + CHUNK_SIZE);
      const joined = chunk.join('\n');
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(joined)}`;

      let rawText = '';
      if ((window as any).electronAPI?.fetchText) {
        rawText = await (window as any).electronAPI.fetchText(url);
      } else {
        const res = await fetch(url);
        rawText = await res.text();
      }

      const data = JSON.parse(rawText);
      const fullTranslated = Array.isArray(data?.[0])
        ? data[0].map((seg: any) => seg?.[0] || '').join('')
        : '';

      const splitTranslated = fullTranslated.split('\n');
      for (let i = 0; i < chunk.length; i++) {
        translatedNonEmpty[start + i] = (splitTranslated[i] || '').trim();
      }
    }

    const result = new Array(lines.length).fill('');
    nonEmptyIndices.forEach((origIdx, i) => {
      result[origIdx] = translatedNonEmpty[i] || '';
    });

    saveToCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error('Lyrics translation failed:', err);
    return null;
  }
}
