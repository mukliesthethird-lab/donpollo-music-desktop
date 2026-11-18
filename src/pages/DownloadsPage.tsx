import React from 'react';
import { DownloadCloud, Database, WifiOff, FolderPlus, Play, CheckCircle2, Heart, Trash2 } from 'lucide-react';
import { getCleanThumbnail, getHighResImage, applyDragGhost } from '../utils/mediaHelpers';

interface DownloadsPageProps {
  downloadedSongs: any[];
  setDownloadedSongs: React.Dispatch<React.SetStateAction<any[]>>;
  cacheSize: number;
  currentSong: any;
  startPlayingFromList: (list: any[], startIndex: number) => void;
  setDraggedGlobalSong: (song: any | null) => void;
  formatTime: (sec: number) => string;
  toggleLike: (song: any) => void;
  isLiked: (id?: string) => boolean;
  t: (key: any) => string;
}

export const DownloadsPage: React.FC<DownloadsPageProps> = ({
  downloadedSongs,
  setDownloadedSongs,
  cacheSize,
  currentSong,
  startPlayingFromList,
  setDraggedGlobalSong,
  formatTime,
  toggleLike,
  isLiked,
  t,
}) => (
  <div className="page-content offline-mode" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
    <div style={{ padding: '32px 32px 16px 32px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '24px', color: 'var(--text-primary)' }}>{t('offlineVault')}</h1>

      {/* Dashboard Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)' }}>
            <DownloadCloud size={20} />
            <h3 style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('localCollection')}</h3>
          </div>
          <div style={{ fontSize: '36px', fontWeight: '800' }}>{downloadedSongs.length} <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>{t('songs')}</span></div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('availableOffline')}</div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Database size={20} />
            <h3 style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>{t('storage')}</h3>
          </div>
          <div style={{ fontSize: '36px', fontWeight: '800' }}>{(cacheSize / (1024 * 1024)).toFixed(1)} <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: '600' }}>MB</span></div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t('totalStorageUsed')}</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #00c6ff, #0072ff)', padding: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.15 }}>
            <WifiOff size={100} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', zIndex: 1, letterSpacing: '0.5px' }}>{t('listenUnlimited').split('\n').map((line, i) => <span key={i}>{line}{i === 0 ? <br /> : ''}</span>)}</h3>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', zIndex: 1, margin: 0, marginTop: '4px', lineHeight: '1.4' }}>{t('listenUnlimitedDesc')}</p>
        </div>
      </div>

      {/* List Section */}
      {downloadedSongs.length === 0 ? (
        <div className="empty-state" style={{ marginTop: '24px', color: 'var(--text-muted)' }}>
          <FolderPlus size={64} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <h3 style={{ color: 'var(--text-secondary)' }}>{t('noDownloads')}</h3>
          <p style={{ fontSize: '13px' }}>{t('noDownloadsDesc')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}><FolderPlus size={20} color="#00c6ff" /> {t('offlineDownloads')}</h2>
              <span style={{ fontSize: '12px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '600' }} onClick={() => startPlayingFromList(downloadedSongs, 0)}>{t('playAll')}</span>
            </div>

            <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', padding: '16px 24px', borderBottom: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                <span>#</span>
                <span>{t('songDetail')}</span>
                <span>{t('duration')}</span>
                <span></span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {downloadedSongs.map((song, i) => (
                  <div key={i} className={`offline-row ${currentSong?.id === song.id ? 'active-row' : ''}`} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 80px', padding: '12px 24px', alignItems: 'center', transition: 'background 0.2s', cursor: 'pointer', borderBottom: i === downloadedSongs.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)' }} onClick={() => startPlayingFromList(downloadedSongs, i)}
                    draggable={true}
                    onDragStart={(e) => { setDraggedGlobalSong(song); applyDragGhost(e, song); }}
                    onDragEnd={(e) => { setDraggedGlobalSong(null); (e.currentTarget as HTMLElement).classList.remove('dragging-origin'); }}
                  >
                    <span style={{ color: currentSong?.id === song.id ? 'var(--accent-primary)' : 'var(--text-muted)', fontSize: '13px', fontWeight: '600' }}>{currentSong?.id === song.id ? <Play size={14} fill="currentColor" /> : String(i + 1).padStart(2, '0')}</span>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', minWidth: 0 }}>
                      <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                        <img src={getCleanThumbnail(song.thumbnail) || getHighResImage(song.cover)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Cover" />
                        <div className="play-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}>
                          <Play fill="currentColor" size={16} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                          <span style={{ fontWeight: '600', fontSize: '14px', color: currentSong?.id === song.id ? 'var(--accent-primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'block' }}>
                            {song.title}
                          </span>
                          <span title="Tersedia Offline" style={{ flexShrink: 0 }}><CheckCircle2 size={14} color="#23a559" /></span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', display: 'block' }}>{song.artist}</span>
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatTime(song.duration)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); toggleLike(song); }}
                        style={{ color: isLiked(song.id) ? '#ff6b9d' : 'var(--text-secondary)' }}
                        title={isLiked(song.id) ? t('btnUnlike') : t('btnLike')}
                      >
                        <Heart size={16} fill={isLiked(song.id) ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        className="btn-icon delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if ((window as any).electronAPI) {
                            (window as any).electronAPI.deleteDownloadedSong(song.id).then(() => {
                              setDownloadedSongs(prev => prev.filter(s => s.id !== song.id));
                            });
                          }
                        }}
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4d4d'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>

    <style>{`
      .offline-row:hover { background: var(--bg-card-hover); }
      .offline-row:hover .play-overlay { opacity: 1 !important; }
    `}</style>
  </div>
);
