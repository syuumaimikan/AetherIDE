import React from 'react';
import { X, Keyboard, Command, Sparkles, Terminal, Shield, GitBranch } from 'lucide-react';

interface KeybindingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: string;
}

export const KeybindingsModal: React.FC<KeybindingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts: ShortcutItem[] = [
    // Navigation
    { keys: ['Ctrl', 'P'], description: 'Quick Open / Command Palette', category: 'Navigation' },
    { keys: ['Ctrl', 'Shift', 'P'], description: 'Action Command Palette (F1)', category: 'Navigation' },
    { keys: ['Ctrl', '`'], description: 'Toggle Integrated Terminal Dock', category: 'Navigation' },
    { keys: ['Ctrl', 'B'], description: 'Toggle Primary Sidebar', category: 'Navigation' },
    { keys: ['Ctrl', 'J'], description: 'Toggle Bottom Output Dock', category: 'Navigation' },
    { keys: ['Ctrl', 'Shift', 'H'], description: 'Open Keyboard Shortcuts Help (?)', category: 'Navigation' },

    // 3-in-1 Workspace Modes
    { keys: ['Ctrl', 'Shift', '1'], description: 'Switch to Normal IDE Mode', category: 'Workspace Modes' },
    { keys: ['Ctrl', 'Shift', '2'], description: 'Switch to Agent Swarm Mode', category: 'Workspace Modes' },
    { keys: ['Ctrl', 'Shift', '3'], description: 'Switch to Agent OS Mode', category: 'Workspace Modes' },

    // Editor & AI
    { keys: ['Tab'], description: 'Accept Ghost Text / Inline AI Suggestion', category: 'Editor & AI' },
    { keys: ['Escape'], description: 'Dismiss Ghost Suggestion / Close Modal', category: 'Editor & AI' },
    { keys: ['Ctrl', 'S'], description: 'Save Active Document to Disk', category: 'Editor & AI' },
    { keys: ['Ctrl', 'W'], description: 'Close Active Tab', category: 'Editor & AI' },
    { keys: ['Ctrl', 'Enter'], description: 'Send Message / Execute Swarm Task', category: 'Editor & AI' },
    { keys: ['Ctrl', 'Shift', 'D'], description: 'Inspect Code Diff in Modal', category: 'Editor & AI' },

    // Git & SCM
    { keys: ['Ctrl', 'Shift', 'G'], description: 'Switch to Source Control View', category: 'Source Control' },
  ];

  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          width: '680px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Keyboard size={20} color="var(--accent-primary)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>
                AETHER IDE Keyboard Shortcuts
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Speed-optimized keybindings for rapid autonomous engineering
              </div>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {categories.map((cat) => (
            <div key={cat}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--accent-cyan)',
                  marginBottom: '10px',
                }}
              >
                {cat}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '8px',
                }}
              >
                {shortcuts
                  .filter((s) => s.category === cat)
                  .map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                        {item.description}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {item.keys.map((k, kidx) => (
                          <kbd
                            key={kidx}
                            style={{
                              background: 'var(--bg-workspace)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '4px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              color: 'var(--text-secondary)',
                              boxShadow: '0 2px 0 rgba(0,0,0,0.4)',
                            }}
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <span>Press <kbd style={{ padding: '1px 4px', borderRadius: 3, background: 'var(--bg-workspace)' }}>Esc</kbd> anytime to dismiss overlays</span>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
