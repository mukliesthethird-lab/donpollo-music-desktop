# 🎵 DonPollo Music Desktop v1.3.1 — Official Music Search & Metadata Overhaul

Version **1.3.1** introduces a complete overhaul of the **Music Search** system, delivering a clean, accurate, and professional music discovery experience powered by official music catalog metadata.

---

## ✨ Key Features & Improvements

### 1. Official Metadata Search (Clean Search)
Music search is now integrated directly with the official **Apple Music / iTunes** catalog across two key areas:
- **Main Search Bar** (autocomplete dropdown in the top navigation bar)
- **Playlist Search** (*"Add songs to this playlist"* on playlist detail pages)

**Enhancements:**
- **Clean Song Titles**: Eliminates cluttered YouTube video titles such as `(Official Audio)`, `(Lyric Video)`, `(Remastered 2023)`, `(CDQ 1992)`, etc.
- **Real Artist Names**: Displays the actual performing artists instead of YouTube channel uploaders or third-party label accounts.
- **HD Square Album Artwork**: Crisp, high-resolution square album covers (`500x500`) instead of letterboxed 16:9 thumbnails.
- **Smart Fallback**: Automatically falls back to YouTube Audio search if searching for unreleased tracks, indie songs, or rare fan covers absent from the official catalog.

---

### 2. Zero-Offset Synced Lyrics
- The playback engine matches tracks in the background with **official studio master recordings** that match original album track durations precisely.
- Eliminates video intro/outro offsets commonly found in Music Videos (MVs), ensuring real-time synchronized lyrics (**LRCLib**) stay **100% in sync** from the very first beat.

---

### 3. Clean & Modern SVG Media Badges (Lucide Icons)
- Replaced emoji badge indicators with sleek SVG Lucide icons:
  - **Audio** (`Music`): Official studio master audio.
  - **Lyrics** (`FileText`): Official lyric track.
  - **MV** (`Film`): Official music video.
- Designed to blend seamlessly with DonPollo Music's glassmorphism and dark mode aesthetic.

---

### 4. Playlist Search Preview & Interactivity
- **Instant Audio Preview**: Click album artwork directly within playlist search results to listen to a preview before adding it to your playlist.
- **Interactive Add Button**: Dynamically switches between `+ Add Songs` and `✓ Added to Playlist` with clean localized labels.
- **Safe Playlist Item Removal**: Playlist track removal now safely supports both index-based and metadata-based identification.
- **Resolved Playlist Placeholder**: Fixed toast notifications and buttons that previously displayed raw `{playlist}` placeholder strings.

---

### 5. Full Localization Support
All new search badges, query statuses, and related settings are fully localized in:
- 🇬🇧 English
- 🇮🇩 Indonesian
- 🇯🇵 Japanese (日本語)
- 🇰🇷 Korean (한국어)
