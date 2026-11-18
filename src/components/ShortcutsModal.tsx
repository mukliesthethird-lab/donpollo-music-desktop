import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="modal"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '580px',
          width: '92%',
          padding: '24px 28px',
          borderRadius: '16px',
          background: 'var(--bg-modal, #18181b)',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'var(--accent-primary, #6366f1)', color: 'white', borderRadius: '8px', padding: '6px', display: 'flex' }}>
              <Keyboard size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Keyboard Shortcuts</h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Tekan shortcut di bawah untuk kontrol instan</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ padding: '6px' }} title="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-primary, #6366f1)', marginBottom: '10px', letterSpacing: '0.05em' }}>Playback</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Play / Pause</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>Space</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Lagu Berikutnya</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 6px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>Ctrl</kbd>
                  <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 6px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>→</kbd>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Lagu Sebelumnya</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 6px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>Ctrl</kbd>
                  <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 6px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>←</kbd>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Maju 5 Detik</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>→</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Mundur 5 Detik</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>←</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Toggle Acak (Shuffle)</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>S</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Toggle Ulang (Repeat)</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>R</kbd>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-primary, #6366f1)', marginBottom: '10px', letterSpacing: '0.05em' }}>Audio & Kontrol</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Volume Naik (+5%)</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>↑</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Volume Turun (-5%)</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>↓</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Bisu (Mute)</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>M</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Sukai Lagu (Like)</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>L</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Command Palette</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 6px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>Ctrl</kbd>
                  <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 6px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>K</kbd>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Fokus Pencarian</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>/</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Shortcut Cheat Sheet</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>?</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-primary)' }}>Tutup Modal / Batal</span>
                <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '3px 8px', borderRadius: '5px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.15)', fontFamily: 'monospace' }}>Esc</kbd>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-primary" onClick={onClose} style={{ padding: '8px 20px' }}>
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
