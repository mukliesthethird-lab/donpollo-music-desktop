import { rankAudioResults, formatTrackLikeSpotify, isUnwantedTrackVariant, cleanBaseSongTitle, deduplicateTracks, interleaveByArtist } from './audioRanking';
import { generateSpotifyMixCover } from './spotifyMixCover';
import { FEATURE_FLAGS } from '../config/features';

export type VibeType = 'happy' | 'sad' | 'chill' | 'energetic';

export interface VibeMeta {
  type: VibeType;
  labelKey: string;
  taglineKey: string;
  descriptionKey: string;
  iconName: string;
  tagline: string;
  color: string;
  gradient: string;
  glowColor: string;
}

export const VIBE_CONFIGS: Record<VibeType, VibeMeta> = {
  happy: {
    type: 'happy',
    labelKey: 'vibeMoodHappy',
    taglineKey: 'vibeTaglineHappy',
    descriptionKey: 'vibeHappyMixDesc',
    iconName: 'sun',
    tagline: 'Feel-good anthems & upbeat sunny rhythms',
    color: '#fbbf24',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    glowColor: 'rgba(245, 158, 11, 0.4)'
  },
  sad: {
    type: 'sad',
    labelKey: 'vibeMoodSad',
    taglineKey: 'vibeTaglineSad',
    descriptionKey: 'vibeSadMixDesc',
    iconName: 'cloud-rain',
    tagline: 'Deep melancholy, slow emotional ballads & soft soul',
    color: '#38bdf8',
    gradient: 'linear-gradient(135deg, #0284c7, #1e3a8a)',
    glowColor: 'rgba(56, 189, 248, 0.4)'
  },
  chill: {
    type: 'chill',
    labelKey: 'vibeMoodChill',
    taglineKey: 'vibeTaglineChill',
    descriptionKey: 'vibeChillMixDesc',
    iconName: 'coffee',
    tagline: 'Smooth lo-fi, relaxing melodies & cozy vibes',
    color: '#a78bfa',
    gradient: 'linear-gradient(135deg, #8b5cf6, #5b21b6)',
    glowColor: 'rgba(167, 139, 250, 0.4)'
  },
  energetic: {
    type: 'energetic',
    labelKey: 'vibeMoodEnergetic',
    taglineKey: 'vibeTaglineEnergetic',
    descriptionKey: 'vibeEnergeticMixDesc',
    iconName: 'zap',
    tagline: 'High octane adrenaline, workout hype & fast beats',
    color: '#f87171',
    gradient: 'linear-gradient(135deg, #ef4444, #ea580c)',
    glowColor: 'rgba(239, 68, 68, 0.4)'
  }
};

/**
 * Extracts top artists from user's play history and liked songs.
 */
export function extractTopArtists(playHistory: any[] = [], likedSongs: any[] = [], maxArtists = 10): string[] {
  const artistFreq: Record<string, number> = {};

  const sanitizeArtist = (raw: string): string => {
    if (!raw) return '';
    let clean = raw.trim();
    clean = clean.split(/\s+(feat\.|ft\.|featuring|with)\s+/i)[0];
    clean = clean.split(/\s*[,/&]\s*/)[0];
    return clean.trim();
  };

  const processSong = (s: any, weight: number) => {
    if (!s) return;
    let artist = s.artist || '';
    if (!artist && s.title && s.title.includes(' - ')) {
      artist = s.title.split(' - ')[0];
    }
    const clean = sanitizeArtist(artist);
    if (clean && clean.length > 1 && !clean.toLowerCase().includes('unknown')) {
      artistFreq[clean] = (artistFreq[clean] || 0) + weight;
    }
  };

  // Give recent playHistory high weight
  playHistory.slice(0, 100).forEach((s, idx) => {
    const recencyWeight = Math.max(1, 14 - Math.floor(idx / 5));
    processSong(s, recencyWeight);
  });

  // Liked songs carry persistent taste weight
  likedSongs.slice(0, 100).forEach(s => {
    processSong(s, 7);
  });

  const sorted = Object.entries(artistFreq)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  if (sorted.length > 0) {
    return sorted.slice(0, maxArtists);
  }

  // Fallback signature seed artists if history is empty
  return ['NIKI', 'Taylor Swift', 'Coldplay', 'The Weeknd', 'Billie Eilish', 'Hindia', 'Tulus', 'Bruno Mars', 'Dua Lipa', 'Bernadya'];
}

/**
 * Helper to identify long DJ sets, full album compilations, or non-song videos.
 */
function isJunkMusicVideo(title?: string, artist?: string): boolean {
  const t = (title || '').toLowerCase();
  const a = (artist || '').toLowerCase();
  if (/\b(playlist|compilation|greatest hits|full album|nonstop|best songs of|top songs of|album audio|mashup|jukebox|10 hours|1 hour|discover weekly|release radar|daily mix|rap songs|pop songs|sad songs|chill songs|hits songs|best songs|top songs)\b/i.test(t)) return true;
  if (/\b(spotify|apple music)\b/i.test(t)) return true;
  if (/\b(playlist|compilation|nonstop|mix)\b/i.test(a)) return true;
  return false;
}

/**
 * Helper to fetch YouTube Music official audio in small throttled batches.
 * Limits total queries to max 6, processes in chunks of 2, and terminates early
 * once sufficient tracks are collected, protecting backend server RAM.
 */
async function fetchYouTubeMusicBatches(
  queries: { q: string; artist?: string }[],
  apiBaseUrl: string,
  fetchUrlFn?: (url: string) => Promise<any>
): Promise<any[]> {
  if (!FEATURE_FLAGS.ENABLE_PLAYLIST_MIX) {
    return [];
  }
  const combined: any[] = [];
  // Cap queries to max 6 high-yield queries
  const selectedQueries = queries.slice(0, 6);

  // Process in small chunks of 2 to avoid RAM spikes on backend
  for (let i = 0; i < selectedQueries.length; i += 2) {
    const chunk = selectedQueries.slice(i, i + 2);
    const chunkPromises = chunk.map(async ({ q, artist }) => {
      const url = `${apiBaseUrl}/api/search?q=${encodeURIComponent(q)}`;
      let results: any[] = [];
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          results = data.results || [];
        }
      } catch {
        if (fetchUrlFn) {
          try {
            const raw = await fetchUrlFn(url);
            const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
            results = data?.results || [];
          } catch {}
        }
      }

      if (results.length === 0 && fetchUrlFn) {
        try {
          const raw = await fetchUrlFn(url);
          const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
          results = data?.results || [];
        } catch {}
      }

      return results
        .filter((item: any) => item && item.id && item.duration >= 50 && item.duration <= 540 && !isJunkMusicVideo(item.title, item.artist) && !isUnwantedTrackVariant(item.title, item.artist))
        .map((item: any) => formatTrackLikeSpotify(item, artist))
        .filter((item: any) => item && !isUnwantedTrackVariant(item.title, item.artist));
    });

    const chunkBatches = await Promise.all(chunkPromises);
    chunkBatches.forEach(b => {
      if (Array.isArray(b)) combined.push(...b);
    });

    // If we already collected 50+ candidates, stop early to save server resources
    if (combined.length >= 50) {
      break;
    }
  }

  return combined;
}

/**
 * Generates curated vibe recommendations matching user history and the chosen mood.
 * Prioritizes YouTube Music official audio releases with clean Spotify-style titles and artist names.
 */
export async function generateVibeRecommendations(
  vibe: VibeType,
  playHistory: any[] = [],
  likedSongs: any[] = [],
  apiBaseUrl = 'http://179.41.4.182:7097',
  fetchUrlFn?: (url: string) => Promise<any>
): Promise<{ tracks: any[]; vibe: VibeType; meta: VibeMeta }> {
  const meta = VIBE_CONFIGS[vibe] || VIBE_CONFIGS.chill;
  if (!FEATURE_FLAGS.ENABLE_PLAYLIST_MIX) {
    return { tracks: [], vibe, meta };
  }
  const topArtists = extractTopArtists(playHistory, likedSongs, 10);
  const a1 = topArtists[0] || 'NIKI';
  const a2 = topArtists[1] || 'Coldplay';
  const a3 = topArtists[2] || 'Taylor Swift';
  const a4 = topArtists[3] || 'The Weeknd';
  const a5 = topArtists[4] || 'Billie Eilish';
  const a6 = topArtists[5] || 'Hindia';
  const a7 = topArtists[6] || 'Tulus';
  const a8 = topArtists[7] || 'Bruno Mars';

  let ytQueries: { q: string; artist?: string }[] = [];

  switch (vibe) {
    case 'happy':
      ytQueries = [
        { q: `${a1} pop official audio`, artist: a1 },
        { q: `${a1} upbeat official audio`, artist: a1 },
        { q: `${a2} happy official audio`, artist: a2 },
        { q: `${a2} upbeat official audio`, artist: a2 },
        { q: `${a3} feel good official audio`, artist: a3 },
        { q: `${a3} pop official audio`, artist: a3 },
        { q: `${a4} dance official audio`, artist: a4 },
        { q: `${a5} upbeat official audio`, artist: a5 },
        { q: `${a6} ceria official audio`, artist: a6 },
        { q: `${a7} upbeat official audio`, artist: a7 },
        { q: `${a8} happy official audio`, artist: a8 },
        { q: 'Dua Lipa upbeat official audio', artist: 'Dua Lipa' },
        { q: 'Bruno Mars upbeat official audio', artist: 'Bruno Mars' },
        { q: 'Harry Styles upbeat official audio', artist: 'Harry Styles' },
        { q: 'Lizzo upbeat official audio', artist: 'Lizzo' },
        { q: 'Yura Yunita ceria official audio', artist: 'Yura Yunita' },
        { q: "Maliq & D'Essentials official audio", artist: "Maliq & D'Essentials" },
        { q: 'RAN official audio', artist: 'RAN' },
        { q: 'HIVI official audio', artist: 'HIVI!' },
        { q: 'Juicy Luicy upbeat official audio', artist: 'Juicy Luicy' },
        { q: 'Diskoria official audio', artist: 'Diskoria' },
        { q: 'OneRepublic upbeat official audio', artist: 'OneRepublic' },
        { q: 'Maroon 5 pop official audio', artist: 'Maroon 5' },
        { q: 'Justin Timberlake dance official audio', artist: 'Justin Timberlake' },
        { q: 'Katy Perry pop official audio', artist: 'Katy Perry' },
        { q: 'Kunto Aji ceria official audio', artist: 'Kunto Aji' }
      ];
      break;

    case 'sad':
      ytQueries = [
        { q: `${a1} ballad official audio`, artist: a1 },
        { q: `${a1} emotional ballad official audio`, artist: a1 },
        { q: `${a2} sad official audio`, artist: a2 },
        { q: `${a3} ballad official audio`, artist: a3 },
        { q: `${a4} emotional official audio`, artist: a4 },
        { q: `${a5} sad official audio`, artist: a5 },
        { q: `${a6} sedih official audio`, artist: a6 },
        { q: `${a7} galau official audio`, artist: a7 },
        { q: `${a8} sad official audio`, artist: a8 },
        { q: 'Adele ballad official audio', artist: 'Adele' },
        { q: 'Lewis Capaldi official audio', artist: 'Lewis Capaldi' },
        { q: 'Olivia Rodrigo ballad official audio', artist: 'Olivia Rodrigo' },
        { q: 'Sam Smith ballad official audio', artist: 'Sam Smith' },
        { q: 'Conan Gray ballad official audio', artist: 'Conan Gray' },
        { q: 'Dean Lewis official audio', artist: 'Dean Lewis' },
        { q: 'James Arthur ballad official audio', artist: 'James Arthur' },
        { q: 'Sasha Alex Sloan official audio', artist: 'Sasha Alex Sloan' },
        { q: 'Bernadya official audio', artist: 'Bernadya' },
        { q: 'Nadin Amizah official audio', artist: 'Nadin Amizah' },
        { q: 'Feby Putri official audio', artist: 'Feby Putri' },
        { q: 'Pamungkas official audio', artist: 'Pamungkas' },
        { q: 'Mahalini galau official audio', artist: 'Mahalini' },
        { q: 'Tiara Andini ballad official audio', artist: 'Tiara Andini' },
        { q: 'Andmesh ballad official audio', artist: 'Andmesh' },
        { q: 'Glenn Fredly official audio', artist: 'Glenn Fredly' },
        { q: 'Judika ballad official audio', artist: 'Judika' }
      ];
      break;

    case 'chill':
      ytQueries = [
        { q: `${a1} calm official audio`, artist: a1 },
        { q: `${a1} chill official audio`, artist: a1 },
        { q: `${a2} smooth official audio`, artist: a2 },
        { q: `${a3} chill official audio`, artist: a3 },
        { q: `${a4} r&b official audio`, artist: a4 },
        { q: `${a5} chill official audio`, artist: a5 },
        { q: `${a6} santai official audio`, artist: a6 },
        { q: `${a7} chill official audio`, artist: a7 },
        { q: 'Bruno Major official audio', artist: 'Bruno Major' },
        { q: 'Laufey official audio', artist: 'Laufey' },
        { q: 'Keshi official audio', artist: 'Keshi' },
        { q: 'Jeremy Zucker official audio', artist: 'Jeremy Zucker' },
        { q: 'Daniel Caesar official audio', artist: 'Daniel Caesar' },
        { q: 'SZA chill official audio', artist: 'SZA' },
        { q: 'Frank Ocean official audio', artist: 'Frank Ocean' },
        { q: 'Honne official audio', artist: 'Honne' },
        { q: 'Mac Ayres official audio', artist: 'Mac Ayres' },
        { q: 'Tom Misch official audio', artist: 'Tom Misch' },
        { q: 'UMI chill official audio', artist: 'UMI' },
        { q: 'Ardhito Pramono official audio', artist: 'Ardhito Pramono' },
        { q: 'Sal Priadi official audio', artist: 'Sal Priadi' },
        { q: 'Danilla official audio', artist: 'Danilla' },
        { q: 'Mocca chill official audio', artist: 'Mocca' },
        { q: 'White Shoes & The Couples Company official audio', artist: 'White Shoes' },
        { q: 'Adhitia Sofyan official audio', artist: 'Adhitia Sofyan' },
        { q: 'Monita Tahalea official audio', artist: 'Monita Tahalea' }
      ];
      break;

    case 'energetic':
      ytQueries = [
        { q: `${a1} upbeat dance official audio`, artist: a1 },
        { q: `${a1} dance official audio`, artist: a1 },
        { q: `${a2} hype official audio`, artist: a2 },
        { q: `${a3} edm official audio`, artist: a3 },
        { q: `${a4} high energy official audio`, artist: a4 },
        { q: `${a5} fast tempo official audio`, artist: a5 },
        { q: `${a6} semangat official audio`, artist: a6 },
        { q: 'Avicii official audio', artist: 'Avicii' },
        { q: 'Calvin Harris official audio', artist: 'Calvin Harris' },
        { q: 'The Chainsmokers official audio', artist: 'The Chainsmokers' },
        { q: 'David Guetta official audio', artist: 'David Guetta' },
        { q: 'Martin Garrix official audio', artist: 'Martin Garrix' },
        { q: 'Imagine Dragons official audio', artist: 'Imagine Dragons' },
        { q: 'Zedd official audio', artist: 'Zedd' },
        { q: 'Tiesto official audio', artist: 'Tiesto' },
        { q: 'Alesso official audio', artist: 'Alesso' },
        { q: 'Kygo official audio', artist: 'Kygo' },
        { q: 'Marshmello official audio', artist: 'Marshmello' },
        { q: 'Major Lazer official audio', artist: 'Major Lazer' },
        { q: 'Weird Genius official audio', artist: 'Weird Genius' },
        { q: 'Dipha Barus official audio', artist: 'Dipha Barus' },
        { q: 'Pee Wee Gaskins official audio', artist: 'Pee Wee Gaskins' },
        { q: 'Superman Is Dead official audio', artist: 'Superman Is Dead' },
        { q: 'Kotak semangat official audio', artist: 'Kotak' },
        { q: 'Slank semangat official audio', artist: 'Slank' }
      ];
      break;
  }

  try {
    const rawTracks = await fetchYouTubeMusicBatches(ytQueries, apiBaseUrl, fetchUrlFn);

    const unique: any[] = [];
    for (const item of rawTracks) {
      if (!item || !item.title || !item.id) continue;
      unique.push({
        ...item,
        isVibeMix: true,
        vibeType: vibe,
        vibeIcon: meta.iconName,
        vibeColor: meta.color,
        isOfficialAudio: true
      });
    }

    // Deduplicate strictly with clean base titles, artist caps, and no unwanted variants
    const deduped = deduplicateTracks(unique, 4, 50);
    const ranked = rankAudioResults(deduped, `${a1} ${vibe}`);
    const interleaved = interleaveByArtist(ranked);
    // Return up to 50 official audio tracks!
    return {
      tracks: interleaved.slice(0, 50),
      vibe,
      meta
    };
  } catch (err) {
    console.error('generateVibeRecommendations error:', err);
    return {
      tracks: [],
      vibe,
      meta
    };
  }
}

export type MixType = 'discover_weekly' | 'daily_mix' | 'vibe_mix' | 'release_radar';

export interface AlgorithmicPlaylist {
  id: string;
  name: string;
  avatar?: string;
  songs: any[];
  createdAt: number;
  isTemporary: true;
  mixType: MixType;
  mood?: VibeType;
  description: string;
  tagline: string;
  gradient: string;
  iconName: string;
}

export const DEFAULT_MADE_FOR_YOU_PLAYLISTS: AlgorithmicPlaylist[] = [
  {
    id: 'temp_mix_discover_weekly',
    name: 'Discover Weekly',
    avatar: generateSpotifyMixCover({ id: 'temp_mix_discover_weekly', name: 'Discover Weekly', mixType: 'discover_weekly' }),
    songs: [],
    createdAt: 1,
    isTemporary: true,
    mixType: 'discover_weekly',
    description: 'Penemuan lagu baru setiap minggu yang disesuaikan dengan selera musikmu.',
    tagline: 'Penemuan Mingguan',
    gradient: 'linear-gradient(135deg, #4f46e5, #1e1b4b)',
    iconName: 'compass'
  },
  {
    id: 'temp_mix_daily',
    name: 'Yang Mungkin Kamu Suka',
    avatar: generateSpotifyMixCover({ id: 'temp_mix_daily', name: 'Yang Mungkin Kamu Suka', mixType: 'daily_mix' }),
    songs: [],
    createdAt: 2,
    isTemporary: true,
    mixType: 'daily_mix',
    description: 'Campuran lagu favorit dan rekomendasi spesial berdasarkan riwayat putarmu.',
    tagline: 'Daily Mix',
    gradient: 'linear-gradient(135deg, #059669, #064e3b)',
    iconName: 'headphones'
  },
  {
    id: 'vibe_temp_chill',
    name: 'Chill Mix',
    avatar: generateSpotifyMixCover({ id: 'vibe_temp_chill', name: 'Chill Mix', mixType: 'vibe_mix', mood: 'chill' }),
    songs: [],
    createdAt: 3,
    isTemporary: true,
    mixType: 'vibe_mix',
    mood: 'chill',
    description: 'Musik santai, lo-fi & melodi lembut untuk menemani suasana hatimu.',
    tagline: 'Campuran Santai',
    gradient: 'linear-gradient(135deg, #8b5cf6, #5b21b6)',
    iconName: 'coffee'
  },
  {
    id: 'vibe_temp_happy',
    name: 'Happy Mix',
    avatar: generateSpotifyMixCover({ id: 'vibe_temp_happy', name: 'Happy Mix', mixType: 'vibe_mix', mood: 'happy' }),
    songs: [],
    createdAt: 4,
    isTemporary: true,
    mixType: 'vibe_mix',
    mood: 'happy',
    description: 'Lagu-lagu ceria, bersemangat dan positif untuk meningkatkan mood-mu.',
    tagline: 'Campuran Ceria',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    iconName: 'sun'
  },
  {
    id: 'vibe_temp_energetic',
    name: 'Semangat Mix',
    avatar: generateSpotifyMixCover({ id: 'vibe_temp_energetic', name: 'Semangat Mix', mixType: 'vibe_mix', mood: 'energetic' }),
    songs: [],
    createdAt: 5,
    isTemporary: true,
    mixType: 'vibe_mix',
    mood: 'energetic',
    description: 'Irama bertempo cepat, memacu adrenalin dan penuh energi.',
    tagline: 'Campuran Semangat',
    gradient: 'linear-gradient(135deg, #ef4444, #ea580c)',
    iconName: 'zap'
  },
  {
    id: 'vibe_temp_sad',
    name: 'Sedih Mix',
    avatar: generateSpotifyMixCover({ id: 'vibe_temp_sad', name: 'Sedih Mix', mixType: 'vibe_mix', mood: 'sad' }),
    songs: [],
    createdAt: 6,
    isTemporary: true,
    mixType: 'vibe_mix',
    mood: 'sad',
    description: 'Lagu-lagu melankolis dan ballad emosional yang menyentuh hati.',
    tagline: 'Campuran Melankolis',
    gradient: 'linear-gradient(135deg, #0284c7, #1e3a8a)',
    iconName: 'cloud-rain'
  },
  {
    id: 'temp_mix_release_radar',
    name: 'Release Radar',
    avatar: generateSpotifyMixCover({ id: 'temp_mix_release_radar', name: 'Release Radar', mixType: 'release_radar' }),
    songs: [],
    createdAt: 7,
    isTemporary: true,
    mixType: 'release_radar',
    description: 'Rilisan terbaru dari musisi favorit yang sering kamu dengarkan.',
    tagline: 'Radar Rilis Baru',
    gradient: 'linear-gradient(135deg, #ea580c, #431407)',
    iconName: 'flame'
  }
];

export async function generateAlgorithmicMix(
  mixType: MixType,
  vibe: VibeType = 'chill',
  playHistory: any[] = [],
  likedSongs: any[] = [],
  apiBaseUrl = 'http://179.41.4.182:7097',
  fetchUrlFn?: (url: string) => Promise<any>
): Promise<any[]> {
  if (!FEATURE_FLAGS.ENABLE_PLAYLIST_MIX) {
    return [];
  }
  if (mixType === 'vibe_mix') {
    const res = await generateVibeRecommendations(vibe, playHistory, likedSongs, apiBaseUrl, fetchUrlFn);
    return res.tracks || [];
  }

  const topArtists = extractTopArtists(playHistory, likedSongs, 10);
  const a1 = topArtists[0] || 'NIKI';
  const a2 = topArtists[1] || 'Taylor Swift';
  const a3 = topArtists[2] || 'Coldplay';
  const a4 = topArtists[3] || 'The Weeknd';
  const a5 = topArtists[4] || 'Billie Eilish';
  const a6 = topArtists[5] || 'Hindia';
  const a7 = topArtists[6] || 'Tulus';
  const a8 = topArtists[7] || 'Dua Lipa';

  let ytQueries: { q: string; artist?: string }[] = [];

  if (mixType === 'discover_weekly') {
    ytQueries = [
      { q: `${a2} single official audio`, artist: a2 },
      { q: `${a3} single official audio`, artist: a3 },
      { q: `${a4} single official audio`, artist: a4 },
      { q: `${a5} single official audio`, artist: a5 },
      { q: `${a6} single official audio`, artist: a6 },
      { q: `${a7} single official audio`, artist: a7 },
      { q: `${a8} single official audio`, artist: a8 },
      { q: 'Boy Pablo official audio', artist: 'Boy Pablo' },
      { q: 'Rex Orange County official audio', artist: 'Rex Orange County' },
      { q: 'Phum Viphurit official audio', artist: 'Phum Viphurit' },
      { q: 'Men I Trust official audio', artist: 'Men I Trust' },
      { q: 'Mac DeMarco official audio', artist: 'Mac DeMarco' },
      { q: 'Wallows official audio', artist: 'Wallows' },
      { q: 'Clairo official audio', artist: 'Clairo' },
      { q: 'Cigarettes After Sex official audio', artist: 'Cigarettes After Sex' },
      { q: 'Reality Club official audio', artist: 'Reality Club' },
      { q: 'Laufey official audio', artist: 'Laufey' },
      { q: 'Beabadoobee official audio', artist: 'Beabadoobee' },
      { q: 'The 1975 official audio', artist: 'The 1975' },
      { q: 'LANY official audio', artist: 'LANY' },
      { q: 'Dayglow official audio', artist: 'Dayglow' },
      { q: 'Peach Pit official audio', artist: 'Peach Pit' },
      { q: 'Grrrl Gang official audio', artist: 'Grrrl Gang' },
      { q: '.Feast official audio', artist: '.Feast' },
      { q: 'Barasuara official audio', artist: 'Barasuara' },
      { q: 'Pamungkas single official audio', artist: 'Pamungkas' },
      { q: 'Danilla single official audio', artist: 'Danilla' },
      { q: 'Efek Rumah Kaca official audio', artist: 'Efek Rumah Kaca' }
    ];
  } else if (mixType === 'daily_mix') {
    ytQueries = [
      { q: `${a1} songs official audio`, artist: a1 },
      { q: `${a1} single official audio`, artist: a1 },
      { q: `${a2} songs official audio`, artist: a2 },
      { q: `${a2} single official audio`, artist: a2 },
      { q: `${a3} songs official audio`, artist: a3 },
      { q: `${a3} single official audio`, artist: a3 },
      { q: `${a4} songs official audio`, artist: a4 },
      { q: `${a5} songs official audio`, artist: a5 },
      { q: `${a6} songs official audio`, artist: a6 },
      { q: `${a7} songs official audio`, artist: a7 },
      { q: `${a8} songs official audio`, artist: a8 },
      { q: 'Ed Sheeran official audio', artist: 'Ed Sheeran' },
      { q: 'Bruno Mars official audio', artist: 'Bruno Mars' },
      { q: 'Tulus official audio', artist: 'Tulus' },
      { q: 'Bernadya official audio', artist: 'Bernadya' },
      { q: 'The Weeknd official audio', artist: 'The Weeknd' },
      { q: 'Adele official audio', artist: 'Adele' },
      { q: 'Coldplay official audio', artist: 'Coldplay' },
      { q: 'Taylor Swift official audio', artist: 'Taylor Swift' },
      { q: 'Billie Eilish official audio', artist: 'Billie Eilish' },
      { q: 'Sal Priadi official audio', artist: 'Sal Priadi' },
      { q: 'NIKI official audio', artist: 'NIKI' },
      { q: 'Yura Yunita official audio', artist: 'Yura Yunita' },
      { q: 'Hindia official audio', artist: 'Hindia' },
      { q: 'SZA official audio', artist: 'SZA' },
      { q: 'Dua Lipa official audio', artist: 'Dua Lipa' },
      { q: 'Harry Styles official audio', artist: 'Harry Styles' }
    ];
  } else if (mixType === 'release_radar') {
    ytQueries = [
      { q: `${a1} new single 2024 official audio`, artist: a1 },
      { q: `${a1} latest release official audio`, artist: a1 },
      { q: `${a2} new single 2024 official audio`, artist: a2 },
      { q: `${a2} latest release official audio`, artist: a2 },
      { q: `${a3} latest release official audio`, artist: a3 },
      { q: `${a4} latest release official audio`, artist: a4 },
      { q: `${a5} latest release official audio`, artist: a5 },
      { q: `${a6} latest release official audio`, artist: a6 },
      { q: `${a7} latest release official audio`, artist: a7 },
      { q: `${a8} latest release official audio`, artist: a8 },
      { q: 'new pop releases 2024 official audio', artist: '' },
      { q: 'latest hits 2024 official audio', artist: '' },
      { q: 'new music friday official audio', artist: '' },
      { q: 'top new singles 2024 official audio', artist: '' },
      { q: 'fresh music release official audio', artist: '' },
      { q: 'latest single 2024 official audio', artist: '' },
      { q: 'trending new songs official audio', artist: '' },
      { q: 'new indie releases 2024 official audio', artist: '' },
      { q: 'new r&b releases 2024 official audio', artist: '' },
      { q: 'lagu indonesia terbaru 2024 official audio', artist: '' },
      { q: 'rilisan terbaru 2024 official audio', artist: '' },
      { q: 'hits baru 2024 official audio', artist: '' }
    ];
  }

  try {
    const rawTracks = await fetchYouTubeMusicBatches(ytQueries, apiBaseUrl, fetchUrlFn);

    let combined: any[] = [];

    // For daily mix: seed favorite songs from history and likes (formatted cleanly)
    if (mixType === 'daily_mix') {
      const favSeeds = [...likedSongs, ...playHistory].slice(0, 15);
      favSeeds.forEach(s => {
        if (s && s.title && s.id && !isUnwantedTrackVariant(s.title, s.artist)) {
          const clean = formatTrackLikeSpotify(s);
          if (!isUnwantedTrackVariant(clean.title, clean.artist)) {
            combined.push({
              ...clean,
              isOfficialAudio: true
            });
          }
        }
      });
    }

    combined.push(...rawTracks);

    // Deduplicate
    const unique: any[] = [];

    for (const item of combined) {
      if (!item || !item.title || !item.id) continue;

      // If Discover Weekly: filter out heavily played songs to encourage new discovery
      if (mixType === 'discover_weekly' && playHistory.length > 5) {
        const alreadyPlayed = playHistory.slice(0, 30).some(h =>
          (h.id && h.id === item.id) ||
          (cleanBaseSongTitle(h.title) === cleanBaseSongTitle(item.title))
        );
        if (alreadyPlayed && unique.length >= 15) continue;
      }

      unique.push({
        ...item,
        isAlgorithmicMix: true,
        mixType,
        isOfficialAudio: true
      });
    }

    // Deduplicate strictly with clean base titles, artist caps, and no unwanted variants
    const deduped = deduplicateTracks(unique, 4, 50);
    const ranked = rankAudioResults(deduped, `${a1} ${mixType}`);
    const interleaved = interleaveByArtist(ranked);
    // Target 50 official tracks!
    return interleaved.slice(0, 50);
  } catch (err) {
    console.error('generateAlgorithmicMix error:', err);
    return [];
  }
}
