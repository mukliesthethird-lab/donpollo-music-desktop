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
  return /\b(live|concert|tour|performance|festival|unplugged)\b/i.test(query);
}

export function userExplicitlyWantsRemix(query: string): boolean {
  return /\b(remix|club mix|extended mix|mashup|bootleg|flip|vip mix)\b/i.test(query);
}

export function userExplicitlyWantsAcoustic(query: string): boolean {
  return /\b(acoustic|unplugged)\b/i.test(query);
}

/**
 * Checks if a track is an unwanted variant (remix, acoustic, live, cover, karaoke, playlist compilation, etc.)
 */
export function isUnwantedTrackVariant(title?: string, artist?: string): boolean {
  const t = (title || '').trim();
  const a = (artist || '').trim();
  const s = t.toLowerCase();
  const art = a.toLowerCase();

  // 1. Long compilations, mix playlists, DJ sets, user playlist rips
  if (/\b(playlist|compilation|greatest hits|full album|nonstop|best songs of|top songs of|album audio|mashup|jukebox|10 hours|1 hour)\b/i.test(s)) return true;
  if (/\b(spotify|apple music|discover weekly|release radar|daily mix)\b/i.test(s)) return true;
  if (/\b(underrated|trending|viral|tiktok|reels)\s*(rap|pop|indie|r&b|rock|edm)?\s*songs\b/i.test(s)) return true;
  if (/\b(playlist|compilation|nonstop)\b/i.test(art)) return true;

  // 2. Live concert / tour recordings (while preserving studio songs like 'Long Live', 'Live Forever', 'Live Your Life')
  if (/(\(|\[)[^)\]]*\b(live|concert|tour|unplugged|session)\b[^)\]]*(\)|\])/i.test(s)) return true;
  if (/[-–—|]\s*[^(\[]*\b(live|concert|tour|unplugged|session)\b/i.test(s)) return true;
  if (/\b(live at|live in|live from|live on|live session|live version|live acoustic|live performance|recorded live|recorded at)\b/i.test(s)) return true;
  if (/\b(concert|tour|unplugged)\s*$/i.test(s)) return true;
  if (/[-–—\s]live\s*$/i.test(s) && !/^(long live|live)$/i.test(s)) return true;

  // 3. Acoustic versions & sessions
  if (/\b(acoustic|unplugged)\b/i.test(s) || /\b(acoustic|unplugged)\b/i.test(art)) return true;

  // 4. Remixes, club mixes, bootlegs, VIP mixes, dubs, extended edits
  if (/\b(remix|club mix|extended mix|vip mix|bootleg|flip|dj mix|mashup|re-mix|dub|dub mix|dub version|extended version|extended edit|radio edit|club edit)\b/i.test(s)) return true;
  if (/(\(|\[)[^)\]]*\b(dub|extended|edit)\b[^)\]]*(\)|\])/i.test(s)) return true;
  if (/\b(remix|dub)\b/i.test(art)) return true;

  // 5. Covers, tributes, karaoke, instrumental backing tracks
  if (/\b(cover|tribute|karaoke|instrumental|backing track|off vocal|fingerstyle|guitar cover|piano cover|drum cover)\b/i.test(s)) return true;
  if (/\b(cover|tribute|karaoke|instrumental)\b/i.test(art)) return true;

  // 6. Audio modifications (slowed, reverb, sped up, nightcore, bass boosted, 8d audio)
  if (/\b(slowed|reverb|sped\s*up|speed\s*up|nightcore|bass\s*boosted|8d\s*audio|pitch\s*shifted|tiktok\s*version)\b/i.test(s)) return true;
  if (/\b(slowed|sped\s*up|nightcore)\b/i.test(art)) return true;

  return false;
}

/**
 * Checks if we should append 'official audio' to the search query.
 */
export function shouldAppendAudioKeyword(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < 2) return false;
  if (userExplicitlyWantsVideo(trimmed) || userExplicitlyWantsLive(trimmed) || userExplicitlyWantsRemix(trimmed) || userExplicitlyWantsAcoustic(trimmed)) return false;
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
  const wantsRemix = userExplicitlyWantsRemix(q);
  const wantsAcoustic = userExplicitlyWantsAcoustic(q);

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

  // 6. Live / Concert / Non-studio penalties (when user didn't ask for live)
  if (!wantsLive) {
    if (/\b(live|concert|tour|performance)\b/i.test(title)) {
      score -= 90;
    }
  }

  // 7. Acoustic penalties (when user didn't ask for acoustic)
  if (!wantsAcoustic) {
    if (/\b(acoustic|unplugged)\b/i.test(title)) {
      score -= 90;
    }
  }

  // 8. Remix penalties (when user didn't ask for remix)
  if (!wantsRemix) {
    if (/\b(remix|club mix|extended mix|mashup|bootleg|flip|vip mix)\b/i.test(title)) {
      score -= 100;
    }
  }

  // 9. Cover / Karaoke / Slowed / Sped up penalties
  if (/\b(cover|tribute|karaoke|instrumental|slowed|reverb|sped\s*up|speed\s*up|nightcore)\b/i.test(title)) {
    score -= 130;
  }

  // 10. Non-music content penalties
  if (/\b(reaction|parody|behind the scenes|making of|interview|teaser|dance practice|trailer)\b/i.test(title)) {
    score -= 130;
  }

  // 11. Abnormal track length penalty (too short or extremely long mixes)
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
 * Formats a YouTube / YouTube Music track so that title and artist match clean Spotify standards:
 * - Title: pure song title without video clutter ('Official Video', '[MV]', '(Lyrics)', resolution tags, etc.)
 * - Artist: real musical artist (cleans aggregator channels, VEVO, '- Topic', detects singer from 'Artist - Title')
 * - Thumbnail: upgraded high-res thumbnail
 * - Direct playable YouTube ID
 */
export function formatTrackLikeSpotify(item: any, artistHint = ''): any {
  if (!item) return item;
  let rawTitle = (item.title || '').replace(/\s+/g, ' ').trim();
  let rawArtist = (item.artist || '').replace(/\s+/g, ' ').trim();

  // Decode common HTML entities
  rawTitle = rawTitle
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  rawArtist = rawArtist
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  let artist = rawArtist;
  let title = rawTitle;

  // Pattern: 'Artist - Title' or 'Artist : Title'
  const separatorMatch = rawTitle.match(/^(.*?)\s*[-–—:]\s*(.*)$/);
  if (separatorMatch) {
    const leftPart = separatorMatch[1].trim();
    const rightPart = separatorMatch[2].trim();

    const isLeftPartArtistCandidate =
      leftPart.length > 0 &&
      leftPart.length < 50 &&
      !/\b(official|video|audio|lyric|visualizer|mv|m\/v|remastered|episode|podcast|full album)\b/i.test(leftPart);

    const isChannelAggregator =
      /\b(records|recordings|music|vevo|entertainment|media|channel|lyrics|nation|chill|sound|sounds|88rising|topic|t-series|world|hits records|indie)\b/i.test(
        rawArtist
      );

    if (isLeftPartArtistCandidate && (isChannelAggregator || !rawArtist || rawArtist.toLowerCase() !== leftPart.toLowerCase())) {
      artist = leftPart;
      title = rightPart;
    } else if (isLeftPartArtistCandidate && rawArtist.toLowerCase() === leftPart.toLowerCase()) {
      artist = leftPart;
      title = rightPart;
    }
  }

  // Handle reversed title-artist like 'In my place - Coldplay'
  if (artistHint && title && title.toLowerCase().includes(artistHint.toLowerCase()) && !artist.toLowerCase().includes(artistHint.toLowerCase())) {
    const revMatch = rawTitle.match(/^(.*?)\s*[-–—:]\s*(.*)$/);
    if (revMatch) {
      artist = artistHint;
      title = revMatch[1].trim();
    }
  }

  // If artistHint is provided (from query like 'NIKI') and current artist looks like a generic aggregator
  if (artistHint && artistHint.trim().length > 1) {
    const cleanHint = artistHint.trim();
    const isCurrentArtistGeneric =
      /\b(records|recordings|music|vevo|entertainment|media|channel|lyrics|nation|chill|sound|sounds|88rising|topic|audio|dan music|derek music)\b/i.test(
        artist
      );
    if (isCurrentArtistGeneric || artist.toLowerCase() === cleanHint.toLowerCase() || !artist) {
      artist = cleanHint;
    }
  }

  // Strip topic / VEVO / channel suffixes from artist
  artist = artist
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .replace(/\s*Official$/i, '')
    .replace(/\s*Channel$/i, '')
    .trim();

  // Strip clutter from title
  while (/\s*(\(|\[)[^)\]]*(official|audio|video|lyric|visualizer|mv|m\/v|remastered|4k|hd|hq|live|performance|prod\.|color\s*coded|terjemahan|sub\s*indo|acoustic|remix|slowed|reverb|sped\s*up|speed\s*up|nightcore|karaoke|instrumental|cover|extended|club\s*mix|edit|dub|dub\s*mix|radio\s*edit)[^)\]]*(\)|\])/gi.test(title)) {
    title = title.replace(
      /\s*(\(|\[)[^)\]]*(official|audio|video|lyric|visualizer|mv|m\/v|remastered|4k|hd|hq|live|performance|prod\.|color\s*coded|terjemahan|sub\s*indo|acoustic|remix|slowed|reverb|sped\s*up|speed\s*up|nightcore|karaoke|instrumental|cover|extended|club\s*mix|edit|dub|dub\s*mix|radio\s*edit)[^)\]]*(\)|\])/gi,
      ''
    );
  }
  // Strip quoted video/audio descriptors like "Audio", "Official Video", 'Official Audio'
  title = title.replace(/\s*["“”'‘’「」【】](official\s*(music\s*)?video|official\s*audio|official|music\s*video|audio|lyrics?|visualizer|mv|m\/v|remastered|hd|hq|live|explicit(\s*version)?)["“”'‘’「」【】]/gi, '');
  title = title.replace(/\s*[-–—|:]\s*["“”'‘’]?(official\s*(music\s*)?video|official\s*audio|official|music\s*video|audio|lyrics?|visualizer|mv|m\/v|explicit(\s*version)?)["“”'‘’]?\s*$/gi, '');
  title = title.replace(/\s+(official\s*(music\s*)?video|official\s*audio|music\s*video|official|audio|lyrics?|visualizer|mv|m\/v|explicit(\s*version)?)$/gi, '');

  title = title
    .replace(/\s*(\(|\[)\s*(\)|\])/g, '')
    .replace(/\s*\|.*$/g, '')
    .replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '')
    .replace(/\s*[-–—:]\s*$/, '')
    .trim();

  // Strip YouTube hashtags like #music, #kerispatih, #viral etc.
  // These appear in YouTube titles but are NOT part of the actual song title
  title = title.replace(/\s*#\w+/g, '').trim();

  // If title still has artist prefix like "NIKI - Every Summertime"
  if (artist && title.toLowerCase().startsWith(artist.toLowerCase())) {
    const stripped = title.slice(artist.length).replace(/^[\s\-–—:]+/, '').trim();
    if (stripped.length > 0) {
      title = stripped;
    }
  }

  if (!title && rawTitle) title = rawTitle;
  if (!artist && rawArtist) artist = rawArtist;

  // Clean thumbnail to highest available quality
  let thumbnail = item.thumbnail || '';
  if (thumbnail.includes('i.ytimg.com') && thumbnail.includes('hqdefault.jpg')) {
    thumbnail = thumbnail.replace('hqdefault.jpg', 'mqdefault.jpg');
  }

  return {
    ...item,
    id: item.id || null,
    title,
    artist,
    thumbnail,
    isOfficialAudio: true
  };
}

/**
 * Returns user's storefront country code (ISO 3166-1 alpha-2) for Apple Music/iTunes search.
 */
export function getSearchCountryCode(): string {
  try {
    const saved = localStorage.getItem('donpollo_search_country');
    if (saved && saved !== 'auto') return saved.toUpperCase();

    const lang = localStorage.getItem('donpollo_language');
    if (lang === 'id') return 'ID';
    if (lang === 'ja') return 'JP';
    if (lang === 'ko') return 'KR';

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (
      timeZone.includes('Jakarta') ||
      timeZone.includes('Makassar') ||
      timeZone.includes('Jayapura') ||
      timeZone.includes('Pontianak')
    ) {
      return 'ID';
    }
    if (timeZone.includes('Tokyo')) return 'JP';
    if (timeZone.includes('Seoul')) return 'KR';

    const navLang = (navigator.language || '').toLowerCase();
    if (navLang.startsWith('id')) return 'ID';
    if (navLang.startsWith('ja')) return 'JP';
    if (navLang.startsWith('ko')) return 'KR';

    // Default to 'ID' for DonPollo Music
    return 'ID';
  } catch {
    return 'ID';
  }
}

/**
 * Search official songs from iTunes / Apple Music catalog.
 * Returns clean tracks with official artist names, clean titles, square album art, and accurate studio durations.
 */
export async function searchItunesTracks(
  query: string,
  limit = 8,
  fetchUrlFn?: (url: string) => Promise<any>,
  country?: string
): Promise<any[]> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return [];

  const effectiveCountry = country || getSearchCountryCode();
  const buildUrl = (cntry: string) =>
    `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=${Math.max(limit * 2, 20)}&country=${encodeURIComponent(cntry)}`;

  const executeFetch = async (url: string) => {
    let data: any;
    try {
      const res = await fetch(url);
      if (res.ok) {
        data = await res.json();
      }
    } catch {
      // Direct fetch failed (e.g. offline or renderer restriction), try IPC fetchUrlFn
      if (fetchUrlFn) {
        try {
          data = await fetchUrlFn(url);
        } catch {}
      }
    }

    if (!data && fetchUrlFn) {
      try {
        data = await fetchUrlFn(url);
      } catch {}
    }

    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { }
    }
    return data;
  };

  try {
    let data = await executeFetch(buildUrl(effectiveCountry));

    // Fallback: if searching in local storefront returned 0 results and it wasn't US, fallback to US storefront
    if ((!data || !data.results || data.results.length === 0) && effectiveCountry !== 'US') {
      try {
        const fallbackData = await executeFetch(buildUrl('US'));
        if (fallbackData && fallbackData.results && fallbackData.results.length > 0) {
          data = fallbackData;
        }
      } catch {}
    }

    if (!data || !data.results || !Array.isArray(data.results)) {
      return [];
    }

    // Deduplicate by clean title and artist
    const seen = new Set<string>();
    const formatted: any[] = [];

    const wantsAcoustic = userExplicitlyWantsAcoustic(cleanQuery);
    const wantsRemix = userExplicitlyWantsRemix(cleanQuery);
    const wantsLive = userExplicitlyWantsLive(cleanQuery);

    for (const t of data.results) {
      if (!t.trackName || !t.artistName) continue;
      if (!wantsAcoustic && !wantsRemix && !wantsLive && isUnwantedTrackVariant(t.trackName, t.artistName)) {
        continue;
      }
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
  if (item.source === 'itunes' || item.isOfficialAudio) {
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

/**
 * Normalizes a song title to its core base representation for accurate deduplication.
 * Removes parenthetical subtitles, punctuation, feature tags, and extra whitespace.
 * e.g. "Where Have You Been?", "Where Have You Been? (Hector Fonseca Dub)", "Where Have You Been"
 * all normalize to "where have you been".
 */
export function cleanBaseSongTitle(title?: string): string {
  if (!title) return '';
  let clean = title.replace(/\s+/g, ' ').trim();
  // Strip anything inside parentheses or brackets repeatedly
  while (/\s*(\(|\[)[^)\]]*(\)|\])/.test(clean)) {
    clean = clean.replace(/\s*(\(|\[)[^)\]]*(\)|\])/g, '');
  }
  // Strip subtitles after separators (- , – , — , | , : , / )
  clean = clean.replace(/\s*[-–—|:\/]\s*.*$/, '');
  // Strip feature tags
  clean = clean.replace(/\s+(feat\.|ft\.|featuring|with)\s+.*$/i, '');
  // Strip all non-alphanumeric characters (including ?, !, quotes, symbols)
  clean = clean.replace(/[^a-zA-Z0-9\s]/g, '');
  return clean.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Deduplicates a list of songs so that:
 * 1. No identical or near-identical song titles appear in the same mix (e.g. no duplicate 'Where Have You Been').
 * 2. Unwanted variants (dub, acoustic, remix, live, cover) are strictly filtered.
 * 3. Caps maximum songs per artist to avoid clustering (e.g. max 3 tracks per artist).
 */
export function deduplicateTracks(tracks: any[], maxPerArtist = 4, targetCount = 50): any[] {
  if (!tracks || !Array.isArray(tracks)) return [];

  const attemptDedup = (cap: number) => {
    const seenBaseTitles = new Set<string>();
    const seenIds = new Set<string>();
    const artistCounts: Record<string, number> = {};
    const result: any[] = [];

    for (const track of tracks) {
      if (!track || !track.title) continue;

      // Filter out unwanted variants (dub, remix, acoustic, live, cover)
      if (isUnwantedTrackVariant(track.title, track.artist)) continue;

      // ID deduplication
      if (track.id && seenIds.has(track.id)) continue;

      const baseTitle = cleanBaseSongTitle(track.title);
      if (!baseTitle || baseTitle.length < 2) continue;

      // Title deduplication: If this core song title already exists in the mix, skip it!
      if (seenBaseTitles.has(baseTitle)) continue;

      // Artist cap (e.g. max 4 tracks by same artist in 1 mix)
      const rawArtist = (track.artist || 'Unknown').trim().toLowerCase().split(/\s*[,/&]\s*/)[0];
      const artistKey = rawArtist.replace(/[^a-zA-Z0-9]/g, '');
      if (cap > 0 && artistKey) {
        const currentCount = artistCounts[artistKey] || 0;
        if (currentCount >= cap) continue;
        artistCounts[artistKey] = currentCount + 1;
      }

      seenBaseTitles.add(baseTitle);
      if (track.id) seenIds.add(track.id);
      result.push(track);
    }
    return result;
  };

  // If initial cap yields fewer than targetCount, dynamically try slightly higher artist cap
  let deduped = attemptDedup(maxPerArtist);
  if (deduped.length < targetCount && maxPerArtist < 6) {
    const relaxed = attemptDedup(maxPerArtist + 2);
    if (relaxed.length > deduped.length) {
      deduped = relaxed;
    }
  }

  return deduped;
}

/**
 * Interleaves songs by artist so that tracks from the same artist do not play consecutively.
 * Provides a dynamic, Spotify-like mixed listening flow.
 */
export function interleaveByArtist(tracks: any[]): any[] {
  if (!tracks || tracks.length <= 2) return tracks || [];
  const byArtist: Record<string, any[]> = {};

  for (const t of tracks) {
    const rawArtist = (t.artist || 'Unknown').trim().toLowerCase().split(/\s*[,/&]\s*/)[0];
    const key = rawArtist.replace(/[^a-zA-Z0-9]/g, '') || 'unknown';
    if (!byArtist[key]) byArtist[key] = [];
    byArtist[key].push(t);
  }

  const queues = Object.values(byArtist).sort((a, b) => b.length - a.length);
  const result: any[] = [];
  let added = true;

  while (added) {
    added = false;
    for (const q of queues) {
      if (q.length > 0) {
        result.push(q.shift());
        added = true;
      }
    }
  }

  return result;
}


