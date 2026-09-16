/**
 * Audio Ranking & Query Optimization Helper for Don Pollo Music
 * 
 * Prioritizes official album audio and studio master releases over music videos (MV),
 * ensuring LRCLib synchronized lyrics remain accurate and aligned without video intro/outro offsets.
 */

export interface AudioBadge {
  type: 'audio' | 'lyrics' | 'video';
  label: string;
}

/**
 * Checks if query explicitly requested a video, live version, cover, or remix.
 */
export function userExplicitlyWantsVideo(query: string): boolean {
  return /\b(video|mv|m\/v|clip|film|official video|music video)\b/i.test(query);
}

export function userExplicitlyWantsLive(query: string): boolean {
  return /\b(live|concert|tour|acoustic|performance|festival|unplugged)\b/i.test(query);
}

/**
 * Checks if we should append 'official audio' to the search query.
 */
export function shouldAppendAudioKeyword(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 2) return false;
  if (userExplicitlyWantsVideo(trimmed) || userExplicitlyWantsLive(trimmed)) return false;
  if (/\b(audio|official audio|topic|remix|cover|karaoke|instrumental|soundtrack|ost)\b/i.test(trimmed)) return false;
  return true;
}

/**
 * Builds the smart search query to request official audio from YouTube API.
 */
export function buildSmartSearchQuery(query: string, preferOfficialAudio = true): string {
  const clean = query.trim();
  if (!preferOfficialAudio || !shouldAppendAudioKeyword(clean)) {
    return clean;
  }
  return `${clean} official audio`;
}

/**
 * Calculates an audio-relevance score for a search result.
 */
export function scoreAudioResult(item: any, originalQuery: string, targetDuration = 0): number {
  if (!item) return 0;
  const title = (item.title || '').toLowerCase();
  const q = (originalQuery || '').toLowerCase();
  let score = 100;

  const wantsVideo = userExplicitlyWantsVideo(q);
  const wantsLive = userExplicitlyWantsLive(q);

  // 1. Duration proximity to expected track duration (if targetDuration provided)
  if (targetDuration > 0 && item.duration > 0) {
    const diff = Math.abs(item.duration - targetDuration);
    if (diff <= 2) score += 70;
    else if (diff <= 5) score += 45;
    else if (diff <= 10) score += 20;
    else if (diff <= 20) score -= 15;
    else if (diff > 30) score -= 60;
    else if (diff > 60) score -= 120;
  }

  // 2. Official Audio boosts
  if (/\b(official audio|official track)\b/i.test(title)) {
    score += 85;
  } else if (/\b(audio)\b/i.test(title) || /\[audio\]|\(audio\)/i.test(title)) {
    score += 65;
  }

  // 3. Lyric videos boost (lyric videos almost always use the official album audio)
  if (/\b(official lyric video|lyric video|lyrics|lirik)\b/i.test(title)) {
    score += 40;
  }

  // 4. Topic channel / Clean tracks without 'video' or 'mv'
  if (!/\b(video|mv|m\/v|teaser|trailer)\b/i.test(title)) {
    score += 30;
  }

  // 5. Music Video penalties (when user didn't ask for video)
  if (!wantsVideo) {
    if (/\b(official music video|official video|music video)\b/i.test(title)) {
      score -= 75;
    } else if (/\bmv\b/i.test(title) || /\bm\/v\b/i.test(title) || /\[mv\]|\(mv\)/i.test(title)) {
      score -= 65;
    } else if (/\bvideo\b/i.test(title)) {
      score -= 40;
    }
  }

  // 6. Live / Concert / Non-studio penalties
  if (!wantsLive) {
    if (/\b(live|concert|tour|performance|acoustic)\b/i.test(title)) {
      score -= 80;
    }
  }

  // 7. Non-music content penalties
  if (/\b(reaction|parody|behind the scenes|making of|interview|teaser|dance practice|trailer)\b/i.test(title)) {
    score -= 130;
  }

  // 8. Abnormal track length penalty (too short or extremely long mixes)
  if (item.duration > 0 && (item.duration < 50 || item.duration > 660)) {
    score -= 40;
  }

  return score;
}

/**
 * Re-ranks results to prioritize official audio, lyric videos, and studio masters.
 */
export function rankAudioResults(results: any[], originalQuery: string, targetDuration = 0): any[] {
  if (!results || !Array.isArray(results) || results.length === 0) return [];
  return [...results].sort((a, b) => {
    const scoreA = scoreAudioResult(a, originalQuery, targetDuration);
    const scoreB = scoreAudioResult(b, originalQuery, targetDuration);
    return scoreB - scoreA;
  });
}

/**
 * Search official songs from iTunes / Apple Music catalog.
 * Returns clean tracks with official artist names, clean titles, square album art, and accurate studio durations.
 */
export async function searchItunesTracks(
  query: string,
  limit = 8,
  fetchUrlFn?: (url: string) => Promise<any>
): Promise<any[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const targetUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=${Math.max(limit * 2, 20)}`;

  try {
    let data: any;
    try {
      const res = await fetch(targetUrl);
      if (res.ok) {
        data = await res.json();
      }
    } catch {
      // Direct fetch failed (e.g. offline or renderer restriction), try IPC fetchUrlFn
      if (fetchUrlFn) {
        try {
          data = await fetchUrlFn(targetUrl);
        } catch {}
      }
    }

    if (!data && fetchUrlFn) {
      try {
        data = await fetchUrlFn(targetUrl);
      } catch {}
    }

    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { }
    }

    if (!data || !data.results || !Array.isArray(data.results)) {
      return [];
    }

    // Deduplicate by clean title and artist
    const seen = new Set<string>();
    const formatted: any[] = [];

    for (const t of data.results) {
      if (!t.trackName || !t.artistName) continue;
      const key = `${t.trackName.toLowerCase()}_${t.artistName.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const highResArt = (t.artworkUrl600 || t.artworkUrl160 || t.artworkUrl100 || t.artworkUrl60 || '')
        .replace('100x100bb.jpg', '500x500bb.jpg')
        .replace('100x100bb.png', '500x500bb.png')
        .replace('160x160bb.jpg', '600x600bb.jpg');

      formatted.push({
        id: null,
        title: t.trackName,
        artist: t.artistName,
        thumbnail: highResArt,
        duration: (t.trackTimeMillis && t.trackTimeMillis > 0) ? Math.floor(t.trackTimeMillis / 1000) : 0,
        originalQuery: `${t.artistName} ${t.trackName} official audio`,
        isPodcast: false,
        source: 'itunes'
      });

      if (formatted.length >= limit) break;
    }

    return formatted;
  } catch (err) {
    console.error('searchItunesTracks error:', err);
    return [];
  }
}

/**
 * Returns a UI badge object describing the media type.
 */
export function getAudioBadge(item: any): AudioBadge | null {
  if (!item || !item.title) return null;
  if (item.source === 'itunes') {
    return { type: 'audio', label: 'Audio' };
  }
  const title = item.title.toLowerCase();

  // Explicit audio or clean topic release
  if (/\b(official audio|audio)\b/i.test(title) || /\[audio\]|\(audio\)/i.test(title)) {
    return { type: 'audio', label: 'Audio' };
  }

  // Lyric video
  if (/\b(lyric|lyrics|lirik)\b/i.test(title) && !/\b(official music video|music video)\b/i.test(title)) {
    return { type: 'lyrics', label: 'Lirik' };
  }

  // Music video
  if (/\b(official music video|official video|music video|mv|m\/v)\b/i.test(title) || /\[mv\]|\(mv\)/i.test(title)) {
    return { type: 'video', label: 'MV' };
  }

  // Clean studio / topic release (default clean song with no video in title)
  if (!/\b(video|live|concert|teaser|performance)\b/i.test(title)) {
    return { type: 'audio', label: 'Audio' };
  }

  return null;
}

