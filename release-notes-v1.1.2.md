# DonPollo Music v1.1.2 - Offline Vault & UI Polish 🎵✨

This update brings one of our most requested features: **Offline Mode**, along with several UI refinements to the search experience!

### ✨ New Features
* **Offline Mode (Offline Vault)** 📡: You can now download songs and play them without an internet connection! The app automatically detects when you go offline, displays a dedicated offline banner, and redirects you to your Library.
* **Local Cache Protocol** 💽: The audio player has been upgraded to seamlessly stream from local memory (via `donpollo-cache://`) whenever it detects a downloaded song, automatically saving your internet data.
* **Search Dropdown Downloads** ⬇️: You can now download songs instantly straight from the live search suggestions dropdown.

### 💄 UI/UX Improvements
* **Smart Search Layout** 🔍: The live search dropdown has received an elegant layout upgrade. When not hovered, song titles dynamically take up 100% of the available space without being prematurely truncated. When hovered, the titles gracefully shrink to make room for the action buttons.
* **Offline Availability Indicators** 🟢: Downloaded songs are now clearly marked with a checkmark icon directly within the UI so you easily know what's available offline.

### 🐛 Bug Fixes & Under the Hood
* Fixed TypeScript type errors related to `lucide-react` icon attributes.
* Fixed missing localization strings for the Offline Mode banner.
* Improved stability for the auto-updater cycle.

---
**Installation:**
Simply download the `.exe` file below and run it. If you are already on `v1.1.1`, the app will automatically detect this update and prompt you to install it (ensure both the `.exe` and `latest.yml` are uploaded to the release).
