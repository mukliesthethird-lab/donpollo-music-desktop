import React from 'react';
import {
  DownloadCloud, Paintbrush, UserCircle, RefreshCw, LogOut, LogIn, Check,
  Globe, Volume2, RotateCcw, Settings, Headphones, Library, Trash2,
  Zap, Radio, Timer
} from 'lucide-react';
import type { DiscordUser } from '../utils/mediaHelpers';
import type { Language } from '../translations';

declare const __APP_VERSION__: string;

interface SettingsPageProps {
  updateInfo: { available: boolean; downloading: boolean; progress: number; ready: boolean; error: string; isChecking?: boolean; checkMsg?: string };
  setUpdateInfo: React.Dispatch<React.SetStateAction<any>>;
  settings: any;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
  discordUser: DiscordUser | null;
  getDiscordAvatar: (user: DiscordUser | null) => string | null;
  handleAvatarError: (e: any, userId?: string | null, username?: string) => void;
  refreshDiscordProfile: (manual?: boolean) => void;
  isRefreshingProfile: boolean;
  logoutDiscord: () => void;
  loginWithDiscord: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  audioOutputDevices: MediaDeviceInfo[];
  applyAudioOutputDevice: (deviceId?: string) => void;
  loadAudioOutputDevices: () => void;
  isRefreshingAudioDevices: boolean;
  volume: number;
  setVolume: (v: number) => void;
  searchCacheRef: React.MutableRefObject<Record<string, any>>;
  isGuest: boolean;
  activePartyId: string | null;
  customEqPresets: { name: string; bands: number[] }[];
  setCustomEqPresets: React.Dispatch<React.SetStateAction<{ name: string; bands: number[] }[]>>;
  newEqPresetName: string;
  setNewEqPresetName: (v: string) => void;
  playHistoryCount: number;
  playlistsCount: number;
  setShowClearHistoryConfirm: (v: boolean) => void;
  setShowClearPlaylistsConfirm: (v: boolean) => void;
  cachePath: string;
  cacheSize: number;
  handleChangeCacheDir: () => void;
  handleClearCache: () => void;
  showToast: (msg: string, type?: any) => void;
  t: (key: any, params?: Record<string, string>) => string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  updateInfo,
  setUpdateInfo,
  settings,
  setSettings,
  discordUser,
  getDiscordAvatar,
  handleAvatarError,
  refreshDiscordProfile,
  isRefreshingProfile,
  logoutDiscord,
  loginWithDiscord,
  language,
  setLanguage,
  audioOutputDevices,
  applyAudioOutputDevice,
  loadAudioOutputDevices,
  isRefreshingAudioDevices,
  volume,
  setVolume,
  searchCacheRef,
  isGuest,
  activePartyId,
  customEqPresets,
  setCustomEqPresets,
  newEqPresetName,
  setNewEqPresetName,
  playHistoryCount,
  playlistsCount,
  setShowClearHistoryConfirm,
  setShowClearPlaylistsConfirm,
  cachePath,
  cacheSize,
  handleChangeCacheDir,
  handleClearCache,
  showToast,
  t,
}) => (
  <div className="page-content">
    <div className="page-header">
      <h1>{t('settingsTitle')}</h1>
    </div>

    {updateInfo.available && (
      <div className="settings-section" style={{ background: 'rgba(35, 165, 89, 0.1)', border: '1px solid rgba(35, 165, 89, 0.3)' }}>
        <div className="settings-section-title" style={{ color: '#23a559' }}>
          <DownloadCloud size={20} style={{ marginRight: 8 }} /> {t('updateSectionTitle')}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <div style={{ color: 'var(--text-secondary)' }}>
            {updateInfo.error ? (
              <span style={{ color: '#f23f43' }}>Error: {updateInfo.error}</span>
            ) : updateInfo.ready ? (
              t('updateReadyMsg')
            ) : updateInfo.downloading ? (
              `${t('downloadingUpdateMsg')} ${Math.round(updateInfo.progress)}%`
            ) : (
              t('updateAvailableMsg')
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {updateInfo.downloading ? (
              <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${updateInfo.progress}%`, height: '100%', background: '#23a559', transition: 'width 0.2s' }} />
              </div>
            ) : updateInfo.ready ? (
              <button className="btn-primary" style={{ background: '#23a559' }} onClick={() => (window as any).electronAPI.installUpdate()}>
                {t('restartApp')}
              </button>
            ) : (
              <button className="btn-primary" onClick={() => { (window as any).electronAPI.downloadUpdate(); setUpdateInfo((prev: any) => ({ ...prev, downloading: true })); }}>
                {t('downloadNow')}
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {!updateInfo.available && !updateInfo.downloading && !updateInfo.ready && (
      <div className="settings-section">
        <div className="settings-section-title">
          <DownloadCloud size={18} style={{ marginRight: 8 }} /> {t('appUpdateSectionTitle')}
        </div>
        <div className="settings-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="settings-item-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="settings-item-title">{t('manualUpdateCheck')}</div>
            <div className="settings-item-desc" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {t('manualUpdateDesc')}
              {updateInfo.checkMsg && (
                <span style={{
                  color: updateInfo.checkMsg.includes('Error') ? '#f23f43' : 'var(--accent-primary)',
                  fontSize: '0.95em',
                  fontWeight: 500
                }}>
                  {updateInfo.checkMsg}
                </span>
              )}
            </div>
          </div>
          <button className="btn-secondary" style={{ whiteSpace: 'nowrap' }} disabled={updateInfo.isChecking} onClick={async () => {
            try {
              setUpdateInfo((prev: any) => ({ ...prev, isChecking: true, checkMsg: t('checkingUpdate') }));
              const hasUpdate = await (window as any).electronAPI.checkForUpdates();
              if (!hasUpdate) {
                setUpdateInfo((prev: any) => ({ ...prev, isChecking: false, checkMsg: t('alreadyLatest') }));
              } else {
                setUpdateInfo((prev: any) => ({ ...prev, isChecking: false, checkMsg: '' }));
              }
            } catch (err: any) {
              let errorMsg = err.message || err;
              if (typeof errorMsg === 'string' && errorMsg.includes('No published versions on GitHub')) {
                errorMsg = t('noPublishedVersions');
              }
              setUpdateInfo((prev: any) => ({ ...prev, isChecking: false, checkMsg: `Error: ${errorMsg}` }));
            }
          }}>
            {t('manualUpdateCheck')}
          </button>
        </div>
      </div>
    )}

    {/* Tema Tampilan */}
    <div className="settings-section">
      <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Paintbrush size={20} color="var(--accent-primary)" /> {t('themeDisplay')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
        {[
          { id: 'default', name: t('themeDefault'), desc: t('themeDefaultDesc') },
          { id: 'minimalist', name: t('themeMinimalist'), desc: t('themeMinimalistDesc') },
          { id: 'vibrant', name: t('themeVibrant'), desc: t('themeVibrantDesc') }
        ].map(theme => (
          <button
            key={theme.id}
            onClick={() => {
              const newSettings = { ...settings, theme: theme.id };
              setSettings(newSettings);
              localStorage.setItem('donpollo_settings', JSON.stringify(newSettings));
            }}
            style={{
              background: settings.theme === theme.id ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: settings.theme === theme.id ? 'var(--accent-text, #ffffff)' : 'var(--text-primary)',
              border: `1px solid ${settings.theme === theme.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{theme.name}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>{theme.desc}</div>
          </button>
        ))}
      </div>

      {/* Font & Shape Settings */}
      <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 'var(--global-radius)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>{t('fontFamily')}</div>
          <select value={settings.fontFamily || 'Inter'}
            onChange={(e) => {
              const newSettings = { ...settings, fontFamily: e.target.value };
              setSettings(newSettings);
              localStorage.setItem('donpollo_settings', JSON.stringify(newSettings));
            }}
            className="settings-select" style={{ width: '100%' }}>
            <option value="Inter">{t('fontInter')}</option>
            <option value="Roboto">{t('fontRoboto')}</option>
            <option value="Outfit">{t('fontOutfit')}</option>
            <option value="monospace">{t('fontMono')}</option>
          </select>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: 'var(--global-radius)' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>{t('shapeStyle')}</div>
          <select value={settings.borderRadiusMode || 'rounded'}
            onChange={(e) => {
              const newSettings = { ...settings, borderRadiusMode: e.target.value };
              setSettings(newSettings);
              localStorage.setItem('donpollo_settings', JSON.stringify(newSettings));
            }}
            className="settings-select" style={{ width: '100%' }}>
            <option value="rounded">{t('shapeRounded')}</option>
            <option value="sharp">{t('shapeSharp')}</option>
            <option value="pill">{t('shapePill')}</option>
          </select>
        </div>
      </div>
    </div>

    {/* Akun Discord */}
    <div className="settings-section">
      <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><UserCircle size={20} color="var(--accent-primary)" /> {t('accountSection')}</div>
      {discordUser ? (
        <div className="settings-account-card">
          {getDiscordAvatar(discordUser) ? (
            <img src={getDiscordAvatar(discordUser)!} alt="avatar" className="settings-avatar" onError={(e) => handleAvatarError(e, discordUser.id, discordUser.username)} />
          ) : (
            <div className="settings-avatar-placeholder">{(discordUser.global_name || discordUser.username).charAt(0).toUpperCase()}</div>
          )}
          <div className="settings-account-info">
            <div className="settings-account-name">{discordUser.global_name || discordUser.username}</div>
            <div className="settings-account-sub">@{discordUser.username}#{discordUser.discriminator} • Discord</div>
          </div>
          <div className="settings-account-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="btn-secondary"
              onClick={() => refreshDiscordProfile(true)}
              disabled={isRefreshingProfile}
              title={t('syncProfile')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={15} className={isRefreshingProfile ? 'spin' : ''} /> {t('syncProfile')}
            </button>
            <button className="btn-secondary" onClick={logoutDiscord} style={{ color: '#ff5555' }}>
              <LogOut size={16} /> {t('logout')}
            </button>
          </div>
        </div>
      ) : (
        <div className="settings-account-card">
          <div className="settings-avatar-placeholder" style={{ background: '#5865F2' }}>
            <svg width="24" height="24" viewBox="0 0 127.14 96.36" fill="white">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
            </svg>
          </div>
          <div className="settings-account-info">
            <div className="settings-account-name">{t('notLoggedIn')}</div>
            <div className="settings-account-sub">{t('loginToSync')}</div>
          </div>
          <button className="btn-primary" onClick={loginWithDiscord} style={{ marginLeft: 'auto' }}>
            <LogIn size={16} /> {t('loginDiscord')}
          </button>
        </div>
      )}
      <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '16px 0' }}></div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('discordActivity')}</div>
          <div className="settings-desc">{t('discordActivityDesc')}</div>
        </div>
        <button className={`settings-toggle ${settings.discordActivityEnabled !== false ? 'on' : ''}`} onClick={() => {
          const newVal = !(settings.discordActivityEnabled !== false);
          setSettings((p: any) => ({ ...p, discordActivityEnabled: newVal }));
          localStorage.setItem('donpollo_settings', JSON.stringify({ ...settings, discordActivityEnabled: newVal }));
          if (!newVal && (window as any).electronAPI) {
            (window as any).electronAPI.clearActivity();
          }
        }}>
          {settings.discordActivityEnabled !== false && <Check size={14} />}
        </button>
      </div>
    </div>

    {/* Bahasa */}
    <div className="settings-section">
      <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Globe size={20} color="var(--accent-primary)" /> {t('languageSection')}</div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('languageLabel')}</div>
          <div className="settings-desc">{t('languageDesc')}</div>
        </div>
        <div className="language-picker">
          {(['id', 'en', 'ja', 'ko'] as Language[]).map(lang => (
            <button
              key={lang}
              className={`lang-btn ${language === lang ? 'active' : ''}`}
              onClick={() => setLanguage(lang)}
            >
              <img src={
                lang === 'id' ? 'https://flagcdn.com/id.svg' :
                  lang === 'en' ? 'https://flagcdn.com/us.svg' :
                    lang === 'ja' ? 'https://flagcdn.com/jp.svg' :
                      'https://flagcdn.com/kr.svg'
              } alt={lang} />
              {lang === 'id' ? 'Indonesia' : lang === 'en' ? 'English' : lang === 'ja' ? '日本語' : '한국어'}
            </button>
          ))}
        </div>
      </div>
    </div>

    {/* Audio */}
    <div className="settings-section">
      <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Volume2 size={20} color="var(--accent-primary)" /> {t('audioSection')}</div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('audioOutputDevice')}</div>
          <div className="settings-desc">{t('audioOutputDeviceDesc')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            className="settings-select"
            style={{ maxWidth: '240px', textOverflow: 'ellipsis' }}
            value={settings.audioOutputDeviceId || 'default'}
            onChange={e => {
              const newId = e.target.value;
              setSettings((p: any) => {
                const updated = { ...p, audioOutputDeviceId: newId };
                localStorage.setItem('donpollo_settings', JSON.stringify(updated));
                return updated;
              });
              applyAudioOutputDevice(newId);
            }}
          >
            <option value="default">{t('defaultAudioDevice')}</option>
            {audioOutputDevices
              .filter(dev => dev.deviceId !== 'default' && dev.deviceId !== 'communications')
              .map(dev => (
                <option key={dev.deviceId} value={dev.deviceId} title={dev.label}>
                  {dev.label || `Audio Device (${dev.deviceId.slice(0, 8)}...)`}
                </option>
              ))}
          </select>
          <button
            className="chat-btn"
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isRefreshingAudioDevices ? 'not-allowed' : 'pointer'
            }}
            onClick={() => loadAudioOutputDevices()}
            title={t('refreshAudioDevices')}
            disabled={isRefreshingAudioDevices}
          >
            <RotateCcw
              size={14}
              style={{
                animation: isRefreshingAudioDevices ? 'spin 1s linear infinite' : 'none',
                color: 'var(--text-secondary)'
              }}
            />
          </button>
        </div>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('defaultVolume')}</div>
          <div className="settings-desc">{t('defaultVolumeDesc')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{Math.round(volume * 100)}%</span>
          <input type="range" min="0" max="1" step="0.01" value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            style={{ width: '120px', accentColor: 'var(--accent-primary)' }} />
        </div>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('audioQuality')}</div>
          <div className="settings-desc">{t('audioQualityDesc')}</div>
        </div>
        <select className="settings-select"
          value={settings.audioQuality || 'auto'}
          onChange={e => setSettings((p: any) => ({ ...p, audioQuality: e.target.value }))}>
          <option value="auto">{t('qualityAuto')}</option>
          <option value="high">{t('qualityHigh')}</option>
          <option value="medium">{t('qualityMedium')}</option>
        </select>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('normalizeAudio')}</div>
          <div className="settings-desc">{t('normalizeAudioDesc')}</div>
        </div>
        <button className={`settings-toggle ${settings.normalizeAudio ? 'on' : ''}`}
          onClick={() => {
            const newVal = !settings.normalizeAudio;
            setSettings((p: any) => ({ ...p, normalizeAudio: newVal }));
            localStorage.setItem('donpollo_settings', JSON.stringify({ ...settings, normalizeAudio: newVal }));
          }}>
          {settings.normalizeAudio && <Check size={14} />}
        </button>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('prioritizeOfficialAudio')}</div>
          <div className="settings-desc">{t('prioritizeOfficialAudioDesc')}</div>
        </div>
        <button className={`settings-toggle ${settings.prioritizeOfficialAudio !== false ? 'on' : ''}`}
          onClick={() => {
            const newVal = !(settings.prioritizeOfficialAudio !== false);
            setSettings((p: any) => ({ ...p, prioritizeOfficialAudio: newVal }));
            localStorage.setItem('donpollo_settings', JSON.stringify({ ...settings, prioritizeOfficialAudio: newVal }));
            searchCacheRef.current = {};
          }}>
          {settings.prioritizeOfficialAudio !== false && <Check size={14} />}
        </button>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('vibeSettingTitle')}</div>
          <div className="settings-desc">{t('vibeSettingDesc')}</div>
        </div>
        <button className={`settings-toggle ${settings.vibeCheckEnabled !== false ? 'on' : ''}`}
          onClick={() => {
            const newVal = !(settings.vibeCheckEnabled !== false);
            setSettings((p: any) => ({ ...p, vibeCheckEnabled: newVal }));
            localStorage.setItem('donpollo_settings', JSON.stringify({ ...settings, vibeCheckEnabled: newVal }));
          }}>
          {settings.vibeCheckEnabled !== false && <Check size={14} />}
        </button>
      </div>
      {settings.vibeCheckEnabled !== false && (
        <div className="settings-row">
          <div>
            <div className="settings-label">{t('vibeInterval')}</div>
            <div className="settings-desc">{t('vibeIntervalSongs').replace('{0}', String(settings.vibeCheckInterval || 15))}</div>
          </div>
          <select className="settings-select"
            value={settings.vibeCheckInterval !== undefined ? settings.vibeCheckInterval : 15}
            onChange={e => {
              const val = Number(e.target.value);
              setSettings((p: any) => ({ ...p, vibeCheckInterval: val }));
              localStorage.setItem('donpollo_settings', JSON.stringify({ ...settings, vibeCheckInterval: val }));
            }}>
            <option value="10">{t('vibeIntervalSongs').replace('{0}', '10')}</option>
            <option value="15">{t('vibeIntervalSongs').replace('{0}', '15')}</option>
            <option value="20">{t('vibeIntervalSongs').replace('{0}', '20')}</option>
            <option value="0">{t('vibeIntervalManual')}</option>
          </select>
        </div>
      )}
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('searchStorefront')}</div>
          <div className="settings-desc">{t('searchStorefrontDesc')}</div>
        </div>
        <select className="settings-select"
          value={settings.searchCountry || localStorage.getItem('donpollo_search_country') || 'auto'}
          onChange={e => {
            const val = e.target.value;
            localStorage.setItem('donpollo_search_country', val);
            setSettings((p: any) => ({ ...p, searchCountry: val }));
            searchCacheRef.current = {};
          }}>
          <option value="auto">{t('storefrontAuto')}</option>
          <option value="ID">{t('storefrontId')}</option>
          <option value="US">{t('storefrontUs')}</option>
          <option value="JP">{t('storefrontJp')}</option>
          <option value="KR">{t('storefrontKr')}</option>
        </select>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">
            {t('crossfadeLabel')}
            {isGuest && activePartyId && (
              <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                (Disinkronkan dari Host)
              </span>
            )}
          </div>
          <div className="settings-desc">{t('crossfadeDesc')}</div>
        </div>
        <select className="settings-select"
          disabled={isGuest && !!activePartyId}
          style={isGuest && !!activePartyId ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
          value={localStorage.getItem('donpollo_crossfade') || '0'}
          onChange={e => {
            localStorage.setItem('donpollo_crossfade', e.target.value);
            setSettings((p: any) => ({ ...p, crossfade: e.target.value }));
          }}>
          <option value="0">{t('crossfadeOff')}</option>
          <option value="3">3 {t('crossfadeSec')}</option>
          <option value="5">5 {t('crossfadeSec')}</option>
          <option value="7">7 {t('crossfadeSec')}</option>
          <option value="10">10 {t('crossfadeSec')}</option>
        </select>
      </div>
    </div>

    {/* Tampilan */}
    <div className="settings-section">
      <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={20} color="var(--accent-primary)" /> {t('displaySection')}</div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('autoLyrics')}</div>
          <div className="settings-desc">{t('autoLyricsDesc')}</div>
        </div>
        <button className={`settings-toggle ${settings.autoLyrics ? 'on' : ''}`}
          onClick={() => setSettings((p: any) => ({ ...p, autoLyrics: !p.autoLyrics }))}>
          {settings.autoLyrics && <Check size={14} />}
        </button>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('autoSidebar')}</div>
          <div className="settings-desc">{t('autoSidebarDesc')}</div>
        </div>
        <button className={`settings-toggle ${settings.autoSidebar !== false ? 'on' : ''}`}
          onClick={() => setSettings((p: any) => ({ ...p, autoSidebar: !(p.autoSidebar !== false) }))}>
          {settings.autoSidebar !== false && <Check size={14} />}
        </button>
      </div>

      <div className="settings-row">
        <div>
          <div className="settings-label">{t('closeToTray')}</div>
          <div className="settings-desc">{t('closeToTrayDesc')}</div>
        </div>
        <button className={`settings-toggle ${settings.closeToTray ? 'on' : ''}`}
          onClick={() => {
            const newVal = !settings.closeToTray;
            setSettings((p: any) => ({ ...p, closeToTray: newVal }));
            if ((window as any).electronAPI?.setCloseToTray) {
              (window as any).electronAPI.setCloseToTray(newVal);
            }
          }}>
          {settings.closeToTray && <Check size={14} />}
        </button>
      </div>

      <div className="settings-row">
        <div>
          <div className="settings-label">{t('lyricsTranslateLangLabel')}</div>
          <div className="settings-desc">{t('lyricsTranslateLangDesc')}</div>
        </div>
        <select
          className="settings-select"
          value={settings.lyricsTargetLang || 'auto'}
          onChange={(e) => {
            const val = e.target.value;
            const updated = { ...settings, lyricsTargetLang: val };
            setSettings(updated);
            localStorage.setItem('donpollo_settings', JSON.stringify(updated));
          }}
        >
          <option value="auto">{t('lyricsLangAuto')}</option>
          <option value="id">Indonesia</option>
          <option value="en">English</option>
          <option value="ja">日本語 (Japanese)</option>
          <option value="ko">한국어 (Korean)</option>
          <option value="es">Español (Spanish)</option>
          <option value="fr">Français (French)</option>
        </select>
      </div>
    </div>

    {/* Audio & Equalizer */}
    <div className="settings-section">
      <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Headphones size={20} color="var(--accent-primary)" /> {t('equalizer')}</div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('audioVisualizerLabel')}</div>
          <div className="settings-desc">{t('audioVisualizerDesc')}</div>
        </div>
        <button className={`settings-toggle ${settings.showVisualizer !== false ? 'on' : ''}`}
          onClick={() => {
            const newVal = !(settings.showVisualizer !== false);
            setSettings((p: any) => {
              const updated = { ...p, showVisualizer: newVal };
              localStorage.setItem('donpollo_settings', JSON.stringify(updated));
              return updated;
            });
          }}>
          {settings.showVisualizer !== false && <Check size={14} />}
        </button>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('eqEnabled')}</div>
          <div className="settings-desc">{t('eqEnabledDesc')}</div>
        </div>
        <button className={`settings-toggle ${settings.eqEnabled ? 'on' : ''}`}
          onClick={() => setSettings((p: any) => ({ ...p, eqEnabled: !p.eqEnabled }))}>
          {settings.eqEnabled && <Check size={14} />}
        </button>
      </div>
      {settings.eqEnabled && (
        <div className="settings-eq-container" style={{ position: 'relative', marginTop: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Preset</span>
              <select
                className="settings-select"
                style={{ padding: '10px 36px 10px 14px', fontSize: '12px', minWidth: '140px' }}
                value={
                  (() => {
                    const b = (settings.eqBands || [0, 0, 0, 0, 0]).join(',');
                    if (b === '0,0,0,0,0') return 'default';
                    if (b === '6,4,0,-2,-4') return 'bass_booster';
                    if (b === '-2,2,4,3,-1') return 'pop';
                    if (b === '4,3,-1,2,5') return 'electronic';
                    if (b === '3,1,0,1,3') return 'acoustic';
                    const customMatch = customEqPresets.find(p => p.bands.join(',') === b);
                    if (customMatch) return `custom:${customMatch.name}`;
                    return 'custom';
                  })()
                }
                onChange={(e) => {
                  const v = e.target.value;
                  let newBands = [...(settings.eqBands || [0, 0, 0, 0, 0])];
                  if (v === 'default') newBands = [0, 0, 0, 0, 0];
                  else if (v === 'bass_booster') newBands = [6, 4, 0, -2, -4];
                  else if (v === 'pop') newBands = [-2, 2, 4, 3, -1];
                  else if (v === 'electronic') newBands = [4, 3, -1, 2, 5];
                  else if (v === 'acoustic') newBands = [3, 1, 0, 1, 3];
                  else if (v.startsWith('custom:')) {
                    const found = customEqPresets.find(p => p.name === v.slice(7));
                    if (found) newBands = [...found.bands];
                  }
                  setSettings((p: any) => ({ ...p, eqBands: newBands }));
                }}
              >
                <option value="custom">Custom</option>
                <option value="default">Default (Flat)</option>
                <option value="bass_booster">Bass Booster</option>
                <option value="pop">Pop</option>
                <option value="electronic">Electronic</option>
                <option value="acoustic">Acoustic</option>
                {customEqPresets.map(p => (
                  <option key={p.name} value={`custom:${p.name}`}>★ {p.name}</option>
                ))}
              </select>
              <button
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '11px' }}
                onClick={() => setSettings((p: any) => ({ ...p, eqBands: [0, 0, 0, 0, 0] }))}
                title={t('eqReset')}
              >
                {t('eqReset')}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                type="text"
                value={newEqPresetName}
                onChange={(e) => setNewEqPresetName(e.target.value)}
                placeholder={t('eqPresetPlaceholder')}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)', borderRadius: '8px', padding: '5px 10px',
                  fontSize: '11px', width: '110px', outline: 'none'
                }}
              />
              <button
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '11px' }}
                onClick={() => {
                  const name = newEqPresetName.trim();
                  if (!name) return;
                  const bands = [...(settings.eqBands || [0, 0, 0, 0, 0])];
                  const updated = [...customEqPresets.filter(p => p.name !== name), { name, bands }];
                  setCustomEqPresets(updated);
                  localStorage.setItem('donpollo_custom_eq_presets', JSON.stringify(updated));
                  setNewEqPresetName('');
                  showToast(t('eqSavedToast', { name }), 'success');
                }}
              >
                {t('eqSave')}
              </button>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginLeft: '4px' }}>+12dB</span>
            </div>
          </div>

          <div style={{ position: 'relative', height: '180px', width: '100%', marginBottom: '8px' }}>
            <svg viewBox="0 0 1000 180" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1db954" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#1db954" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d={(() => {
                const bands = settings.eqBands || [0, 0, 0, 0, 0];
                let path = "";
                const points = bands.map((val: number, i: number) => ({
                  x: 100 + (i * 200),
                  y: 90 - (val / 12) * 75
                }));
                path += `M 0,180 L 0,${points[0].y} L ${points[0].x},${points[0].y} `;
                for (let i = 1; i < points.length; i++) {
                  const p0 = points[i - 1];
                  const p1 = points[i];
                  const dx = (p1.x - p0.x) / 2;
                  path += `C ${p0.x + dx},${p0.y} ${p1.x - dx},${p1.y} ${p1.x},${p1.y} `;
                }
                path += `L 1000,${points[points.length - 1].y} L 1000,180 Z`;
                return path;
              })()} fill="url(#eqGrad)" />
              <path d={(() => {
                const bands = settings.eqBands || [0, 0, 0, 0, 0];
                let path = "";
                const points = bands.map((val: number, i: number) => ({
                  x: 100 + (i * 200),
                  y: 90 - (val / 12) * 75
                }));
                path += `M 0,${points[0].y} L ${points[0].x},${points[0].y} `;
                for (let i = 1; i < points.length; i++) {
                  const p0 = points[i - 1];
                  const p1 = points[i];
                  const dx = (p1.x - p0.x) / 2;
                  path += `C ${p0.x + dx},${p0.y} ${p1.x - dx},${p1.y} ${p1.x},${p1.y} `;
                }
                path += `L 1000,${points[points.length - 1].y}`;
                return path;
              })()} fill="none" stroke="#1db954" strokeWidth="3" />

              <line x1="0" y1="90" x2="1000" y2="90" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              {Array.from({ length: 5 }).map((_, i) => (
                <line key={i} x1={100 + (i * 200)} y1="0" x2={100 + (i * 200)} y2="180" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              ))}
            </svg>

            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 2 }}>
              {['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'].map((label, i) => (
                <div key={label} style={{ position: 'absolute', left: `${10 + i * 20}%`, transform: 'translateX(-50%)', height: '100%', width: '30px' }}>
                  <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
                    <input type="range" min="-12" max="12" step="0.1"
                      value={(settings.eqBands || [0, 0, 0, 0, 0])[i]}
                      onChange={(e) => {
                        const newBands = [...(settings.eqBands || [0, 0, 0, 0, 0])];
                        newBands[i] = parseFloat(e.target.value);
                        setSettings((p: any) => ({ ...p, eqBands: newBands }));
                      }}
                      style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-90deg)',
                        width: '180px', height: '20px', margin: 0, opacity: 0, cursor: 'pointer', zIndex: 3
                      }}
                    />
                    <div style={{
                      position: 'absolute', left: '50%', transform: 'translate(-50%, -50%)',
                      top: `${(1 - (((settings.eqBands || [0, 0, 0, 0, 0])[i] + 12) / 24)) * 100}%`,
                      width: '14px', height: '14px', borderRadius: '50%', background: '#fff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.5)', pointerEvents: 'none'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>-12dB</span>
          </div>
          <div style={{ position: 'relative', width: '100%', height: '20px' }}>
            {['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'].map((label, i) => (
              <span key={label} style={{ position: 'absolute', left: `${10 + i * 20}%`, transform: 'translateX(-50%)', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: '600' }}>{label}</span>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Data */}
    <div className="settings-section">
      <div className="settings-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Library size={20} color="var(--accent-primary)" /> {t('dataSection')}</div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('playHistory')}</div>
          <div className="settings-desc">{playHistoryCount} {t('savedSongs')}</div>
        </div>
        <button className="btn-secondary" onClick={() => setShowClearHistoryConfirm(true)}>
          <Trash2 size={14} /> {t('clearHistory')}
        </button>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('playlist')}</div>
          <div className="settings-desc">{playlistsCount} {t('playlistCount')}</div>
        </div>
        <button className="btn-secondary" onClick={() => setShowClearPlaylistsConfirm(true)}>
          <Trash2 size={14} /> {t('deleteAllPlaylists')}
        </button>
      </div>
      <div className="settings-row" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, paddingRight: '16px' }}>
          <div className="settings-label">{t('cacheModeLabel')}</div>
          <div className="settings-desc">{t('cacheModeDesc')}</div>

          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input type="radio" name="cacheMode" value="smart"
                checked={!settings.cacheMode || settings.cacheMode === 'smart'}
                onChange={() => {
                  setSettings((p: any) => ({ ...p, cacheMode: 'smart' }));
                  localStorage.setItem('donpollo_settings', JSON.stringify({ ...settings, cacheMode: 'smart' }));
                }}
                style={{ marginTop: '4px' }}
              />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={16} color="var(--accent-primary)" /> {t('cacheModeSmartCache')}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('cacheModeSmartCacheDesc')}</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input type="radio" name="cacheMode" value="stream"
                checked={settings.cacheMode === 'stream'}
                onChange={() => {
                  setSettings((p: any) => ({ ...p, cacheMode: 'stream' }));
                  localStorage.setItem('donpollo_settings', JSON.stringify({ ...settings, cacheMode: 'stream' }));
                }}
                style={{ marginTop: '4px' }}
              />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Radio size={16} color="var(--accent-primary)" /> {t('cacheModeStream')}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('cacheModeStreamDesc')}</div>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input type="radio" name="cacheMode" value="temp"
                checked={settings.cacheMode === 'temp'}
                onChange={() => {
                  setSettings((p: any) => ({ ...p, cacheMode: 'temp' }));
                  localStorage.setItem('donpollo_settings', JSON.stringify({ ...settings, cacheMode: 'temp' }));
                }}
                style={{ marginTop: '4px' }}
              />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Timer size={16} color="var(--accent-primary)" /> {t('cacheModeTemp')}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('cacheModeTempDesc')}</div>
              </div>
            </label>
          </div>
        </div>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('cacheLocation') || 'Cache Folder Location'}</div>
          <div className="settings-desc">{t('cacheLocationDesc') || 'Choose a folder to store downloaded songs'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {cachePath && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{cachePath}</span>
            </div>
          )}
          <button className="btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={handleChangeCacheDir}>
            {t('changeLocation') || 'Change Location'}
          </button>
        </div>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('clearAudioCache')}</div>
          <div className="settings-desc">{t('audioCacheDesc')}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>
            {(cacheSize / (1024 * 1024)).toFixed(1)} MB
          </span>
          <button className="btn-secondary" style={{ whiteSpace: 'nowrap' }} onClick={handleClearCache}>
            <Trash2 size={14} /> {t('delete')}
          </button>
        </div>
      </div>
      <div className="settings-row">
        <div>
          <div className="settings-label">{t('appVersion')}</div>
          <div className="settings-desc">Don Pollo Music Desktop</div>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>v{__APP_VERSION__ || '1.0.0-BETA'}</span>
      </div>
    </div>
  </div>
);
