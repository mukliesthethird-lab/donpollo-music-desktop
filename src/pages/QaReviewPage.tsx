import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Play,
  Pause,
  Check,
  Trash2,
  Eye,
  Music2,
  Clock,
  Users,
  ListMusic,
  Heart,
  Headphones,
  Search,
  Lock,
  Globe,
  FileText,
  ChevronDown,
  ChevronUp,
  Award,
  Plus,
  Upload,
} from 'lucide-react';
import { KaraokeLine } from '../components/KaraokeLine';
import type { LyricWord } from '../utils/karaokeLyrics';

interface QaSubmissionLine {
  time: number;
  text: string;
  words?: LyricWord[];
  isInstrumental?: boolean;
}

interface QaSubmission {
  id: number;
  song_key: string;
  video_id?: string | null;
  title: string;
  artist: string;
  lines: QaSubmissionLine[];
  contributor_id?: string | null;
  contributor_name: string;
  created_at?: string | null;
}

interface AdminUserSummary {
  discordId: string;
  username: string;
  avatarUrl: string;
  totalListenSeconds: number;
  playHistoryCount: number;
  likedCount: number;
  playlistCount: number;
  approvedLyricsCount: number;
  submissionsCount: number;
  followingCount: number;
}

interface AdminOverviewSummary {
  totalUsers: number;
  totalPlaylists: number;
  totalApprovedLyrics: number;
  pendingQaCount: number;
  totalListenSeconds: number;
}

interface QaReviewPageProps {
  apiBaseUrl: string;
  adminId?: string;
  theme?: string;
  pauseMainPlayer: () => void;
  onQaCountChange: (count: number) => void;
  showToast: (msg: string, type?: 'playlist' | 'music' | 'error' | 'success' | 'user') => void;
  t?: (key: any) => string;
}

const formatTime = (sec: number) => {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatListenDuration = (totalSec: number) => {
  const sec = Math.max(0, Math.floor(totalSec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}j ${m}m`;
};

const isImageBadgeIcon = (icon?: string) =>
  typeof icon === 'string' && (icon.startsWith('data:image/') || icon.startsWith('http://') || icon.startsWith('https://'));

const renderBadgeIcon = (icon: string, size = 18) =>
  isImageBadgeIcon(icon) ? (
    <img
      src={icon}
      alt=""
      style={{ width: `${size}px`, height: `${size}px`, borderRadius: '5px', objectFit: 'cover', display: 'block', flexShrink: 0 }}
    />
  ) : (
    <span style={{ fontSize: `${Math.round(size * 0.9)}px`, lineHeight: 1 }}>{icon}</span>
  );

export const QaReviewPage: React.FC<QaReviewPageProps> = ({
  apiBaseUrl,
  adminId,
  theme = 'default',
  pauseMainPlayer,
  onQaCountChange,
  showToast,
  t,
}) => {
  const [adminTab, setAdminTab] = useState<'qa' | 'users' | 'badges'>('qa');

  // QA Queue State
  const [submissions, setSubmissions] = useState<QaSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Admin User Monitor State
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [summary, setSummary] = useState<AdminOverviewSummary | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserSummary[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [userSubTab, setUserSubTab] = useState<'history' | 'playlists' | 'lyrics' | 'likes' | 'badges'>('history');
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);

  // Badge Maker State
  const [badges, setBadges] = useState<any[]>([]);
  const [badgeName, setBadgeName] = useState('');
  const [badgeDesc, setBadgeDesc] = useState('');
  const [badgeIcon, setBadgeIcon] = useState('🏆');
  const [badgeColor, setBadgeColor] = useState('#5865F2');
  const [badgeRuleType, setBadgeRuleType] = useState<'manual' | 'listen_hours' | 'approved_lyrics' | 'playlists' | 'liked_songs'>('manual');
  const [badgeRuleValue, setBadgeRuleValue] = useState(5);
  const [badgeSaving, setBadgeSaving] = useState(false);

  const handleBadgeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 96;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        setBadgeIcon(canvas.toDataURL('image/png'));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const formatBadgeRule = (ruleType: string, ruleValue: number) => {
    if (ruleType === 'listen_hours') return `Auto: ≥ ${ruleValue} Jam Dengar`;
    if (ruleType === 'approved_lyrics') return `Auto: ≥ ${ruleValue} Lirik Terverifikasi`;
    if (ruleType === 'playlists') return `Auto: ≥ ${ruleValue} Playlist`;
    if (ruleType === 'liked_songs') return `Auto: ≥ ${ruleValue} Liked Songs`;
    return 'Manual (Diberikan Admin)';
  };

  const fetchBadges = async () => {
    try {
      const ipcFn = (window as any).electronAPI?.adminGetBadges;
      if (ipcFn) {
        const list = await ipcFn();
        if (Array.isArray(list)) {
          setBadges(list);
          return;
        }
      }
      if (adminId) {
        const res = await fetch(`${apiBaseUrl}/api/admin/badges?admin_id=${encodeURIComponent(adminId)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.badges)) setBadges(data.badges);
        }
      }
    } catch { }
  };

  const handleCreateBadge = async () => {
    if (!badgeName.trim()) {
      showToast('Nama badge wajib diisi', 'error');
      return;
    }
    setBadgeSaving(true);
    try {
      const payload = {
        name: badgeName.trim(),
        description: badgeDesc.trim(),
        icon: badgeIcon,
        color: badgeColor,
        ruleType: badgeRuleType,
        ruleValue: badgeRuleType === 'manual' ? 0 : Number(badgeRuleValue || 1),
      };
      let res: any = null;
      const ipcFn = (window as any).electronAPI?.adminCreateBadge;
      if (ipcFn) {
        res = await ipcFn(payload);
      } else if (adminId) {
        const httpRes = await fetch(`${apiBaseUrl}/api/admin/badges`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, admin_id: adminId }),
        });
        res = await httpRes.json().catch(() => ({}));
      }
      if (res?.success) {
        setBadgeName('');
        setBadgeDesc('');
        showToast('Badge berhasil dibuat!', 'success');
        await fetchBadges();
        if (selectedUserId) fetchUserDetail(selectedUserId);
      } else {
        showToast(res?.error || 'Gagal membuat badge', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal membuat badge', 'error');
    } finally {
      setBadgeSaving(false);
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    const ipcFn = (window as any).electronAPI?.adminDeleteBadge;
    let res: any = null;
    if (ipcFn) {
      res = await ipcFn(badgeId);
    } else if (adminId) {
      const httpRes = await fetch(`${apiBaseUrl}/api/admin/badges/${encodeURIComponent(badgeId)}?admin_id=${encodeURIComponent(adminId)}`, { method: 'DELETE' });
      res = await httpRes.json().catch(() => ({}));
    }
    if (res?.success) {
      showToast('Badge dihapus', 'user');
      await fetchBadges();
      if (selectedUserId) fetchUserDetail(selectedUserId);
    }
  };

  const handleToggleUserBadge = async (targetDiscordId: string, badgeId: string, grant: boolean) => {
    const ipcFn = (window as any).electronAPI?.adminToggleUserBadge;
    let res: any = null;
    if (ipcFn) {
      res = await ipcFn(targetDiscordId, badgeId, grant, adminId);
    } else if (adminId) {
      const httpRes = await fetch(`${apiBaseUrl}/api/admin/user/${encodeURIComponent(targetDiscordId)}/badge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, badge_id: badgeId, grant }),
      });
      res = await httpRes.json().catch(() => ({}));
    }
    if (res?.success) {
      showToast(grant ? 'Badge diberikan ke user!' : 'Badge dicabut dari user.', grant ? 'success' : 'user');
      await fetchUserDetail(targetDiscordId);
      await fetchBadges();
    } else {
      showToast(res?.error || 'Gagal memperbarui badge user', 'error');
    }
  };

  const selected = submissions.find((s) => s.id === selectedId) || null;
  const isMinimalist = theme === 'minimalist';
  const accentBtnText = isMinimalist ? 'var(--accent-text, #000)' : 'var(--accent-text, #fff)';

  const fetchPending = async () => {
    if (!adminId) return;
    setLoading(true);
    try {
      const ipcRes = await (window as any).electronAPI?.adminGetQaPending?.();
      if (ipcRes && Array.isArray(ipcRes.submissions)) {
        const list: QaSubmission[] = ipcRes.submissions;
        setSubmissions(list);
        onQaCountChange(list.length);
        if (list.length > 0 && (!selectedId || !list.some((s) => s.id === selectedId))) {
          setSelectedId(list[0].id);
        } else if (list.length === 0) {
          setSelectedId(null);
        }
        return;
      }

      const res = await fetch(`${apiBaseUrl}/api/lyrics/qa/pending?admin_id=${encodeURIComponent(adminId)}`);
      if (res.ok) {
        const data = await res.json();
        const list: QaSubmission[] = Array.isArray(data?.submissions) ? data.submissions : [];
        setSubmissions(list);
        onQaCountChange(list.length);
        if (list.length > 0 && (!selectedId || !list.some((s) => s.id === selectedId))) {
          setSelectedId(list[0].id);
        } else if (list.length === 0) {
          setSelectedId(null);
        }
      } else {
        showToast('Gagal memuat antrean QA', 'error');
      }
    } catch {
      showToast('Gagal terhubung ke server QA', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminOverview = async () => {
    if (!adminId) return;
    setOverviewLoading(true);
    try {
      const ipcRes = await (window as any).electronAPI?.adminGetOverview?.();
      if (ipcRes && Array.isArray(ipcRes.users)) {
        setSummary(ipcRes.summary || null);
        setAdminUsers(ipcRes.users);
        if (ipcRes.users.length > 0 && (!selectedUserId || !ipcRes.users.some((u: any) => u.discordId === selectedUserId))) {
          setSelectedUserId(ipcRes.users[0].discordId);
        }
        return;
      }

      const res = await fetch(`${apiBaseUrl}/api/admin/overview?admin_id=${encodeURIComponent(adminId)}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data?.summary || null);
        const list: AdminUserSummary[] = Array.isArray(data?.users) ? data.users : [];
        setAdminUsers(list);
        if (list.length > 0 && (!selectedUserId || !list.some((u) => u.discordId === selectedUserId))) {
          setSelectedUserId(list[0].discordId);
        }
      } else {
        showToast('Gagal memuat data Admin Overview', 'error');
      }
    } catch {
      showToast('Gagal terhubung ke server Admin', 'error');
    } finally {
      setOverviewLoading(false);
    }
  };

  const fetchUserDetail = async (targetId: string) => {
    if (!adminId || !targetId) return;
    setUserDetailLoading(true);
    try {
      const ipcDetail = await (window as any).electronAPI?.adminGetUser?.(targetId);
      if (ipcDetail) {
        setUserDetail(ipcDetail);
        setExpandedPlaylistId(null);
        return;
      }

      const res = await fetch(`${apiBaseUrl}/api/admin/user/${encodeURIComponent(targetId)}?admin_id=${encodeURIComponent(adminId)}`);
      if (res.ok) {
        const data = await res.json();
        setUserDetail(data);
        setExpandedPlaylistId(null);
      } else {
        showToast('Gagal memuat detail user', 'error');
      }
    } catch {
      showToast('Gagal mengambil detail user', 'error');
    } finally {
      setUserDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
    fetchAdminOverview();
    fetchBadges();
  }, [adminId]);

  useEffect(() => {
    if (adminTab === 'users' && selectedUserId) {
      fetchUserDetail(selectedUserId);
    }
  }, [adminTab, selectedUserId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [selectedId]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return adminUsers;
    return adminUsers.filter(
      (u) =>
        (u.username || '').toLowerCase().includes(q) ||
        (u.discordId || '').toLowerCase().includes(q)
    );
  }, [adminUsers, userSearch]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      pauseMainPlayer();
      audio.play().catch(() => {
        showToast('Audio preview tidak tersedia untuk lagu ini', 'error');
      });
    } else {
      audio.pause();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tVal = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = tVal;
    }
    setCurrentTime(tVal);
  };

  const handleJumpToLine = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    pauseMainPlayer();
    audio.currentTime = Math.max(0, time);
    setCurrentTime(Math.max(0, time));
    if (audio.paused) {
      audio.play().catch(() => { });
    }
  };

  const handleReview = async (submissionId: number, action: 'approve' | 'reject', note?: string) => {
    if (!adminId) return;
    setProcessingId(submissionId);
    try {
      let data: any = null;
      const ipcReview = (window as any).electronAPI?.adminReviewQa;
      if (ipcReview) {
        data = await ipcReview(submissionId, action, note);
      } else {
        const res = await fetch(`${apiBaseUrl}/api/lyrics/qa/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            admin_id: adminId,
            submission_id: submissionId,
            action,
            ...(note ? { note } : {}),
          }),
        });
        data = await res.json().catch(() => ({}));
      }
      if (data?.success) {
        if (selectedId === submissionId && audioRef.current) {
          audioRef.current.pause();
        }
        const nextList = submissions.filter((s) => s.id !== submissionId);
        setSubmissions(nextList);
        onQaCountChange(nextList.length);
        if (selectedId === submissionId) {
          setSelectedId(nextList[0]?.id ?? null);
        }
        showToast(
          action === 'approve'
            ? 'Lirik di-ACC dan dipublikasikan ke komunitas!'
            : 'Kontribusi lirik ditolak.',
          action === 'approve' ? 'success' : 'user'
        );
      } else {
        showToast(data?.error || 'Gagal memproses review QA', 'error');
      }
    } catch {
      showToast('Gagal menghubungi server QA', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const activeColor = isMinimalist ? '#111111' : '#FFFFFF';
  const inactiveColor = isMinimalist ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)';

  const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--global-radius, 12px)',
  };

  return (
    <div style={{ padding: '20px 24px 96px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)', boxSizing: 'border-box' }}>
      {/* Top Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
          {/* Mode Switcher */}
          <div
            style={{
              display: 'inline-flex',
              background: 'var(--bg-sidebar)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--global-radius, 10px)',
              padding: '3px',
              gap: '3px',
            }}
          >
            <button
              onClick={() => setAdminTab('qa')}
              style={{
                background: adminTab === 'qa' ? 'var(--accent-primary)' : 'transparent',
                color: adminTab === 'qa' ? accentBtnText : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'calc(var(--global-radius, 10px) - 2px)',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <ShieldCheck size={14} /> QA Lirik ({submissions.length})
            </button>
            <button
              onClick={() => setAdminTab('users')}
              style={{
                background: adminTab === 'users' ? 'var(--accent-primary)' : 'transparent',
                color: adminTab === 'users' ? accentBtnText : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'calc(var(--global-radius, 10px) - 2px)',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Users size={14} /> Monitor User ({adminUsers.length})
            </button>
            <button
              onClick={() => setAdminTab('badges')}
              style={{
                background: adminTab === 'badges' ? 'var(--accent-primary)' : 'transparent',
                color: adminTab === 'badges' ? accentBtnText : 'var(--text-secondary)',
                border: 'none',
                borderRadius: 'calc(var(--global-radius, 10px) - 2px)',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Award size={14} /> Badge Maker ({badges.length})
            </button>
          </div>

          <button
            onClick={() => {
              fetchPending();
              fetchAdminOverview();
              if (adminTab === 'users' && selectedUserId) fetchUserDetail(selectedUserId);
            }}
            disabled={loading || overviewLoading}
            style={{
              ...cardStyle,
              color: 'var(--text-primary)',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading || overviewLoading ? 'wait' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} className={loading || overviewLoading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {adminTab === 'qa' ? (
        <>
          {/* Inline Reject Note Bar */}
          {rejectTargetId !== null && (
            <div
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: 'var(--global-radius, 12px)',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444' }}>
                {t?.('qaRejectReason') || 'Alasan Penolakan:'}
              </span>
              <input
                type="text"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={t?.('qaRejectPlaceholder') || 'Contoh: Timing telat 0.5 detik di reff (opsional)'}
                autoFocus
                style={{
                  flex: 1,
                  minWidth: '220px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '7px 10px',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                disabled={processingId === rejectTargetId}
                onClick={() => {
                  const target = rejectTargetId;
                  const note = rejectNote.trim() || undefined;
                  setRejectTargetId(null);
                  setRejectNote('');
                  handleReview(target, 'reject', note);
                }}
                style={{
                  background: '#EF4444',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {t?.('qaConfirmReject') || 'Konfirmasi Tolak'}
              </button>
              <button
                onClick={() => {
                  setRejectTargetId(null);
                  setRejectNote('');
                }}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  borderRadius: '8px',
                  padding: '7px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
            </div>
          )}

          {/* QA Main Grid */}
          {loading && submissions.length === 0 ? (
            <div style={{ ...cardStyle, padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Memuat antrean review QA...
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ ...cardStyle, padding: '56px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <ShieldCheck size={36} style={{ opacity: 0.45, marginBottom: '10px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {t?.('qaQueueEmpty') || 'Antrean QA Kosong'}
              </div>
              <div style={{ fontSize: '13px' }}>
                {t?.('qaQueueEmptyDesc') || 'Belum ada kontribusi lirik word-synced baru yang menunggu ACC.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: '16px', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {submissions.map((sub) => {
                  const isSelected = sub.id === selectedId;
                  const busy = processingId === sub.id;
                  return (
                    <div
                      key={sub.id}
                      onClick={() => setSelectedId(sub.id)}
                      style={{
                        background: isSelected ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--global-radius, 12px)',
                        padding: '12px 14px',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s ease, background 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sub.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sub.artist}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>Oleh <strong style={{ color: 'var(--text-secondary)' }}>{sub.contributor_name}</strong> • {sub.lines?.length || 0} baris</span>
                        {sub.created_at && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} />
                            {new Date(sub.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedId(sub.id)}
                          style={{
                            flex: 1,
                            background: 'var(--bg-sidebar)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '8px',
                            padding: '6px 8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={13} /> Cek
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => handleReview(sub.id, 'approve')}
                          style={{
                            flex: 1,
                            background: '#10B981',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '6px 8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: busy ? 'wait' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            opacity: busy ? 0.6 : 1,
                          }}
                        >
                          <Check size={13} /> ACC
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => {
                            setRejectTargetId(sub.id);
                            setRejectNote('');
                          }}
                          title="Tolak kontribusi"
                          style={{
                            background: 'rgba(239, 68, 68, 0.14)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            color: '#EF4444',
                            borderRadius: '8px',
                            padding: '6px 9px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: busy ? 'wait' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: busy ? 0.6 : 1,
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selected && (
                <div
                  style={{
                    ...cardStyle,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    minHeight: '460px',
                    maxHeight: '72vh',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {selected.title}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {selected.artist} • Kontributor: <strong>{selected.contributor_name}</strong>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        disabled={processingId === selected.id}
                        onClick={() => handleReview(selected.id, 'approve')}
                        style={{
                          background: '#10B981',
                          border: 'none',
                          color: '#fff',
                          borderRadius: '9px',
                          padding: '8px 14px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Check size={15} /> {t?.('qaApprovePublish') || 'ACC & Publish'}
                      </button>
                      <button
                        disabled={processingId === selected.id}
                        onClick={() => {
                          setRejectTargetId(selected.id);
                          setRejectNote('');
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.14)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#EF4444',
                          borderRadius: '9px',
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <Trash2 size={15} /> {t?.('qaReject') || 'Tolak'}
                      </button>
                    </div>
                  </div>

                  {selected.video_id ? (
                    <div
                      style={{
                        background: 'var(--bg-sidebar)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <audio
                        ref={audioRef}
                        src={`${apiBaseUrl}/api/stream?id=${encodeURIComponent(selected.video_id)}&quality=high`}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                      />
                      <button
                        onClick={togglePlay}
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          border: 'none',
                          background: 'var(--accent-primary)',
                          color: accentBtnText,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title={isPlaying ? 'Pause' : 'Play Preview'}
                      >
                        {isPlaying ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: '2px' }} />}
                      </button>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', minWidth: '38px' }}>
                        {formatTime(currentTime)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={duration || 240}
                        step={0.05}
                        value={currentTime}
                        onChange={handleSeek}
                        style={{ flex: 1, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', minWidth: '38px', textAlign: 'right' }}>
                        {formatTime(duration)}
                      </span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', background: 'var(--bg-sidebar)', borderRadius: '8px' }}>
                      <Music2 size={14} /> Lagu ini tidak memiliki video_id untuk audio stream preview.
                    </div>
                  )}

                  <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '6px' }}>
                    {(selected.lines || []).map((line, idx) => {
                      const nextLine = selected.lines[idx + 1];
                      const endTime = nextLine ? nextLine.time : line.time + 5;
                      const isActive = currentTime >= line.time && currentTime < endTime;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleJumpToLine(line.time)}
                          style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '12px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: isActive ? 'var(--bg-card-hover)' : 'transparent',
                            cursor: selected.video_id ? 'pointer' : 'default',
                          }}
                        >
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: '42px' }}>
                            {formatTime(line.time)}
                          </span>
                          <div style={{ fontSize: '16px', fontWeight: 700, flex: 1 }}>
                            <KaraokeLine
                              text={line.text}
                              lineStartTime={line.time}
                              lineEndTime={endTime}
                              currentTime={currentTime}
                              isPlaying={isPlaying}
                              enhancedWords={line.words}
                              activeColor={activeColor}
                              inactiveColor={inactiveColor}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : adminTab === 'users' ? (
        /* MONITOR USER TAB */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Global Summary Cards */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '12px' }}>
              {[
                { label: 'Total User', value: summary.totalUsers, icon: <Users size={18} /> },
                { label: 'Total Jam Dengar', value: formatListenDuration(summary.totalListenSeconds), icon: <Headphones size={18} /> },
                { label: 'Total Playlist', value: summary.totalPlaylists, icon: <ListMusic size={18} /> },
                { label: 'Lirik Terverifikasi', value: summary.totalApprovedLyrics, icon: <FileText size={18} /> },
                { label: 'Antrean QA', value: summary.pendingQaCount, icon: <ShieldCheck size={18} /> },
              ].map((stat, i) => (
                <div key={i} style={{ ...cardStyle, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(var(--accent-primary-rgb, 88, 101, 242), 0.14)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>{stat.label}</div>
                    <div style={{ fontSize: '19px', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2-Column User List + Inspector */}
          <div style={{ display: 'grid', gridTemplateColumns: '290px minmax(0, 1fr)', gap: '16px', alignItems: 'stretch' }}>
            {/* Left: User List */}
            <div style={{ ...cardStyle, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', height: 'calc(100vh - 280px)', minHeight: '440px', boxSizing: 'border-box' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '9px',
                  padding: '7px 10px',
                }}
              >
                <Search size={14} color="var(--text-muted)" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Cari username / Discord ID..."
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '2px' }}>
                {overviewLoading && adminUsers.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Memuat daftar user...</div>
                ) : filteredUsers.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>User tidak ditemukan.</div>
                ) : (
                  filteredUsers.map((u) => {
                    const active = u.discordId === selectedUserId;
                    return (
                      <div
                        key={u.discordId}
                        onClick={() => setSelectedUserId(u.discordId)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: active ? 'var(--bg-card-hover)' : 'var(--bg-sidebar)',
                          border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                        }}
                      >
                        <img
                          src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}`}
                          alt={u.username}
                          style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.username}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {formatListenDuration(u.totalListenSeconds)} • {u.playlistCount} PL • {u.approvedLyricsCount} Lirik
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: User Detail Inspector */}
            <div style={{ ...cardStyle, padding: '16px 18px', height: 'calc(100vh - 280px)', minHeight: '440px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
              {userDetailLoading ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>Memuat detail user...</div>
              ) : !userDetail ? (
                <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Pilih user di sebelah kiri untuk memantau detail aktivitasnya.</div>
              ) : (
                <>
                  {/* User Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={userDetail.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userDetail.username || 'U')}`}
                        alt={userDetail.username}
                        style={{ width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-primary)' }}
                      />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{userDetail.username}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Discord ID: {userDetail.discordId}</div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                          <span><strong style={{ color: 'var(--accent-primary)' }}>{formatListenDuration(userDetail.stats?.totalListenSeconds || 0)}</strong> Listening</span>
                          <span><strong>{userDetail.followers?.length || 0}</strong> Followers</span>
                          <span><strong>{userDetail.following?.length || 0}</strong> Following</span>
                          <span><strong>{userDetail.savedPlaylists?.length || 0}</strong> Saved PL</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '999px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        Stats: {userDetail.privacySettings?.publicStats !== false ? 'Public' : 'Private'}
                      </span>
                      <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '999px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        Likes: {userDetail.privacySettings?.publicLikedSongs !== false ? 'Public' : 'Private'}
                      </span>
                    </div>
                  </div>

                  {/* Sub Tabs */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { id: 'history' as const, label: `History (${Array.isArray(userDetail.stats?.playHistory) ? userDetail.stats.playHistory.length : 0})`, icon: <Clock size={13} /> },
                      { id: 'playlists' as const, label: `Playlist (${userDetail.playlists?.length || 0})`, icon: <ListMusic size={13} /> },
                      { id: 'lyrics' as const, label: `Lirik (${(userDetail.approvedLyrics?.length || 0) + (userDetail.submissions?.length || 0)})`, icon: <FileText size={13} /> },
                      { id: 'likes' as const, label: `Liked (${userDetail.likedSongs?.length || 0})`, icon: <Heart size={13} /> },
                      { id: 'badges' as const, label: `Badges (${(userDetail.badgeStatuses || []).filter((b: any) => b.earned).length})`, icon: <Award size={13} /> },
                    ].map((tab) => {
                      const active = userSubTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setUserSubTab(tab.id)}
                          style={{
                            background: active ? 'var(--accent-primary)' : 'var(--bg-sidebar)',
                            color: active ? accentBtnText : 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          {tab.icon} {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Sub Tab Content */}
                  <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {userSubTab === 'history' && (
                      Array.isArray(userDetail.stats?.playHistory) && userDetail.stats.playHistory.length > 0 ? (
                        userDetail.stats.playHistory.slice(0, 60).map((song: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '9px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '22px' }}>#{i + 1}</span>
                            {song.thumbnail && <img src={song.thumbnail} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title || 'Unknown'}</div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist || '-'}</div>
                            </div>
                            {song.duration ? <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatTime(song.duration)}</span> : null}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Belum ada riwayat putar.</div>
                      )
                    )}

                    {userSubTab === 'playlists' && (
                      userDetail.playlists?.length > 0 ? (
                        userDetail.playlists.map((pl: any) => {
                          const isExpanded = expandedPlaylistId === pl.id;
                          return (
                            <div key={pl.id} style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
                              <div
                                onClick={() => setExpandedPlaylistId(isExpanded ? null : pl.id)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', cursor: 'pointer' }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                  {pl.avatar ? (
                                    <img src={pl.avatar} alt="" style={{ width: '38px', height: '38px', borderRadius: '7px', objectFit: 'cover' }} />
                                  ) : (
                                    <div style={{ width: '38px', height: '38px', borderRadius: '7px', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <ListMusic size={18} color="var(--text-muted)" />
                                    </div>
                                  )}
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</span>
                                      <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: pl.isPrivate ? 'rgba(245, 158, 11, 0.16)' : 'rgba(16, 185, 129, 0.16)', color: pl.isPrivate ? '#F59E0B' : '#10B981', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        {pl.isPrivate ? <Lock size={9} /> : <Globe size={9} />}
                                        {pl.isPrivate ? 'Private' : 'Public'}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{pl.songs?.length || 0} lagu</div>
                                  </div>
                                </div>
                                {isExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                              </div>

                              {isExpanded && (
                                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {pl.songs?.length > 0 ? pl.songs.map((s: any, idx: number) => (
                                    <div key={idx} style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{idx + 1}. {s.title} — {s.artist}</span>
                                      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{s.duration ? formatTime(s.duration) : ''}</span>
                                    </div>
                                  )) : (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Playlist kosong.</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>User belum memiliki playlist.</div>
                      )
                    )}

                    {userSubTab === 'lyrics' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          Lirik Word-Synced Aktif ({userDetail.approvedLyrics?.length || 0})
                        </div>
                        {userDetail.approvedLyrics?.length > 0 ? userDetail.approvedLyrics.map((ly: any) => (
                          <div key={`app-${ly.id}`} style={{ padding: '9px 12px', borderRadius: '9px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{ly.title}</div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{ly.artist}</div>
                            </div>
                            <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: 'rgba(16,185,129,0.16)', color: '#10B981' }}>Published</span>
                          </div>
                        )) : (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Belum ada lirik yang dipublish.</div>
                        )}

                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '6px' }}>
                          Riwayat Antrean QA ({userDetail.submissions?.length || 0})
                        </div>
                        {userDetail.submissions?.length > 0 ? userDetail.submissions.map((sub: any) => {
                          const c = sub.status === 'approved' ? '#10B981' : sub.status === 'rejected' ? '#EF4444' : '#F59E0B';
                          return (
                            <div key={`sub-${sub.id}`} style={{ padding: '9px 12px', borderRadius: '9px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                <div>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{sub.title}</div>
                                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{sub.artist}</div>
                                </div>
                                <span style={{ fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: `${c}22`, color: c }}>{sub.status}</span>
                              </div>
                              {sub.review_note && <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>Catatan QA: {sub.review_note}</div>}
                            </div>
                          );
                        }) : (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Belum ada riwayat submission QA.</div>
                        )}
                      </div>
                    )}

                    {userSubTab === 'likes' && (
                      userDetail.likedSongs?.length > 0 ? (
                        userDetail.likedSongs.slice(0, 60).map((song: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '9px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)' }}>
                            {song.thumbnail && <img src={song.thumbnail} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</div>
                            </div>
                            {song.duration ? <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatTime(song.duration)}</span> : null}
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Belum ada lagu yang disukai.</div>
                      )
                    )}

                    {userSubTab === 'badges' && (
                      (userDetail.badgeStatuses || []).length > 0 ? (
                        (userDetail.badgeStatuses || []).map((b: any) => (
                          <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-sidebar)', border: `1px solid ${b.earned ? b.color : 'var(--border-color)'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                              <span style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${b.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{renderBadgeIcon(b.icon, 22)}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span>{b.name}</span>
                                  {b.ruleMet && (
                                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: 'rgba(16,185,129,0.16)', color: '#10B981' }}>Auto Syarat Terpenuhi</span>
                                  )}
                                  {b.manualGranted && (
                                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '999px', background: `${b.color}28`, color: b.color }}>Diberikan Admin</span>
                                  )}
                                </div>
                                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                  {formatBadgeRule(b.ruleType, b.ruleValue)}{b.description ? ` • ${b.description}` : ''}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleToggleUserBadge(userDetail.discordId, b.id, !b.manualGranted)}
                              style={{
                                background: b.manualGranted ? 'rgba(239, 68, 68, 0.14)' : 'var(--accent-primary)',
                                color: b.manualGranted ? '#EF4444' : accentBtnText,
                                border: b.manualGranted ? '1px solid rgba(239, 68, 68, 0.35)' : 'none',
                                borderRadius: '8px',
                                padding: '6px 11px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              {b.manualGranted ? 'Cabut Manual' : 'Berikan Badge'}
                            </button>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Belum ada badge yang dibuat. Buat di tab Badge Maker!</div>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
          {/* Left: Badge Maker Form */}
          <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '11px', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Award size={17} color="var(--accent-primary)" /> Buat Badge Baru
            </div>

            {/* Live Preview */}
            <div style={{ padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Preview:</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 11px',
                  borderRadius: '999px',
                  background: `${badgeColor}22`,
                  border: `1px solid ${badgeColor}66`,
                  color: badgeColor,
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                {renderBadgeIcon(badgeIcon, 16)}
                <span>{badgeName.trim() || 'Nama Badge'}</span>
              </span>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Nama Badge</label>
              <input
                type="text"
                value={badgeName}
                onChange={(e) => setBadgeName(e.target.value)}
                placeholder="Contoh: Lyric Master"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Deskripsi / Keterangan</label>
              <input
                type="text"
                value={badgeDesc}
                onChange={(e) => setBadgeDesc(e.target.value)}
                placeholder="Contoh: Kontributor aktif lirik word-synced"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Logo Badge (Upload Gambar / Emoji)</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '7px' }}>
                <label
                  style={{
                    flex: 1,
                    background: 'var(--bg-sidebar)',
                    border: '1px dashed var(--border-color)',
                    borderRadius: '8px',
                    padding: '7px 10px',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Upload size={14} /> Upload Gambar (PNG/JPG/SVG)
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBadgeImageUpload} />
                </label>
                {isImageBadgeIcon(badgeIcon) && (
                  <img src={badgeIcon} alt="Badge logo" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-color)' }} />
                )}
              </div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {['🏆', '🎤', '🎧', '⭐', '🔥', '💎', '👑', '🎵'].map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setBadgeIcon(ic)}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '7px',
                      background: badgeIcon === ic ? 'var(--accent-primary)' : 'var(--bg-sidebar)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '5px' }}>Warna Badge</label>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {['#5865F2', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#06B6D4'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setBadgeColor(c)}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: c,
                      border: badgeColor === c ? '2px solid #fff' : '2px solid transparent',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Indikasi / Syarat Dapat Badge</label>
              <select
                value={badgeRuleType}
                onChange={(e) => setBadgeRuleType(e.target.value as any)}
                style={{ width: '100%', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              >
                <option value="manual">Manual (Hanya Diberikan Admin)</option>
                <option value="listen_hours">Otomatis: Jam Dengar ≥ Target (Jam)</option>
                <option value="approved_lyrics">Otomatis: Lirik Terverifikasi ≥ Target</option>
                <option value="playlists">Otomatis: Jumlah Playlist ≥ Target</option>
                <option value="liked_songs">Otomatis: Liked Songs ≥ Target</option>
              </select>
            </div>

            {badgeRuleType !== 'manual' && (
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Target Minimal</label>
                <input
                  type="number"
                  min={1}
                  value={badgeRuleValue}
                  onChange={(e) => setBadgeRuleValue(Math.max(1, Number(e.target.value || 1)))}
                  style={{ width: '100%', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
              </div>
            )}

            <button
              onClick={handleCreateBadge}
              disabled={badgeSaving}
              style={{
                background: 'var(--accent-primary)',
                color: accentBtnText,
                border: 'none',
                borderRadius: '9px',
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: badgeSaving ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Plus size={15} /> {badgeSaving ? 'Menyimpan...' : 'Simpan Badge'}
            </button>
          </div>

          {/* Right: Existing Badges List */}
          <div style={{ ...cardStyle, padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Daftar Badge ({badges.length})
            </div>
            {badges.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Belum ada badge. Buat badge pertamamu di sebelah kiri!
              </div>
            ) : (
              badges.map((b) => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '10px', background: 'var(--bg-sidebar)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <span style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${b.color}22`, border: `1px solid ${b.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {renderBadgeIcon(b.icon, 26)}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {formatBadgeRule(b.ruleType, b.ruleValue)}
                        {b.manualGrants > 0 ? ` • ${b.manualGrants} grant manual` : ''}
                      </div>
                      {b.description && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{b.description}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteBadge(b.id)}
                    title="Hapus badge"
                    style={{ background: 'rgba(239, 68, 68, 0.14)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#EF4444', borderRadius: '8px', padding: '7px 9px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
