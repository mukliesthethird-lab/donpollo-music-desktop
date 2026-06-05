# DonPollo Music Desktop 🎵

DonPollo Music Desktop is a modern, premium, and lightning-fast music streaming application built specifically for desktop environments. Designed with a sleek glassmorphism UI and packed with community-driven features, it brings your favorite tunes to life.

## ✨ Key Features

- **Seamless Streaming**: Search and play high-quality official audio tracks instantly.
- **Discord Integration**: 
  - Login with Discord to securely save and sync your custom playlists across devices.
  - **Custom Rich Presence (RPC)**: Automatically showcase the song you're currently jamming to directly on your Discord profile, complete with live timestamps!
- **Synced Lyrics & Romanization**: Sing along with real-time synchronized lyrics. Features built-in romanization for K-Pop (Korean) and J-Pop (Japanese) tracks!
- **Mini Player Mode**: A sleek, compact "Always-on-Top" mini-player that stays out of your way while keeping controls accessible.
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

## 📦 Building for Production

To create a distributable executable (.exe) for Windows:

```bash
npm run dist
```
The compiled installer will be available in the `release/` directory.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/mukliesthethird-lab/donpollo-music-desktop/issues).

---
*Built with ❤️ by the DonPollo Team.*
