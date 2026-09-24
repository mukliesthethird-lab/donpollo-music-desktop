/**
 * Spotify-Style Mix Cover Art Generator
 * Generates rich, authentic, high-resolution Spotify editorial SVG covers for:
 * - Vibe Mixes (Happy, Chill, Sad, Energetic)
 * - Algorithmic Mixes (Discover Weekly, Daily Mix, Release Radar)
 *
 * Eliminates relying on the first song's thumbnail, delivering the iconic Spotify
 * look with custom gradients, acoustic soundwaves, bold typography, and featured artists.
 */

export interface SpotifyMixCoverOptions {
  id?: string;
  name?: string;
  mixType?: string;
  mood?: string;
  songs?: any[];
  playHistory?: any[];
  likedSongs?: any[];
  artists?: string[];
  tagline?: string;
  description?: string;
}

interface MixStyleConfig {
  typeKey: string;
  primaryTitle: string;
  secondaryTitle: string;
  tagline: string;
  bgGradStart: string;
  bgGradMid: string;
  bgGradEnd: string;
  accentColor: string;
  glowColor: string;
  defaultArtists: string[];
  patternType: 'waves' | 'circles' | 'slashes' | 'radar' | 'blocks' | 'sunburst';
}

const STYLE_CONFIGS: Record<string, MixStyleConfig> = {
  happy: {
    typeKey: 'happy',
    primaryTitle: 'HAPPY',
    secondaryTitle: 'MIX',
    tagline: 'Campuran Ceria',
    bgGradStart: '#F59E0B',
    bgGradMid: '#D97706',
    bgGradEnd: '#78350F',
    accentColor: '#FDE047',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    defaultArtists: ['NIKI', 'Bruno Mars', 'Dua Lipa', 'Bernadya'],
    patternType: 'sunburst'
  },
  chill: {
    typeKey: 'chill',
    primaryTitle: 'CHILL',
    secondaryTitle: 'MIX',
    tagline: 'Campuran Santai',
    bgGradStart: '#8B5CF6',
    bgGradMid: '#6D28D9',
    bgGradEnd: '#1E1B4B',
    accentColor: '#C4B5FD',
    glowColor: 'rgba(139, 92, 246, 0.45)',
    defaultArtists: ['Rex Orange County', 'Boy Pablo', 'Ardhito Pramono', 'NIKI'],
    patternType: 'waves'
  },
  sad: {
    typeKey: 'sad',
    primaryTitle: 'SEDIH',
    secondaryTitle: 'MIX',
    tagline: 'Campuran Melankolis',
    bgGradStart: '#0284C7',
    bgGradMid: '#0369A1',
    bgGradEnd: '#0B192C',
    accentColor: '#7DD3FC',
    glowColor: 'rgba(2, 132, 199, 0.45)',
    defaultArtists: ['Bernadya', 'Tulus', 'Hindia', 'Pamungkas'],
    patternType: 'circles'
  },
  energetic: {
    typeKey: 'energetic',
    primaryTitle: 'SEMANGAT',
    secondaryTitle: 'MIX',
    tagline: 'Campuran Semangat',
    bgGradStart: '#EF4444',
    bgGradMid: '#DC2626',
    bgGradEnd: '#450A0A',
    accentColor: '#FCA5A5',
    glowColor: 'rgba(239, 68, 68, 0.45)',
    defaultArtists: ['Coldplay', 'Imagine Dragons', 'The Weeknd', 'Feast'],
    patternType: 'slashes'
  },
  discover_weekly: {
    typeKey: 'discover_weekly',
    primaryTitle: 'DISCOVER',
    secondaryTitle: 'WEEKLY',
    tagline: 'Penemuan Mingguan',
    bgGradStart: '#6366F1',
    bgGradMid: '#4338CA',
    bgGradEnd: '#0F172A',
    accentColor: '#A5B4FC',
    glowColor: 'rgba(99, 102, 241, 0.45)',
    defaultArtists: ['Taylor Swift', 'Hindia', 'NIKI', 'Billie Eilish'],
    patternType: 'circles'
  },
  daily_mix: {
    typeKey: 'daily_mix',
    primaryTitle: 'DAILY',
    secondaryTitle: 'MIX',
    tagline: 'Campuran Harian',
    bgGradStart: '#10B981',
    bgGradMid: '#059669',
    bgGradEnd: '#064E3B',
    accentColor: '#6EE7B7',
    glowColor: 'rgba(16, 185, 129, 0.45)',
    defaultArtists: ['Tulus', 'Pamungkas', 'Feast', 'Hindia'],
    patternType: 'blocks'
  },
  release_radar: {
    typeKey: 'release_radar',
    primaryTitle: 'RELEASE',
    secondaryTitle: 'RADAR',
    tagline: 'Radar Rilis Baru',
    bgGradStart: '#06B6D4',
    bgGradMid: '#0891B2',
    bgGradEnd: '#082F49',
    accentColor: '#67E8F9',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    defaultArtists: ['Billie Eilish', 'Bernadya', 'The Weeknd', 'Taylor Swift'],
    patternType: 'radar'
  }
};

/**
 * Identifies which mix style config to use based on id, mood, mixType, or name.
 */
function resolveMixConfig(opts: SpotifyMixCoverOptions): MixStyleConfig {
  const id = (opts.id || '').toLowerCase();
  const mood = (opts.mood || '').toLowerCase();
  const mixType = (opts.mixType || '').toLowerCase();
  const name = (opts.name || '').toLowerCase();

  if (mood === 'happy' || id.includes('happy') || name.includes('happy') || name.includes('ceria')) {
    return STYLE_CONFIGS.happy;
  }
  if (mood === 'chill' || id.includes('chill') || name.includes('chill') || name.includes('santai')) {
    return STYLE_CONFIGS.chill;
  }
  if (mood === 'sad' || id.includes('sad') || name.includes('sad') || name.includes('sedih') || name.includes('melankolis')) {
    return STYLE_CONFIGS.sad;
  }
  if (mood === 'energetic' || id.includes('energetic') || name.includes('energetic') || name.includes('semangat')) {
    return STYLE_CONFIGS.energetic;
  }
  if (mixType === 'discover_weekly' || id.includes('discover') || name.includes('discover')) {
    return STYLE_CONFIGS.discover_weekly;
  }
  if (mixType === 'daily_mix' || id.includes('daily') || name.includes('daily') || name.includes('mungkin kamu suka')) {
    return STYLE_CONFIGS.daily_mix;
  }
  if (mixType === 'release_radar' || id.includes('release') || id.includes('radar') || name.includes('radar') || name.includes('release')) {
    return STYLE_CONFIGS.release_radar;
  }

  // Fallback
  return STYLE_CONFIGS.daily_mix;
}

/**
 * Clean and escape XML entities for safe SVG text.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Extracts clean top artists for cover subtitle.
 */
function getTopArtistsForCover(opts: SpotifyMixCoverOptions, config: MixStyleConfig): string {
  // If explicitly passed
  if (opts.artists && opts.artists.length > 0) {
    const list = opts.artists.slice(0, 3);
    return list.join(', ') + (list.length >= 2 ? ' dan lainnya' : '');
  }

  // If songs available
  if (opts.songs && opts.songs.length > 0) {
    const extracted: string[] = [];
    for (const s of opts.songs) {
      if (!s) continue;
      let artist = s.artist || '';
      if (!artist && s.title && s.title.includes(' - ')) {
        artist = s.title.split(' - ')[0];
      }
      if (artist) {
        let clean = artist.split(/\s+(feat\.|ft\.|featuring|with)\s+/i)[0].split(/\s*[,/&]\s*/)[0].trim();
        if (clean && clean.length > 1 && !clean.toLowerCase().includes('unknown') && !extracted.includes(clean)) {
          extracted.push(clean);
        }
      }
      if (extracted.length >= 3) break;
    }
    if (extracted.length > 0) {
      return extracted.join(', ') + ' dan lainnya';
    }
  }

  // Fallback to default artists in config
  return config.defaultArtists.slice(0, 3).join(', ') + ' dan lainnya';
}

/**
 * Renders SVG geometric background pattern based on mix type.
 */
function renderPattern(patternType: MixStyleConfig['patternType'], accent: string): string {
  switch (patternType) {
    case 'sunburst':
      return `
        <!-- Warm radiant sunburst circles -->
        <circle cx="380" cy="110" r="160" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.18" />
        <circle cx="380" cy="110" r="220" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.12" stroke-dasharray="8 6" />
        <circle cx="380" cy="110" r="280" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.08" />
        <circle cx="380" cy="110" r="50" fill="${accent}" fill-opacity="0.15" filter="url(#ambient_glow)" />
      `;
    case 'waves':
      return `
        <!-- Smooth acoustic wave ribbon -->
        <path d="M 160,0 C 260,120 280,260 500,280 L 500,0 Z" fill="${accent}" fill-opacity="0.08" />
        <path d="M 0,220 C 140,240 260,160 500,340" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.2" />
        <path d="M 0,260 C 160,280 280,200 500,380" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.12" stroke-dasharray="6 6" />
      `;
    case 'circles':
      return `
        <!-- Melancholic / Cosmic concentric ripples -->
        <circle cx="370" cy="220" r="70" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.25" />
        <circle cx="370" cy="220" r="130" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.18" />
        <circle cx="370" cy="220" r="190" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.12" stroke-dasharray="8 6" />
        <circle cx="370" cy="220" r="250" fill="none" stroke="${accent}" stroke-width="1" stroke-opacity="0.07" />
      `;
    case 'slashes':
      return `
        <!-- High-voltage diagonal slashes -->
        <line x1="280" y1="0" x2="500" y2="220" stroke="${accent}" stroke-width="3" stroke-opacity="0.25" />
        <line x1="330" y1="0" x2="500" y2="170" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.18" stroke-dasharray="10 8" />
        <line x1="230" y1="0" x2="500" y2="270" stroke="${accent}" stroke-width="2" stroke-opacity="0.12" />
        <polygon points="400,60 480,140 440,200 360,120" fill="${accent}" fill-opacity="0.06" />
      `;
    case 'radar':
      return `
        <!-- Radar concentric rings and sweep pulse -->
        <circle cx="360" cy="180" r="50" fill="none" stroke="${accent}" stroke-width="2" stroke-opacity="0.3" />
        <circle cx="360" cy="180" r="110" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.2" />
        <circle cx="360" cy="180" r="170" fill="none" stroke="${accent}" stroke-width="1.5" stroke-opacity="0.12" stroke-dasharray="6 6" />
        <circle cx="360" cy="180" r="230" fill="none" stroke="${accent}" stroke-width="1" stroke-opacity="0.06" />
        <line x1="360" y1="180" x2="490" y2="90" stroke="${accent}" stroke-width="2" stroke-opacity="0.35" />
      `;
    case 'blocks':
    default:
      return `
        <!-- Spotify dual-tone emerald geometric split -->
        <polygon points="260,0 500,0 500,260" fill="${accent}" fill-opacity="0.08" />
        <line x1="260" y1="0" x2="500" y2="240" stroke="${accent}" stroke-width="2" stroke-opacity="0.25" />
        <line x1="290" y1="0" x2="500" y2="210" stroke="${accent}" stroke-width="1" stroke-opacity="0.15" stroke-dasharray="8 6" />
      `;
  }
}

/**
 * Generates an SVG Data URI for an authentic Spotify Mix cover.
 */
export function generateSpotifyMixCover(opts: SpotifyMixCoverOptions): string {
  const config = resolveMixConfig(opts);
  const topArtists = escapeXml(getTopArtistsForCover(opts, config));
  const primaryTitle = escapeXml(config.primaryTitle);
  const secondaryTitle = escapeXml(config.secondaryTitle);
  const tagline = escapeXml(opts.tagline || config.tagline);
  const gradId = `spotify_grad_${config.typeKey}_${Math.floor(Math.random() * 10000)}`;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="100%" height="100%">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${config.bgGradStart}" />
      <stop offset="50%" stop-color="${config.bgGradMid}" />
      <stop offset="100%" stop-color="${config.bgGradEnd}" />
    </linearGradient>

    <!-- Dark Contrast Overlay -->
    <linearGradient id="overlay_${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.3" />
      <stop offset="35%" stop-color="#000000" stop-opacity="0.05" />
      <stop offset="65%" stop-color="#000000" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.94" />
    </linearGradient>

    <!-- Ambient Blur Filter -->
    <filter id="ambient_glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="24" result="blur" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="500" height="500" fill="url(#${gradId})" />

  <!-- Ambient Dynamic Shapes & Patterns -->
  ${renderPattern(config.patternType, config.accentColor)}

  <!-- Dark Readability Overlay -->
  <rect width="500" height="500" fill="url(#overlay_${gradId})" />

  <!-- Top Header Bar: Spotify Equalizer Soundwaves + Brand Label -->
  <g transform="translate(42, 54)">
    <!-- Equalizer Sound Wave Bars -->
    <rect x="0" y="8" width="4" height="14" rx="2" fill="#ffffff" opacity="0.95" />
    <rect x="7" y="2" width="4" height="24" rx="2" fill="#ffffff" opacity="0.95" />
    <rect x="14" y="9" width="4" height="16" rx="2" fill="#ffffff" opacity="0.95" />
    <rect x="21" y="4" width="4" height="21" rx="2" fill="#ffffff" opacity="0.95" />
    <rect x="28" y="11" width="4" height="12" rx="2" fill="#ffffff" opacity="0.95" />

    <!-- Label -->
    <text x="44" y="20" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="13" font-weight="800" letter-spacing="3" opacity="0.95">
      SPOTIFY MIX
    </text>
  </g>

  <!-- Center Typographic Lockup (Iconic Spotify 2-tier title) -->
  <g transform="translate(42, 215)">
    <!-- Colored Accent Pill -->
    <rect x="0" y="-72" width="36" height="5" rx="2.5" fill="${config.accentColor}" opacity="0.9" />

    <!-- Primary Word (e.g. HAPPY / CHILL / DISCOVER / DAILY) -->
    <text x="0" y="-12" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="52" font-weight="900" letter-spacing="-1.5">
      ${primaryTitle}
    </text>

    <!-- Secondary Word (e.g. MIX / WEEKLY / RADAR) -->
    <text x="0" y="42" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="38" font-weight="700" letter-spacing="-0.5" opacity="0.92">
      ${secondaryTitle}
    </text>
  </g>

  <!-- Bottom Featured Artists Bar (Signature Spotify Touch) -->
  <g transform="translate(42, 412)">
    <!-- Thin Glass Divider Line -->
    <line x1="0" y1="0" x2="416" y2="0" stroke="rgba(255, 255, 255, 0.18)" stroke-width="1" />

    <!-- Top Featured Artists List -->
    <text x="0" y="30" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="600" opacity="0.92">
      ${topArtists}
    </text>

    <!-- Tagline & Playlist Descriptor -->
    <text x="0" y="52" fill="rgba(255, 255, 255, 0.65)" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="12" font-weight="400">
      ${tagline} • Dibuat khusus untukmu
    </text>
  </g>
</svg>
  `.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Determines if a playlist is a mix / algorithmic playlist.
 */
export function isMixPlaylist(playlist: any): boolean {
  if (!playlist) return false;
  const id = (playlist.id || '').toLowerCase();
  return Boolean(
    playlist.isTemporary ||
    playlist.mixType ||
    playlist.mood ||
    id.startsWith('temp_') ||
    id.startsWith('vibe_')
  );
}

/**
 * Universal helper to get a playlist cover:
 * - If it's a Mix Playlist: ALWAYS returns the authentic Spotify Mix SVG cover (never first song thumbnail!).
 * - If it's a regular playlist: returns custom avatar or falls back.
 */
export function getMixPlaylistCover(playlist: any, extraOpts?: Partial<SpotifyMixCoverOptions>): string {
  if (!playlist) return '';

  if (isMixPlaylist(playlist)) {
    return generateSpotifyMixCover({
      id: playlist.id,
      name: playlist.name,
      mixType: playlist.mixType,
      mood: playlist.mood,
      songs: playlist.songs,
      tagline: playlist.tagline,
      description: playlist.description,
      ...extraOpts
    });
  }

  return playlist.avatar || '';
}
