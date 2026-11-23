import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  UploadCloud,
  Undo2,
  SkipBack,
  SkipForward,
  CheckCircle2,
  FileText,
  Mic,
  Eye,
  Repeat,
  Volume2,
  Rewind,
  FastForward,
  ShieldCheck,
  Check,
  Trash2,
  Clock,
  Plus,
  Upload,
} from 'lucide-react';
import { injectInstrumentalCues, parseEnhancedLrcLine, type LyricWord } from '../utils/karaokeLyrics';
import { KaraokeLine } from './KaraokeLine';

export interface EditableLyricLine {
  time: number;
  text: string;
  isInstrumental?: boolean;
  words?: LyricWord[];
}

interface WordLyricsEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSong: any;
  audioSrc: string;
  pauseMainPlayer: () => void;
  lyricsData: EditableLyricLine[] | null;
  plainLyrics: string;
  apiBaseUrl: string;
  contributorId?: string;
  contributorName?: string;
  isQaAdmin?: boolean;
  onQaCountChange?: (newCount: number) => void;
  onPublished: (lines: EditableLyricLine[]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'music') => void;
}

const formatStudioTime = (sec: number) => {
  if (!isFinite(sec) || sec < 0) return '0:00.0';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const tenth = Math.floor((sec % 1) * 10);
  return `${m}:${String(s).padStart(2, '0')}.${tenth}`;
};

export const WordLyricsEditorModal: React.FC<WordLyricsEditorModalProps> = ({
  isOpen,
  onClose,
  currentSong,
  audioSrc,
  pauseMainPlayer,
  lyricsData,
  plainLyrics,
  apiBaseUrl,
  contributorId,
  contributorName,
  isQaAdmin = false,
  onQaCountChange,
  onPublished,
  showToast,
}) => {
  const studioAudioRef = useRef<HTMLAudioElement | null>(null);
  const [mode, setMode] = useState<'sync' | 'preview' | 'text' | 'mine' | 'qa'>('sync');
  const [qaSubmissions, setQaSubmissions] = useState<any[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [mySubmissionsLoading, setMySubmissionsLoading] = useState(false);
  const [hasDraftBanner, setHasDraftBanner] = useState(false);
  const [qaPreviewSong, setQaPreviewSong] = useState<{ title: string; artist: string } | null>(null);
  const [rawText, setRawText] = useState('');
  const [lines, setLines] = useState<EditableLyricLine[]>([]);
  const [cursorLine, setCursorLine] = useState(0);
  const [cursorWord, setCursorWord] = useState(0);
  const [isHoldingWord, setIsHoldingWord] = useState(false);

  // Dedicated Studio Audio State
  const [studioPlaying, setStudioPlaying] = useState(false);
  const [studioTime, setStudioTime] = useState(0);
  const [studioDuration, setStudioDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(0.85);
  const [loopLine, setLoopLine] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const holdingRef = useRef<{ line: number; word: number; startTime: number } | null>(null);
  const initialSnapshotRef = useRef<string>('');

  // Pause main app player when Studio opens; reset on close
  useEffect(() => {
    if (!isOpen) {
      if (studioAudioRef.current) {
        studioAudioRef.current.pause();
      }
      setStudioPlaying(false);
      holdingRef.current = null;
      setIsHoldingWord(false);
      return;
    }

    pauseMainPlayer();

    let initialLines: EditableLyricLine[] = [];
    if (lyricsData && lyricsData.length > 0) {
      initialLines = lyricsData
        .filter((l) => !l.isInstrumental && l.text.trim())
        .map((l) => {
          const tokens = l.text.trim().split(/\s+/).filter(Boolean);
          const words: LyricWord[] = tokens.map((tok, idx) => ({
            text: tok,
            startTime: l.words?.[idx]?.startTime,
            endTime: l.words?.[idx]?.endTime,
            weight: Math.max(1, tok.length),
          }));
          return { time: l.time, text: l.text.trim(), words };
        });
    } else if (plainLyrics && plainLyrics !== 'Lyrics not found.') {
      initialLines = plainLyrics
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((text, idx) => ({
          time: idx * 3,
          text,
          words: text.split(/\s+/).filter(Boolean).map((tok) => ({
            text: tok,
            weight: Math.max(1, tok.length),
          })),
        }));
    }

    const serverSnapshot = JSON.stringify(initialLines);
    const songDraftKey = currentSong
      ? `donpollo_wle_draft_${(currentSong.title || '').toLowerCase()}::${(currentSong.artist || '').toLowerCase()}`
      : '';
    let restoredDraft = false;
    if (songDraftKey) {
      try {
        const rawDraft = localStorage.getItem(songDraftKey);
        if (rawDraft) {
          const parsedDraft = JSON.parse(rawDraft);
          if (Array.isArray(parsedDraft) && parsedDraft.length > 0 && rawDraft !== serverSnapshot) {
            initialLines = parsedDraft;
            restoredDraft = true;
          }
        }
      } catch {}
    }

    initialSnapshotRef.current = serverSnapshot;
    setHasDraftBanner(restoredDraft);
    setLines(initialLines);
    setRawText(initialLines.map((l) => l.text).join('\n'));
    setCursorLine(0);
    setCursorWord(0);
    setStudioTime(0);
    setLoopLine(false);
    setSpeed(1.0);
    setMode(initialLines.length > 0 ? 'sync' : 'text');
  }, [isOpen, currentSong?.id]);

  // Auto-save draft only when user actually modified lines
  useEffect(() => {
    if (!isOpen || !currentSong || lines.length === 0) return;
    const serialized = JSON.stringify(lines);
    if (serialized === initialSnapshotRef.current) return;
    const songDraftKey = `donpollo_wle_draft_${(currentSong.title || '').toLowerCase()}::${(currentSong.artist || '').toLowerCase()}`;
    try {
      localStorage.setItem(songDraftKey, serialized);
    } catch {}
  }, [isOpen, lines, currentSong?.title, currentSong?.artist]);

  // Setup dedicated Studio <audio> source, volume & speed
  useEffect(() => {
    const audio = studioAudioRef.current;
    if (!isOpen || !audio) return;
    const resolvedSrc =
      audioSrc ||
      (currentSong?.id ? `${apiBaseUrl}/api/stream?id=${encodeURIComponent(currentSong.id)}&quality=high` : '');
    if (resolvedSrc && audio.src !== resolvedSrc) {
      audio.src = resolvedSrc;
      audio.load();
    }
    audio.volume = volume;
    audio.playbackRate = speed;
  }, [isOpen, audioSrc, currentSong?.id, apiBaseUrl]);

  useEffect(() => {
    if (studioAudioRef.current) studioAudioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (studioAudioRef.current) studioAudioRef.current.playbackRate = speed;
  }, [speed]);

  // 60fps loop for Studio timeline + Line-Loop feature
  useEffect(() => {
    if (!isOpen) return;
    let raf = 0;
    const tick = () => {
      const audio = studioAudioRef.current;
      if (audio) {
        const t = audio.currentTime || 0;
        setStudioTime(t);
        if (audio.duration && isFinite(audio.duration)) {
          setStudioDuration(audio.duration);
        }
        // Optional Line Loop for precision timing
        if (loopLine && mode === 'sync' && lines[cursorLine]) {
          const lineStart = Math.max(0, (lines[cursorLine].time || 0) - 0.5);
          const nextStart = lines[cursorLine + 1]?.time ?? (lineStart + 5);
          if (t >= nextStart + 0.4) {
            audio.currentTime = lineStart;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isOpen, loopLine, mode, cursorLine, lines]);

  const toggleStudioPlay = () => {
    const audio = studioAudioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setStudioPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setStudioPlaying(false);
    }
  };

  const seekStudio = (sec: number) => {
    const audio = studioAudioRef.current;
    if (!audio) return;
    const maxD = studioDuration || audio.duration || 9999;
    const clamped = Math.max(0, Math.min(maxD, sec));
    audio.currentTime = clamped;
    setStudioTime(clamped);
  };

  const getStudioTimeNow = () => studioAudioRef.current?.currentTime ?? studioTime;

  const applyRawTextToLines = () => {
    const splitLines = rawText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const next: EditableLyricLine[] = splitLines.map((text, idx) => ({
      time: lines[idx]?.time ?? idx * 3,
      text,
      words: text.split(/\s+/).filter(Boolean).map((tok) => ({
        text: tok,
        weight: Math.max(1, tok.length),
      })),
    }));
    setLines(next);
    setCursorLine(0);
    setCursorWord(0);
    setMode('sync');
  };

  // Hold-to-Sing: Press Space / MouseDown starts the word; Release sets exact endTime & advances
  const startHoldWord = () => {
    if (cursorLine >= lines.length || holdingRef.current) return;
    const startT = Math.max(0, Number(getStudioTimeNow().toFixed(3)));
    holdingRef.current = { line: cursorLine, word: cursorWord, startTime: startT };
    setIsHoldingWord(true);

    setLines((prev) => {
      const updated = prev.map((l) => ({
        ...l,
        words: l.words ? l.words.map((w) => ({ ...w })) : [],
      }));
      const curLine = updated[cursorLine];
      if (!curLine) return prev;
      if (cursorWord === 0) curLine.time = startT;
      const w = curLine.words?.[cursorWord];
      if (w) {
        w.startTime = startT;
        w.endTime = undefined;
      }
      return updated;
    });
  };

  const endHoldWord = () => {
    const held = holdingRef.current;
    if (!held) return;
    holdingRef.current = null;
    setIsHoldingWord(false);

    const endT = Math.max(held.startTime + 0.08, Number(getStudioTimeNow().toFixed(3)));
    setLines((prev) => {
      const updated = prev.map((l) => ({
        ...l,
        words: l.words ? l.words.map((w) => ({ ...w })) : [],
      }));
      const w = updated[held.line]?.words?.[held.word];
      if (w) {
        w.endTime = endT;
      }
      return updated;
    });

    const lineWords = lines[held.line]?.words || [];
    if (held.word + 1 < lineWords.length) {
      setCursorLine(held.line);
      setCursorWord(held.word + 1);
    } else {
      setCursorLine(held.line + 1);
      setCursorWord(0);
    }
  };

  const handleUndoWord = () => {
    if (holdingRef.current) {
      holdingRef.current = null;
      setIsHoldingWord(false);
    }
    let targetLine = cursorLine;
    let targetWord = cursorWord - 1;
    if (targetWord < 0) {
      if (targetLine === 0) return;
      targetLine -= 1;
      targetWord = Math.max(0, (lines[targetLine]?.words?.length || 1) - 1);
    }
    setLines((prev) => {
      const updated = prev.map((l) => ({
        ...l,
        words: l.words ? l.words.map((w) => ({ ...w })) : [],
      }));
      const w = updated[targetLine]?.words?.[targetWord];
      if (w) {
        w.startTime = undefined;
        w.endTime = undefined;
      }
      return updated;
    });
    setCursorLine(targetLine);
    setCursorWord(targetWord);
    const jumpTo = lines[targetLine]?.words?.[targetWord]?.startTime ?? lines[targetLine]?.time;
    if (typeof jumpTo === 'number' && jumpTo > 0) {
      seekStudio(Math.max(0, jumpTo - 1.2));
    }
  };

  // Keyboard bindings for Studio (Space = Hold Word, Backspace = Undo, Left/Right = Seek -/+2s)
  useEffect(() => {
    if (!isOpen || mode !== 'sync') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement instanceof HTMLButtonElement) {
          document.activeElement.blur();
        }
        if (!e.repeat) startHoldWord();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        handleUndoWord();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        seekStudio(getStudioTimeNow() - 2);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        seekStudio(getStudioTimeNow() + 2);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        endHoldWord();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [isOpen, mode, cursorLine, cursorWord, lines, studioDuration]);

  const syncedCount = useMemo(
    () => lines.filter((l) => l.words && l.words.every((w) => typeof w.startTime === 'number')).length,
    [lines]
  );

  const previewLines = useMemo(() => {
    const withTiming = lines.map((l, idx) => ({
      ...l,
      time: l.words?.[0]?.startTime ?? l.time ?? idx * 3,
    }));
    return injectInstrumentalCues(withTiming);
  }, [lines]);

  const previewLineIdx = useMemo(() => {
    if (previewLines.length === 0) return -1;
    return previewLines.findIndex((l, idx) => {
      const nextT = idx + 1 < previewLines.length ? previewLines[idx + 1].time : l.time + 6;
      return studioTime >= l.time && studioTime < nextT;
    });
  }, [previewLines, studioTime]);

  const handlePublish = async () => {
    if (!currentSong) return;
    const finalLines = injectInstrumentalCues(
      lines.map((l, idx) => {
        const words = (l.words || []).map((w, wIdx, arr) => {
          const start = typeof w.startTime === 'number' ? w.startTime : l.time;
          const fallbackEnd =
            wIdx + 1 < arr.length && typeof arr[wIdx + 1].startTime === 'number'
              ? arr[wIdx + 1].startTime!
              : start + Math.max(0.35, w.weight * 0.12);
          return {
            ...w,
            startTime: start,
            endTime: typeof w.endTime === 'number' && w.endTime > start ? w.endTime : fallbackEnd,
          };
        });
        return {
          time: words[0]?.startTime ?? l.time ?? idx * 3,
          text: l.text,
          words,
        };
      })
    );

    if (finalLines.length === 0) {
      showToast('Lirik masih kosong!', 'error');
      return;
    }

    setIsPublishing(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/lyrics/community`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: currentSong.id || '',
          title: currentSong.title,
          artist: currentSong.artist,
          lines: finalLines,
          contributor_id: contributorId || null,
          contributor_name: contributorName || 'Community',
        }),
      });
      const data = await res.json();
      if (data?.success) {
        try {
          const songDraftKey = `donpollo_wle_draft_${(currentSong.title || '').toLowerCase()}::${(currentSong.artist || '').toLowerCase()}`;
          localStorage.removeItem(songDraftKey);
        } catch {}
        if (data.status === 'approved') {
          onPublished(finalLines);
          showToast('Lirik word-by-word langsung dipublish (ACC)!', 'success');
        } else {
          showToast('Terkirim ke antrean QA! Menunggu ACC developer.', 'success');
        }
        onClose();
      } else {
        showToast(data?.error || 'Gagal menyimpan lirik', 'error');
      }
    } catch (e: any) {
      showToast(e?.message || 'Gagal terhubung ke server', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const fetchMySubmissions = async () => {
    if (!contributorId) return;
    setMySubmissionsLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/lyrics/submissions?contributor_id=${encodeURIComponent(contributorId)}`);
      if (res.ok) {
        const data = await res.json();
        setMySubmissions(Array.isArray(data?.submissions) ? data.submissions : []);
      }
    } catch {
      // ignore
    } finally {
      setMySubmissionsLoading(false);
    }
  };

  const nudgeActiveLine = (deltaSec: number) => {
    setLines((prev) =>
      prev.map((line, lIdx) => {
        if (lIdx !== cursorLine) return line;
        const shiftedTime = Math.max(0, Number((line.time + deltaSec).toFixed(3)));
        const shiftedWords = (line.words || []).map((w) => ({
          ...w,
          startTime: typeof w.startTime === 'number' ? Math.max(0, Number((w.startTime + deltaSec).toFixed(3))) : w.startTime,
          endTime: typeof w.endTime === 'number' ? Math.max(0, Number((w.endTime + deltaSec).toFixed(3))) : w.endTime,
        }));
        return { ...line, time: shiftedTime, words: shiftedWords };
      })
    );
    showToast(`Timing baris digeser ${deltaSec > 0 ? '+' : ''}${Math.round(deltaSec * 1000)}ms`, 'music');
  };

  const insertInstrumentalAfterCursor = () => {
    const cueTime = Math.max(0, Number(studioTime.toFixed(3)));
    const newCue: EditableLyricLine = {
      time: cueTime,
      text: '• • •',
      isInstrumental: true,
      words: [],
    };
    setLines((prev) => {
      const next = [...prev];
      const insertAt = Math.min(next.length, cursorLine + 1);
      next.splice(insertAt, 0, newCue);
      return next;
    });
    showToast('Cue instrumental (• • •) ditambahkan', 'success');
  };

  const handleImportLrcFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const rawLines = content.split(/\r?\n/);
      const parsed: EditableLyricLine[] = [];
      const lineTagRe = /^\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\](.*)$/;

      for (const raw of rawLines) {
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const m = trimmed.match(lineTagRe);
        if (m) {
          const min = parseInt(m[1], 10);
          const sec = parseInt(m[2], 10);
          const msRaw = m[3] || '0';
          const frac = parseInt(msRaw, 10) / Math.pow(10, msRaw.length);
          const lineTime = min * 60 + sec + frac;
          const body = (m[4] || '').trim();
          if (!body) continue;
          const enh = parseEnhancedLrcLine(body);
          const cleanText = enh.cleanText.trim();
          if (!cleanText) continue;
          const words: LyricWord[] =
            enh.words && enh.words.length > 0
              ? enh.words
              : cleanText.split(/\s+/).filter(Boolean).map((tok) => ({
                  text: tok,
                  weight: Math.max(1, tok.length),
                }));
          parsed.push({ time: lineTime, text: cleanText, words });
        }
      }

      if (parsed.length > 0) {
        parsed.sort((a, b) => a.time - b.time);
        setLines(parsed);
        setRawText(parsed.map((l) => l.text).join('\n'));
        setCursorLine(0);
        setCursorWord(0);
        const allWordsTimed = parsed.every(
          (l) => l.words && l.words.length > 0 && l.words.every((w) => typeof w.startTime === 'number')
        );
        setMode(allWordsTimed ? 'preview' : 'sync');
        showToast(`Berhasil mengimpor ${parsed.length} baris dari ${file.name}!`, 'success');
      } else {
        // Plain .txt fallback (no [mm:ss] tags)
        const plain = rawLines
          .map((l) => l.replace(/^\[[a-zA-Z]+:.*\]$/, '').trim())
          .filter(Boolean);
        if (plain.length === 0) {
          showToast('File lirik kosong atau format tidak dikenali', 'error');
          return;
        }
        setRawText(plain.join('\n'));
        showToast(`Teks dari ${file.name} dimuat (${plain.length} baris). Klik Terapkan & Mulai Sync.`, 'music');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const fetchQaPending = async () => {
    if (!isQaAdmin || !contributorId) return;
    setQaLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/lyrics/qa/pending?admin_id=${encodeURIComponent(contributorId)}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data?.submissions) ? data.submissions : [];
        setQaSubmissions(list);
        onQaCountChange?.(list.length);
      }
    } catch {
      // ignore
    } finally {
      setQaLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isQaAdmin) {
      fetchQaPending();
    }
  }, [isOpen, isQaAdmin]);

  const handleQaReview = async (submissionId: number, action: 'approve' | 'reject') => {
    if (!contributorId) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/lyrics/qa/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: contributorId,
          submission_id: submissionId,
          action,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        const nextList = qaSubmissions.filter((s) => s.id !== submissionId);
        setQaSubmissions(nextList);
        onQaCountChange?.(nextList.length);
        showToast(action === 'approve' ? 'Kontribusi di-ACC & live!' : 'Kontribusi ditolak.', 'success');
      } else {
        showToast(data?.error || 'Gagal memproses QA', 'error');
      }
    } catch {
      showToast('Gagal terhubung ke server', 'error');
    }
  };

  const handleLoadQaIntoPreview = (sub: any) => {
    setLines(Array.isArray(sub.lines) ? sub.lines : []);
    setQaPreviewSong({ title: sub.title, artist: sub.artist });
    if (sub.video_id && studioAudioRef.current) {
      const streamUrl = `${apiBaseUrl}/api/stream?id=${encodeURIComponent(sub.video_id)}&quality=high`;
      if (studioAudioRef.current.src !== streamUrl) {
        studioAudioRef.current.src = streamUrl;
        studioAudioRef.current.load();
      }
      studioAudioRef.current.currentTime = 0;
      studioAudioRef.current.play().then(() => setStudioPlaying(true)).catch(() => {});
    }
    setMode('preview');
  };

  if (!isOpen || !currentSong) return null;

  const prevLine = cursorLine > 0 ? lines[cursorLine - 1] : null;
  const activeLine = lines[cursorLine] || null;
  const nextLine = cursorLine + 1 < lines.length ? lines[cursorLine + 1] : null;
  const effectiveDuration = studioDuration || currentSong.duration || 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.72)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      {/* Dedicated Studio Audio Element (isolated from main app queue) */}
      <audio
        ref={studioAudioRef}
        onEnded={() => setStudioPlaying(false)}
        onLoadedMetadata={() => {
          if (studioAudioRef.current?.duration && isFinite(studioAudioRef.current.duration)) {
            setStudioDuration(studioAudioRef.current.duration);
          }
        }}
      />

      <div
        style={{
          width: 'min(860px, 95vw)',
          maxHeight: '92vh',
          background: 'var(--bg-sidebar, #1E1F22)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.55)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px 12px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-card, #141519)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Word-Synced Lyrics Studio
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(qaPreviewSong?.title || currentSong.title)} • {(qaPreviewSong?.artist || currentSong.artist)} ({syncedCount}/{lines.length} baris selesai)
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
              title="Tutup"
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'sync' as const, label: 'Tap & Hold', icon: <Mic size={13} /> },
              { id: 'preview' as const, label: 'Preview', icon: <Eye size={13} /> },
              { id: 'text' as const, label: 'Edit Teks', icon: <FileText size={13} /> },
              ...(contributorId
                ? [{ id: 'mine' as const, label: 'Status Saya', icon: <Clock size={13} /> }]
                : []),
              ...(isQaAdmin
                ? [{ id: 'qa' as const, label: `QA (${qaSubmissions.length})`, icon: <ShieldCheck size={13} /> }]
                : []),
            ].map((tab) => {
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setMode(tab.id);
                    if (tab.id === 'mine') fetchMySubmissions();
                  }}
                  style={{
                    background: active ? 'var(--accent-primary)' : 'var(--bg-sidebar, #1E1F22)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dedicated Full Studio Audio Deck */}
        {mode !== 'text' && mode !== 'qa' && (
          <div
            style={{
              padding: '12px 20px',
              background: 'var(--bg-card, #141519)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {/* Timeline Scrub Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', minWidth: '48px' }}>
                {formatStudioTime(studioTime)}
              </span>
              <input
                type="range"
                min={0}
                max={effectiveDuration}
                step={0.05}
                value={Math.min(studioTime, effectiveDuration)}
                onChange={(e) => seekStudio(parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: '48px', textAlign: 'right' }}>
                {formatStudioTime(effectiveDuration)}
              </span>
            </div>

            {/* Transport, Fine-Seek (-10s/-3s/-1s / +1s/+3s/+10s), Loop, Speed & Volume */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => seekStudio(0)}
                  title="Mulai dari awal (0:00)"
                  style={{ background: 'var(--bg-sidebar, #1E1F22)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                >
                  0:00
                </button>
                <button
                  onClick={() => seekStudio(studioTime - 10)}
                  style={{ background: 'var(--bg-sidebar, #1E1F22)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}
                >
                  <Rewind size={12} /> 10s
                </button>
                <button
                  onClick={() => seekStudio(studioTime - 3)}
                  style={{ background: 'var(--bg-sidebar, #1E1F22)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}
                >
                  <SkipBack size={12} /> 3s
                </button>
                <button
                  onClick={() => seekStudio(studioTime - 1)}
                  style={{ background: 'var(--bg-sidebar, #1E1F22)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', fontSize: '11px' }}
                >
                  -1s
                </button>
                <button
                  onClick={toggleStudioPlay}
                  style={{ background: 'var(--accent-primary)', border: 'none', color: '#fff', borderRadius: '999px', width: '36px', height: '36px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 4px' }}
                >
                  {studioPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
                </button>
                <button
                  onClick={() => seekStudio(studioTime + 1)}
                  style={{ background: 'var(--bg-sidebar, #1E1F22)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', fontSize: '11px' }}
                >
                  +1s
                </button>
                <button
                  onClick={() => seekStudio(studioTime + 3)}
                  style={{ background: 'var(--bg-sidebar, #1E1F22)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}
                >
                  3s <SkipForward size={12} />
                </button>
                <button
                  onClick={() => seekStudio(studioTime + 10)}
                  style={{ background: 'var(--bg-sidebar, #1E1F22)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '5px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}
                >
                  10s <FastForward size={12} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setLoopLine((v) => !v)}
                  title="Ulangi baris aktif terus-menerus"
                  style={{
                    background: loopLine ? 'var(--accent-primary)' : 'var(--bg-sidebar, #1E1F22)',
                    color: loopLine ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '5px 9px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Repeat size={12} /> Loop Baris
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {[0.5, 0.75, 1.0, 1.25].map((r) => (
                    <button
                      key={r}
                      onClick={() => setSpeed(r)}
                      style={{
                        background: speed === r ? 'var(--accent-primary)' : 'var(--bg-sidebar, #1E1F22)',
                        color: speed === r ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '7px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {r}x
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Volume2 size={14} color="var(--text-secondary)" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    style={{ width: '64px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === 'qa' ? (
          <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-card, #141519)' }}>
            {qaLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Memuat antrean QA...</div>
            ) : qaSubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>Tidak ada kontribusi lirik yang menunggu ACC.</div>
            ) : (
              qaSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    background: 'var(--bg-sidebar, #1E1F22)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.title} — {sub.artist}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Oleh <strong>{sub.contributor_name}</strong> • {Array.isArray(sub.lines) ? sub.lines.length : 0} baris
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => handleLoadQaIntoPreview(sub)}
                      style={{ background: 'var(--bg-card, #141519)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Eye size={13} /> Cek
                    </button>
                    <button
                      onClick={() => handleQaReview(sub.id, 'approve')}
                      style={{ background: '#10B981', border: 'none', color: '#fff', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Check size={13} /> ACC
                    </button>
                    <button
                      onClick={() => handleQaReview(sub.id, 'reject')}
                      style={{ background: 'rgba(239, 68, 68, 0.16)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#EF4444', borderRadius: '8px', padding: '6px 9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                      title="Tolak"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : mode === 'mine' ? (
          <div style={{ padding: '18px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg-card, #141519)' }}>
            {mySubmissionsLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Memuat status kontribusi...</div>
            ) : mySubmissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>Kamu belum pernah mengirim kontribusi lirik ke antrean QA.</div>
            ) : (
              mySubmissions.map((sub) => {
                const badgeColor =
                  sub.status === 'approved' ? '#10B981' : sub.status === 'rejected' ? '#EF4444' : '#F59E0B';
                const statusLabel =
                  sub.status === 'approved' ? 'Di-ACC' : sub.status === 'rejected' ? 'Ditolak' : 'Menunggu QA';
                return (
                  <div
                    key={sub.id}
                    style={{
                      background: 'var(--bg-sidebar, #1E1F22)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {sub.title} — {sub.artist}
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: `${badgeColor}22`, color: badgeColor }}>
                        {statusLabel}
                      </span>
                    </div>
                    {sub.review_note && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-card, #141519)', padding: '6px 10px', borderRadius: '8px' }}>
                        Catatan QA: <strong>{sub.review_note}</strong>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : mode === 'text' ? (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Tempel atau rapikan teks lirik per baris di bawah ini, lalu klik <strong>Terapkan & Mulai Sync</strong>.
            </div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste lirik baris per baris di sini..."
              style={{
                flex: 1,
                minHeight: '300px',
                background: 'var(--bg-card, #141519)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '14px',
                lineHeight: 1.6,
                resize: 'none',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <label
                style={{
                  background: 'var(--bg-card, #141519)',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  padding: '9px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Upload size={14} /> Import File (.lrc / .txt)
                <input type="file" accept=".lrc,.txt,text/plain" style={{ display: 'none' }} onChange={handleImportLrcFile} />
              </label>
              <button
                onClick={applyRawTextToLines}
                style={{
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Terapkan & Mulai Sync
              </button>
            </div>
          </div>
        ) : mode === 'preview' ? (
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1, minHeight: '220px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-card, #141519)' }}>
            {previewLines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Belum ada lirik untuk dipreview. Import file <strong>.lrc</strong> atau tulis lirik di tab <strong>Edit Teks</strong>.
              </div>
            ) : previewLines.map((l, idx) => {
              const nextT = idx + 1 < previewLines.length ? previewLines[idx + 1].time : l.time + 6;
              const isAct = idx === previewLineIdx;
              if (l.isInstrumental) {
                const timeLeft = nextT - studioTime;
                return (
                  <div
                    key={idx}
                    onClick={() => seekStudio(l.time)}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '20px',
                      fontWeight: 800,
                      opacity: isAct ? 1 : 0.35,
                    }}
                  >
                    <span style={{ color: isAct && timeLeft <= 3 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>•</span>
                    <span style={{ color: isAct && timeLeft <= 2 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>•</span>
                    <span style={{ color: isAct && timeLeft <= 1 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>•</span>
                  </div>
                );
              }
              return (
                <div
                  key={idx}
                  onClick={() => seekStudio(l.time)}
                  style={{
                    fontSize: isAct ? '22px' : '16px',
                    fontWeight: isAct ? 800 : 600,
                    color: isAct ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    transition: 'all 0.15s',
                  }}
                >
                  {isAct ? (
                    <KaraokeLine
                      text={l.text}
                      lineStartTime={l.time}
                      lineEndTime={nextT}
                      currentTime={studioTime}
                      isPlaying={studioPlaying}
                      enhancedWords={l.words}
                      activeColor="var(--accent-primary)"
                      inactiveColor="var(--text-muted)"
                    />
                  ) : (
                    l.text
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>
            {/* 3-Line Spicy-Style Karaoke Stage */}
            {activeLine ? (
              <div
                style={{
                  background: 'var(--bg-card, #141519)',
                  borderRadius: '14px',
                  padding: '20px',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Tahan <kbd style={{ background: 'var(--bg-sidebar, #1E1F22)', border: '1px solid var(--border-color)', padding: '2px 7px', borderRadius: '5px', color: 'var(--text-primary)' }}>Space</kbd> saat kata dinyanyikan, <strong>lepas</strong> saat berhenti • <kbd style={{ background: 'var(--bg-sidebar, #1E1F22)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '5px', color: 'var(--text-primary)' }}>←/→</kbd> geser ±2s
                </div>

                {prevLine && (
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', opacity: 0.6 }}>
                    {prevLine.text}
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', fontSize: '23px', fontWeight: 800, lineHeight: 1.45 }}>
                  {(activeLine.words || []).map((w, wIdx) => {
                    const isDone = wIdx < cursorWord;
                    const isCurrent = wIdx === cursorWord;
                    const isActiveHold = isCurrent && isHoldingWord;
                    return (
                      <span
                        key={wIdx}
                        style={{
                          padding: '3px 10px',
                          borderRadius: '9px',
                          background: isActiveHold
                            ? 'var(--accent-primary)'
                            : isCurrent
                            ? 'rgba(245, 158, 11, 0.16)'
                            : isDone
                            ? 'rgba(16, 185, 129, 0.16)'
                            : 'var(--bg-sidebar, #1E1F22)',
                          color: isActiveHold
                            ? '#ffffff'
                            : isCurrent
                            ? '#F59E0B'
                            : isDone
                            ? '#10B981'
                            : 'var(--text-secondary)',
                          border: isActiveHold
                            ? '1px solid var(--accent-primary)'
                            : isCurrent
                            ? '1px solid #F59E0B'
                            : '1px solid transparent',
                          transform: isActiveHold ? 'scale(1.06)' : 'scale(1)',
                          transition: 'transform 0.08s ease, background 0.08s ease',
                        }}
                      >
                        {w.text}
                      </span>
                    );
                  })}
                </div>

                {nextLine && (
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', opacity: 0.72 }}>
                    {nextLine.text}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '26px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '14px', color: '#10B981', fontWeight: 700 }}>
                <CheckCircle2 size={26} style={{ marginBottom: '6px' }} />
                <div>Semua baris selesai! Klik <strong>Preview</strong> untuk cek hasil atau <strong>Publish</strong>.</div>
              </div>
            )}

            {/* Hold Button + Undo/Reset */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onMouseDown={startHoldWord}
                onMouseUp={endHoldWord}
                onMouseLeave={endHoldWord}
                onTouchStart={(e) => { e.preventDefault(); startHoldWord(); }}
                onTouchEnd={(e) => { e.preventDefault(); endHoldWord(); }}
                disabled={cursorLine >= lines.length}
                style={{
                  flex: 2,
                  background: isHoldingWord ? '#10B981' : 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  opacity: cursorLine >= lines.length ? 0.5 : 1,
                }}
              >
                {isHoldingWord ? '● Sedang Menyanyi... (Lepas jika selesai)' : 'Tahan untuk Kata Ini (Space)'}
              </button>
              <button
                onClick={handleUndoWord}
                style={{
                  background: 'var(--bg-card, #141519)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 600,
                }}
              >
                <Undo2 size={14} /> Undo
              </button>
              <button
                onClick={() => {
                  holdingRef.current = null;
                  setIsHoldingWord(false);
                  setCursorLine(0);
                  setCursorWord(0);
                  setLines((prev) =>
                    prev.map((l) => ({
                      ...l,
                      words: (l.words || []).map((w) => ({ ...w, startTime: undefined, endTime: undefined })),
                    }))
                  );
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#EF4444',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontWeight: 600,
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                onClick={() => nudgeActiveLine(-0.05)}
                title="Majukan timing baris aktif -50ms"
                style={{
                  background: 'var(--bg-card, #141519)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  padding: '12px 10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                -50ms
              </button>
              <button
                onClick={() => nudgeActiveLine(0.05)}
                title="Mundurkan timing baris aktif +50ms"
                style={{
                  background: 'var(--bg-card, #141519)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  padding: '12px 10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                +50ms
              </button>
              <button
                onClick={insertInstrumentalAfterCursor}
                title="Sisipkan jeda instrumental (• • •) di waktu saat ini"
                style={{
                  background: 'var(--bg-card, #141519)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '10px',
                  padding: '12px 11px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <Plus size={13} /> • • •
              </button>
            </div>
            {hasDraftBanner && (
              <div style={{ fontSize: '11px', color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', padding: '6px 10px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Draft otomatis dari sesi sebelumnya dipulihkan.</span>
                <button onClick={() => setHasDraftBanner(false)} style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', fontWeight: 700, fontSize: '11px' }}>Tutup</button>
              </div>
            )}

            {/* Lines Quick Jump */}
            <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-card, #141519)', padding: '8px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              {lines.map((l, idx) => {
                const done = l.words && l.words.every((w) => typeof w.startTime === 'number');
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      holdingRef.current = null;
                      setIsHoldingWord(false);
                      setCursorLine(idx);
                      setCursorWord(0);
                      if (l.time > 0) seekStudio(Math.max(0, l.time - 1.5));
                    }}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      background: idx === cursorLine ? 'var(--accent-primary)' : 'transparent',
                      color: idx === cursorLine ? '#fff' : done ? '#10B981' : 'var(--text-secondary)',
                      fontWeight: idx === cursorLine ? 700 : 500,
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {idx + 1}. {l.text}
                    </span>
                    <span>{done ? '✓' : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-card, #141519)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            onClick={onClose}
            style={{ background: 'var(--bg-sidebar, #1E1F22)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: '10px', padding: '9px 16px', cursor: 'pointer', fontWeight: 600 }}
          >
            Batal
          </button>
          <button
            onClick={handlePublish}
            disabled={isPublishing || lines.length === 0}
            style={{
              background: '#10B981',
              border: 'none',
              color: '#fff',
              borderRadius: '10px',
              padding: '9px 18px',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isPublishing || lines.length === 0 ? 0.6 : 1,
            }}
          >
            <UploadCloud size={16} /> {isPublishing ? 'Mengirim...' : isQaAdmin ? 'Publish (Auto-ACC)' : 'Kirim ke QA'}
          </button>
        </div>
      </div>
    </div>
  );
};
