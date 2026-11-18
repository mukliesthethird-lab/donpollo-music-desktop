import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Play, Pause, SkipForward, SkipBack, Shuffle, Repeat,
  VolumeX, Home, Library, Download, Map as MapIcon, Settings,
  Sparkles, Paintbrush, Maximize2, Music, ListMusic, X, CornerDownLeft
} from 'lucide-react';

export interface CommandActionItem {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: any) => string;
  actions: CommandActionItem[];
  playlists: any[];
  madeForYouPlaylists: any[];
  playHistory: any[];
  likedSongs: any[];
  onPlaySong: (song: any) => void;
  onOpenPlaylist: (pl: any) => void;
  onSearchQuery: (query: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  t,
  actions,
  playlists,
  madeForYouPlaylists,
  playHistory,
  likedSongs,
  onPlaySong,
  onOpenPlaylist,
  onSearchQuery,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: CommandActionItem[] = [];

    // 1. Live Search option when user types something
    if (q.length >= 2) {
      result.push({
        id: `search:${q}`,
        category: t('cmdCatSearch') || 'Search',
        title: `${t('cmdSearchOnline') || 'Search & play'}: "${query.trim()}"`,
        subtitle: t('cmdSearchOnlineDesc') || 'Search across DonPollo Music',
        icon: <Search size={16} />,
        shortcut: 'Enter',
        onSelect: () => {
          onSearchQuery(query.trim());
          onClose();
        },
      });
    }

    // 2. Quick Actions
    const matchedActions = actions.filter(a =>
      !q || a.title.toLowerCase().includes(q) || (a.subtitle || '').toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
    result.push(...matchedActions.slice(0, q ? 8 : 7));

    // 3. Playlists & Made For You Mixes
    const allPlaylists = [...(madeForYouPlaylists || []), ...(playlists || [])];
    const matchedPlaylists = allPlaylists.filter(pl =>
      pl?.name && (!q || pl.name.toLowerCase().includes(q))
    );
    matchedPlaylists.slice(0, 5).forEach(pl => {
      result.push({
        id: `pl:${pl.id}`,
        category: t('playlist') || 'Playlists',
        title: pl.name,
        subtitle: `${pl.songs?.length || 0} ${t('songs') || 'songs'}`,
        icon: <ListMusic size={16} />,
        onSelect: () => {
          onOpenPlaylist(pl);
          onClose();
        },
      });
    });

    // 4. Local History & Liked Songs (deduped)
    if (q.length >= 1) {
      const seen = new Set<string>();
      const songPool = [...(likedSongs || []), ...(playHistory || [])];
      for (const s of songPool) {
        if (!s?.title) continue;
        const key = `${s.title.toLowerCase()}__${(s.artist || '').toLowerCase()}`;
        if (seen.has(key)) continue;
        if (s.title.toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q)) {
          seen.add(key);
          result.push({
            id: `song:${s.id || key}`,
            category: t('cmdCatSongs') || 'Your Library',
            title: s.title,
            subtitle: s.artist || 'Unknown Artist',
            icon: <Music size={16} />,
            onSelect: () => {
              onPlaySong(s);
              onClose();
            },
          });
          if (seen.size >= 6) break;
        }
      }
    }

    return result;
  }, [query, actions, playlists, madeForYouPlaylists, playHistory, likedSongs, t, onSearchQuery, onOpenPlaylist, onPlaySong, onClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const activeEl = listRef.current?.querySelector(`[data-cmd-idx="${selectedIndex}"]`) as HTMLElement | null;
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (items.length > 0 ? (prev + 1) % items.length : 0));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = items[selectedIndex];
      if (target) {
        target.onSelect();
      } else if (query.trim().length >= 2) {
        onSearchQuery(query.trim());
        onClose();
      }
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 100000,
        alignItems: 'flex-start',
        paddingTop: '11vh',
        backdropFilter: 'blur(8px)',
        background: 'rgba(0, 0, 0, 0.58)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: 'min(620px, 92vw)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.55)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Input Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <Search size={18} color="var(--accent-primary)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('cmdPlaceholder') || 'Type a command, playlist, or song...'}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '15px',
              fontWeight: 500,
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
            >
              <X size={16} />
            </button>
          )}
          <span style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            padding: '2px 7px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            fontWeight: 600,
          }}>
            ESC
          </span>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            maxHeight: '380px',
            overflowY: 'auto',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          }}
        >
          {items.length === 0 ? (
            <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              {t('cmdNoResults') || 'No matching commands or items.'}
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-cmd-idx={idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => item.onSelect()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(var(--accent-primary-rgb, 29, 185, 84), 0.16)' : 'transparent',
                    border: isSelected ? '1px solid rgba(var(--accent-primary-rgb, 29, 185, 84), 0.35)' : '1px solid transparent',
                    transition: 'background 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: isSelected ? 'var(--accent-primary)' : 'var(--bg-card)',
                      color: isSelected ? 'var(--accent-text, #fff)' : 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '13.5px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div style={{
                          fontSize: '11.5px',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.4px',
                    }}>
                      {item.category}
                    </span>
                    {isSelected && <CornerDownLeft size={13} color="var(--accent-primary)" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export {
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat,
  VolumeX, Home, Library, Download, MapIcon, Settings,
  Sparkles, Paintbrush, Maximize2
};
