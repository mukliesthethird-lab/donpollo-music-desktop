import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, ChevronDown, Sparkles } from 'lucide-react';

interface PartyMessage {
  id: number;
  partyId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  type: 'chat' | 'reaction';
  content: string;
  createdAt: number;
}

interface FloatingReaction {
  uid: string;
  emoji: string;
  senderName: string;
  rightOffset: number;
}

interface PartyChatOverlayProps {
  partyId: string | null;
  currentUser: { id: string; name: string; avatar?: string | null } | null;
  t: (key: any) => string;
}

const QUICK_EMOJIS = ['🔥', '❤️', '😭', '🕺', '🎧', '✨'];

export const PartyChatOverlay: React.FC<PartyChatOverlayProps> = ({
  partyId,
  currentUser,
  t,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<PartyMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [inputText, setInputText] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const lastIdRef = useRef<number>(0);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const spawnFloatingEmoji = (emoji: string, senderName: string) => {
    const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const rightOffset = 20 + Math.floor(Math.random() * 80);
    setFloatingReactions(prev => [...prev.slice(-14), { uid, emoji, senderName, rightOffset }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.uid !== uid));
    }, 2600);
  };

  // Reset when leaving or switching party
  useEffect(() => {
    setMessages([]);
    setUnreadCount(0);
    lastIdRef.current = 0;
  }, [partyId]);

  // Poll party messages every 1.8s while in a party
  useEffect(() => {
    if (!partyId) return;
    const api = (window as any).electronAPI;
    if (!api?.pollPartyMessages) return;

    let cancelled = false;
    let isFirstLoad = true;

    const poll = async () => {
      try {
        const rows: PartyMessage[] = await api.pollPartyMessages(partyId, lastIdRef.current);
        if (cancelled || !Array.isArray(rows) || rows.length === 0) {
          isFirstLoad = false;
          return;
        }

        const maxId = rows[rows.length - 1].id;
        if (maxId > lastIdRef.current) {
          lastIdRef.current = maxId;
        }

        const chatMsgs = rows.filter(r => r.type === 'chat');
        const reactionMsgs = rows.filter(r => r.type === 'reaction');

        if (chatMsgs.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const fresh = chatMsgs.filter(m => !existingIds.has(m.id));
            if (fresh.length === 0) return prev;
            if (!isFirstLoad && !isOpenRef.current) {
              setUnreadCount(c => c + fresh.length);
            }
            return [...prev, ...fresh].slice(-50);
          });
        }

        if (!isFirstLoad && reactionMsgs.length > 0) {
          reactionMsgs.forEach((r, idx) => {
            setTimeout(() => {
              spawnFloatingEmoji(r.content, r.senderName);
            }, idx * 120);
          });
        }
        isFirstLoad = false;
      } catch {
        isFirstLoad = false;
      }
    };

    poll();
    const timer = setInterval(poll, 1800);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [partyId]);

  useEffect(() => {
    if (isOpen && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  if (!partyId || !currentUser) return null;

  const sendMessage = async (type: 'chat' | 'reaction', content: string) => {
    const clean = content.trim();
    if (!clean) return;
    const api = (window as any).electronAPI;
    if (!api?.sendPartyMessage) return;

    if (type === 'reaction') {
      spawnFloatingEmoji(clean, currentUser.name);
    }

    try {
      const sent: PartyMessage | null = await api.sendPartyMessage({
        partyId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar || null,
        type,
        content: clean,
      });
      if (sent) {
        if (sent.id > lastIdRef.current) {
          lastIdRef.current = sent.id;
        }
        if (sent.type === 'chat') {
          setMessages(prev => {
            if (prev.some(m => m.id === sent.id)) return prev;
            return [...prev, sent].slice(-50);
          });
        }
      }
    } catch {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const txt = inputText;
    setInputText('');
    sendMessage('chat', txt);
  };

  return (
    <>
      {/* Floating Emoji Reactions Layer */}
      <div
        style={{
          position: 'fixed',
          bottom: '105px',
          right: '24px',
          width: '220px',
          height: '320px',
          pointerEvents: 'none',
          zIndex: 9990,
          overflow: 'visible',
        }}
      >
        {floatingReactions.map(r => (
          <div
            key={r.uid}
            className="party-floating-emoji"
            style={{
              position: 'absolute',
              bottom: '0px',
              right: `${r.rightOffset}px`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              animation: 'partyFloatUp 2.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            }}
          >
            <span style={{ fontSize: '28px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))' }}>
              {r.emoji}
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#fff',
              background: 'rgba(15, 23, 42, 0.78)',
              padding: '1px 6px',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
            }}>
              {r.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Collapsible Party Chat Widget */}
      <div
        style={{
          position: 'fixed',
          bottom: '104px',
          right: '24px',
          zIndex: 9991,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
        }}
      >
        {isOpen ? (
          <div
            style={{
              width: '310px',
              height: '370px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={15} color="var(--accent-primary)" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {t('partyChatTitle') || 'Party Chat'}
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
              >
                <ChevronDown size={17} />
              </button>
            </div>

            {/* Messages Feed */}
            <div
              ref={feedRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '16px' }}>
                  {t('partyChatEmpty') || 'Say hi or drop an emoji reaction!'}
                </div>
              ) : (
                messages.map(m => {
                  const isMe = m.senderId === currentUser.id;
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        gap: '2px',
                      }}
                    >
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {m.senderName}
                      </span>
                      <div
                        style={{
                          maxWidth: '85%',
                          padding: '6px 10px',
                          borderRadius: '12px',
                          fontSize: '12.5px',
                          lineHeight: 1.35,
                          wordBreak: 'break-word',
                          background: isMe ? 'var(--accent-primary)' : 'var(--bg-card)',
                          color: isMe ? 'var(--accent-text, #fff)' : 'var(--text-primary)',
                          border: isMe ? 'none' : '1px solid var(--border-color)',
                        }}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Emoji Reaction Bar */}
            <div style={{
              padding: '6px 10px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.02)',
            }}>
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendMessage('reaction', emoji)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '17px',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    borderRadius: '8px',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.25)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={handleSubmit}
              style={{
                padding: '8px 10px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '6px',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('partyChatPlaceholder') || 'Message party...'}
                maxLength={250}
                style={{
                  flex: 1,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '999px',
                  padding: '6px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'var(--accent-primary)',
                  color: 'var(--accent-text, #fff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Quick floating emoji pill when minimized */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '999px',
              padding: '4px 8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            }}>
              {QUICK_EMOJIS.slice(0, 4).map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => sendMessage('reaction', emoji)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '15px',
                    cursor: 'pointer',
                    padding: '2px 4px',
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => { setIsOpen(true); setUnreadCount(0); }}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--accent-primary)',
                color: 'var(--accent-text, #fff)',
                border: 'none',
                borderRadius: '999px',
                padding: '9px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              }}
            >
              <MessageSquare size={15} />
              <span>{t('partyChatTitle') || 'Party Chat'}</span>
              {unreadCount > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  borderRadius: '999px',
                  padding: '1px 6px',
                }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
};
