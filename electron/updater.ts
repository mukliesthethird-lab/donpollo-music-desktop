import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

let mainWindowGetter: (() => BrowserWindow | null) | null = null;

/**
 * Inject main window reference
 */
export function setMainWindowGetter(getter: () => BrowserWindow | null) {
  mainWindowGetter = getter;
}

/**
 * Get main window safely
 */
function getMainWindow() {
  return mainWindowGetter?.() ?? null;
}

/**
 * INIT UPDATER
 */
export function setupUpdater() {
  // ================================
  // CONFIG (WAJIB STABIL)
  // ================================
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = true;

  // 🔥 IMPORTANT: force GitHub feed (avoid silent mismatch)
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "mukliesthethird-lab",
    repo: "donpollo-music-desktop",
  });

  // ================================
  // LOGGING (DEBUG WAJIB)
  // ================================
  autoUpdater.logger = console as any;
  (autoUpdater as any).logLevel = "info";

  console.log("🚀 Updater initialized");

  // ================================
  // EVENTS
  // ================================
  autoUpdater.on("checking-for-update", () => {
    console.log("🔍 Checking for update...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("⬇️ Update available:", info.version);

    const win = getMainWindow();
    win?.webContents.send("update-available", info);
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("✔️ No update available:", info.version);
  });

  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.round(progress.percent);
    console.log(`⬇️ Downloading: ${percent}%`);

    const win = getMainWindow();
    win?.webContents.send("download-progress", progress);
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("✅ Update downloaded:", info.version);

    const win = getMainWindow();
    win?.webContents.send("update-downloaded", info);
  });

  autoUpdater.on("error", (err) => {
    console.error("❌ Updater error:", err);

    const win = getMainWindow();
    win?.webContents.send("update-error", err?.message || String(err));
  });

  // ================================
  // IPC (renderer control)
  // ================================
  ipcMain.handle("check-for-updates", async () => {
    console.log("📡 Manual update check triggered");

    try {
      const result = await autoUpdater.checkForUpdates();
      if (!result) return false; // Dev mode / skipped
      // result.updateInfo.version gives the latest version from GitHub
      const isNewVersion = result.updateInfo.version !== app.getVersion();
      return isNewVersion;
    } catch (err) {
      console.error("❌ checkForUpdates failed:", err);
      throw err;
    }
  });

  ipcMain.on("download-update", () => {
    console.log("⬇️ Manual download triggered");
    autoUpdater.downloadUpdate();
  });

  ipcMain.on("install-update", () => {
    console.log("🚀 Installing update...");
    autoUpdater.quitAndInstall();
  });
}

/**
 * AUTO CHECK (SAFE VERSION)
 */
export function startAutoUpdateCheck(isDev: boolean) {
  if (isDev) return;

  setTimeout(() => {
    console.log("⏱ Auto update check started");

    autoUpdater.checkForUpdates().catch((err) => {
      console.error("❌ Auto update check failed:", err);
    });
  }, 3000);
}

/**
 * CLI MODE (--update)
 */
export async function checkUpdateCLI() {
  console.log("🧪 CLI update check...");

  try {
    const result = await autoUpdater.checkForUpdates();
    console.log("📦 CLI result:", result);
  } catch (err: any) {
    console.error("❌ CLI update failed:", err?.message || err);
  }

  app.quit();
}