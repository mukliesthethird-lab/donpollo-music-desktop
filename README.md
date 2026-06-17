>Licensed under the Apache License, Version 2.0;
you may not use this file except in compliance with the License.

# DonPollo Music Desktop 🎵

DonPollo Music Desktop is a modern, premium, and lightning-fast music streaming application built specifically for desktop environments. Designed with a sleek glassmorphism UI and packed with community-driven features, it brings your favorite tunes to life.

## ✨ Key Features

- **Seamless Streaming**: Search and play high-quality official audio tracks instantly.
- **Discord Integration**: 
  - Login with Discord to securely save and sync your custom playlists across devices.
  - **Custom Rich Presence (RPC)**: Automatically showcase the song you're currently jamming to directly on your Discord profile, complete with live timestamps!
- **Synced Lyrics & Romanization**: Sing along with real-time synchronized lyrics. Features built-in romanization for K-Pop (Korean) and J-Pop (Japanese) tracks!
- **Multi-language Support**: Fully localized in English, Indonesian (Bahasa Indonesia), and Japanese (日本語).
- **Silent Auto-Updates**: Never worry about downloading new patches manually. The app updates itself automatically in the background.


## 🚀 Tech Stack

- **Framework**: [Electron](https://www.electronjs.org/) + [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/) + [tsup](https://tsup.egoist.dev/)
- **Styling**: Modern CSS with CSS Variables & Glassmorphism Aesthetics
- **Icons**: [Lucide React](https://lucide.dev/)
- **State Management**: React Hooks

## 🛠️ Development Setup

To run DonPollo Music locally in development mode:

1. Clone the repository:
   ```bash
   git clone https://github.com/mukliesthethird-lab/donpollo-music-desktop.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## 📋 Dependencies

### Production Dependencies

| Package | Version | Description |
|---|---|---|
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) |^2026.03.17| Required to stream and download audio tracks |
| `@stef-0012/synclyrics` | ^2.5.10 | Real-time synchronized lyrics fetching |
| `aromanize` | ^0.1.5 | Korean text romanization |
| `discord-rpc` | ^4.0.1 | Discord Rich Presence integration |
| `dotenv` | ^17.4.2 | Environment variable loader from `.env` files |
| `electron-updater` | ^6.8.3 | Silent auto-update support for Electron apps |
| `fast-average-color` | ^9.5.2 | Extracts dominant color from album art |
| `kuroshiro` | ^1.2.0 | Japanese text conversion (Kanji → Hiragana / Romaji) |
| `kuroshiro-analyzer-kuromoji` | ^1.1.0 | Morphological analyzer for kuroshiro |
| `lucide-react` | ^1.17.0 | Beautiful & consistent icon library for React |
| `mysql2` | ^3.22.4 | MySQL database client |
| `react` | ^19.2.7 | Core UI library |
| `react-dom` | ^19.2.7 | React DOM renderer |
| `react-router-dom` | ^7.16.0 | Client-side routing for React |

## 📦 Building for Production

To create a distributable executable (.exe) for Windows:

```bash
npm run dist
```
The compiled installer will be available in the `release/` directory.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/mukliesthethird-lab/donpollo-music-desktop/issues).

## 💬 Community & Support

Need help, have a feature request, or just want to hang out with other music lovers? 
**Join our official Discord Server: [https://discord.gg/usn49FDhMr](https://discord.gg/usn49FDhMr)**

---
*Built with ❤️ by the DonPollo Team.*
