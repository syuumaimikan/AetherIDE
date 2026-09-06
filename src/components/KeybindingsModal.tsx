import React, { useState } from 'react';
import { X, Keyboard, Command, Sparkles, Terminal, Shield, GitBranch, Search } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const shortcuts: ShortcutItem[] = [
    // Navigation & Command Palette
    { keys: ['Ctrl', 'P'], description: 'クイックオープン / ファイル検索', category: 'Navigation' },
    { keys: ['Ctrl', 'Shift', 'P'], description: 'すべてのコマンドを表示 (F1)', category: 'Navigation' },
    { keys: ['Ctrl', '`'], description: '統合ターミナルの表示/非表示切替', category: 'Navigation' },
    { keys: ['Ctrl', 'B'], description: 'プライマリ サイドバーの表示/非表示切替', category: 'Navigation' },
    { keys: ['Ctrl', 'J'], description: 'ボトムパネル (ターミナル) の切替', category: 'Navigation' },
    { keys: ['Ctrl', 'Shift', 'H'], description: 'ショートカット一覧ヘルプの表示 (F1)', category: 'Navigation' },

    // 3-in-1 Workspace Modes
    { keys: ['Ctrl', 'Shift', '1'], description: '通常 IDE モード (Normal IDE)', category: 'Workspace Modes' },
    { keys: ['Ctrl', 'Shift', '2'], description: '自律 Agent Swarm パイプライン モード', category: 'Workspace Modes' },
    { keys: ['Ctrl', 'Shift', '3'], description: 'Agent OS ホスト管理コックピット モード', category: 'Workspace Modes' },

    // Editor & AI Workflows
    { keys: ['Tab'], description: 'Ghost AI インラインコード補完を確定', category: 'Editor & AI' },
    { keys: ['Ctrl', 'I'], description: 'Cursor風 インライン AI 編集バー起動', category: 'Editor & AI' },
    { keys: ['Ctrl', 'S'], description: '作業中ファイルをディスクに保存', category: 'Editor & AI' },
    { keys: ['Ctrl', 'W'], description: 'アクティブなエディタータブを閉じる', category: 'Editor & AI' },
    { keys: ['Ctrl', 'Enter'], description: 'AI Copilot へメッセージ送信 / Swarm 実行', category: 'Editor & AI' },
    { keys: ['Shift', 'Alt', 'F'], description: 'ドキュメントの自動フォーマット', category: 'Editor & AI' },
    { keys: ['Ctrl', 'Z'], description: '元に戻す (Undo)', category: 'Editor & AI' },
    { keys: ['Ctrl', 'Y'], description: 'やり直す (Redo)', category: 'Editor & AI' },

    // Git & SCM
    { keys: ['Ctrl', 'Shift', 'G'], description: 'Git ソース管理パネルを表示', category: 'Source Control' },
    { keys: ['Ctrl', 'Shift', 'U'], description: 'AI ルール & 開発規約 (.aether/rules.md)', category: 'Rules & Governance' },

    // Debug & Execution
    { keys: ['F5'], description: 'デバッグセッションの開始 / 続行', category: 'Debug' },
    { keys: ['F6'], description: 'デバッグ実行の一時停止', category: 'Debug' },
    { keys: ['F10'], description: 'ステップ オーバー (Step Over)', category: 'Debug' },
    { keys: ['F11'], description: 'ステップ イン (Step Into)', category: 'Debug' },
    { keys: ['Shift', 'F11'], description: 'ステップ アウト (Step Out)', category: 'Debug' },
    { keys: ['Shift', 'F5'], description: 'デバッグの停止', category: 'Debug' },
    { keys: ['Ctrl', 'Shift', 'F5'], description: 'デバッグの再起動', category: 'Debug' },
  ];

  const categories = ['All', ...Array.from(new Set(shortcuts.map((s) => s.category)))];

  const filteredShortcuts = shortcuts.filter((s) => {
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesQuery =
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.keys.join(' ').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const displayedCategories =
    selectedCategory === 'All'
      ? Array.from(new Set(filteredShortcuts.map((s) => s.category)))
      : [selectedCategory];

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

        {/* Search & Category Filter Bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--vscode-border)', background: 'var(--vscode-bg-surface)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--vscode-text-muted)' }} />
            <input
              type="text"
              className="input-text"
              style={{
                width: '100%',
                paddingLeft: '32px',
                background: 'var(--vscode-bg-input)',
                border: '1px solid var(--vscode-border)',
                color: '#ffffff',
                fontSize: '12px',
              }}
              placeholder="ショートカットやコマンド名、キーを検索 (例: Ctrl+P, debug, diff, normal)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: selectedCategory === cat ? 'var(--vscode-blue)' : 'rgba(255,255,255,0.06)',
                  color: selectedCategory === cat ? '#ffffff' : 'var(--vscode-text-secondary)',
                  border: '1px solid ' + (selectedCategory === cat ? 'var(--vscode-blue)' : 'var(--vscode-border)'),
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: selectedCategory === cat ? 600 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: 1,
          }}
        >
          {displayedCategories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--vscode-text-muted)', fontSize: '12px' }}>
              一致するキーバインドが見つかりませんでした
            </div>
          ) : (
            displayedCategories.map((cat) => {
              const catShortcuts = filteredShortcuts.filter((s) => s.category === cat);
              if (catShortcuts.length === 0) return null;

              return (
                <div key={cat}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: 'var(--vscode-blue)',
                      marginBottom: '8px',
                    }}
                  >
                    {cat} ({catShortcuts.length})
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                      gap: '6px',
                    }}
                  >
                    {catShortcuts.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: '5px',
                          background: 'var(--vscode-bg-surface)',
                          border: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <span style={{ fontSize: '12px', color: 'var(--vscode-text)' }}>
                          {item.description}
                        </span>
                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                          {item.keys.map((k, kidx) => (
                            <kbd
                              key={kidx}
                              style={{
                                background: 'rgba(255, 255, 255, 0.08)',
                                border: '1px solid var(--vscode-border)',
                                borderRadius: '3px',
                                padding: '2px 5px',
                                fontSize: '10px',
                                fontFamily: 'var(--font-mono)',
                                color: '#ffffff',
                                boxShadow: '0 1px 0 rgba(0,0,0,0.5)',
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
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--vscode-border)',
            background: 'var(--vscode-bg-titlebar)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '11px',
            color: 'var(--vscode-text-muted)',
          }}
        >
          <span><kbd style={{ padding: '1px 4px', borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}>Esc</kbd> キーでいつでもオーバーレイを閉じられます</span>
          <button className="btn btn-primary btn-sm" onClick={onClose} style={{ background: 'var(--vscode-blue)' }}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
