import React, { useState } from 'react';
import {
  Blocks,
  Check,
  Download,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Trash2,
  Zap,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

interface ExtensionItem {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  downloads: string;
  rating: number;
  installed: boolean;
  enabled: boolean;
  category: 'ai' | 'language' | 'tool' | 'theme';
  iconColor: string;
}

interface ExtensionsPanelProps {
  onNotification?: (toast: { title: string; message: string; severity: 'success' | 'info' | 'warning' | 'error' }) => void;
}

export const ExtensionsPanel: React.FC<ExtensionsPanelProps> = ({ onNotification }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ai' | 'language' | 'tool' | 'installed'>('all');
  const [selectedDetailExt, setSelectedDetailExt] = useState<ExtensionItem | null>(null);
  const [extensions, setExtensions] = useState<ExtensionItem[]>([
    {
      id: 'ext-rust-analyzer',
      name: 'Rust Analyzer Pro',
      publisher: 'rust-lang',
      version: 'v0.4.2026',
      description: 'High-performance AST analysis, autocomplete, inlay hints, and macro expansion for Rust.',
      downloads: '1.8M',
      rating: 4.9,
      installed: true,
      enabled: true,
      category: 'language',
      iconColor: '#e44d26',
    },
    {
      id: 'ext-aether-swarm',
      name: 'Aether 5-Stage Swarm Engine',
      publisher: 'Aether Group',
      version: 'v1.2.0',
      description: 'Autonomous multi-agent DAG pipeline (Architect, Coder, Tester, Reviewer, Security Auditor).',
      downloads: '420K',
      rating: 5.0,
      installed: true,
      enabled: true,
      category: 'ai',
      iconColor: '#6366f1',
    },
    {
      id: 'ext-tokio-profiler',
      name: 'Tokio Async Green Task Profiler',
      publisher: 'tokio.rs',
      version: 'v0.9.4',
      description: 'Lock-free green worker telemetry, task budget monitor, and channel backpressure inspector.',
      downloads: '310K',
      rating: 4.8,
      installed: true,
      enabled: true,
      category: 'tool',
      iconColor: '#38bdf8',
    },
    {
      id: 'ext-zero-trust-guard',
      name: 'Zero-Trust Host OS Security Guard',
      publisher: 'Aether Aegis',
      version: 'v2.0.1',
      description: 'Heuristic AST risk analysis, immutable audit ledger, and guarded process sandboxing.',
      downloads: '580K',
      rating: 4.9,
      installed: true,
      enabled: true,
      category: 'ai',
      iconColor: '#10b981',
    },
    {
      id: 'ext-git-lens',
      name: 'Git Graph & Code History',
      publisher: 'GitCraft',
      version: 'v15.1.0',
      description: 'Visual commit graphs, inline line blame, branch compare, and interactive rebase.',
      downloads: '2.4M',
      rating: 4.7,
      installed: false,
      enabled: false,
      category: 'tool',
      iconColor: '#f44336',
    },
    {
      id: 'ext-deepseek-r1',
      name: 'DeepSeek Reasoning Provider',
      publisher: 'DeepSeek AI',
      version: 'v1.0.0',
      description: 'Full integration for DeepSeek-R1 chain-of-thought mathematical reasoning model.',
      downloads: '920K',
      rating: 4.9,
      installed: false,
      enabled: false,
      category: 'ai',
      iconColor: '#0078d4',
    },
  ]);

  const toggleInstall = (id: string) => {
    setExtensions((prev) =>
      prev.map((ext) => {
        if (ext.id === id) {
          const nextInstalled = !ext.installed;
          if (nextInstalled) {
            onNotification?.({
              title: '拡張機能をインストールしました',
              message: `${ext.name} (${ext.version}) が正常にアクティベートされました。`,
              severity: 'success',
            });
          } else {
            onNotification?.({
              title: '拡張機能をアンインストールしました',
              message: `${ext.name} を削除しました。`,
              severity: 'info',
            });
          }
          return { ...ext, installed: nextInstalled, enabled: nextInstalled };
        }
        return ext;
      })
    );
  };

  const toggleEnabled = (id: string) => {
    setExtensions((prev) =>
      prev.map((ext) => {
        if (ext.id === id) {
          const nextEnabled = !ext.enabled;
          onNotification?.({
            title: nextEnabled ? '拡張機能を有効化' : '拡張機能を無効化',
            message: `${ext.name} を${nextEnabled ? '有効' : '無効'}に設定しました。`,
            severity: 'info',
          });
          return { ...ext, enabled: nextEnabled };
        }
        return ext;
      })
    );
  };

  const filtered = extensions.filter((ext) => {
    const matchesSearch =
      ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedCategory === 'installed') return matchesSearch && ext.installed;
    if (selectedCategory === 'all') return matchesSearch;
    return matchesSearch && ext.category === selectedCategory;
  });

  const installedList = filtered.filter((e) => e.installed);
  const recommendedList = filtered.filter((e) => !e.installed);

  const categoryTabs = [
    { key: 'all', label: 'すべて' },
    { key: 'ai', label: 'AI & Swarm' },
    { key: 'language', label: '言語 & AST' },
    { key: 'tool', label: '開発ツール' },
    { key: 'installed', label: 'インストール済み' },
  ];

  return (
    <div className="left-sidebar" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="sidebar-header">
        <span style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>
          拡張機能 : MARKETPLACE
        </span>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--vscode-border)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
          <Search size={13} style={{ position: 'absolute', left: '8px', color: 'var(--vscode-text-muted)' }} />
          <input
            type="text"
            className="input-text"
            style={{
              width: '100%',
              paddingLeft: '28px',
              background: 'var(--vscode-bg-input)',
              border: '1px solid var(--vscode-border)',
              color: '#ffffff',
              fontSize: '12px',
            }}
            placeholder="拡張機能やAIスキルを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
          {categoryTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key as any)}
              style={{
                background: selectedCategory === tab.key ? 'var(--vscode-blue)' : 'rgba(255,255,255,0.06)',
                color: selectedCategory === tab.key ? '#ffffff' : 'var(--vscode-text-secondary)',
                border: 'none',
                padding: '2px 7px',
                borderRadius: '10px',
                fontSize: '10px',
                fontWeight: selectedCategory === tab.key ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-content" style={{ padding: '0 8px', flex: 1, overflowY: 'auto' }}>
        {/* Installed Section */}
        {installedList.length > 0 && selectedCategory !== 'ai' && selectedCategory !== 'language' && selectedCategory !== 'tool' && (
          <div style={{ marginTop: '10px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--vscode-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '4px 6px',
              }}
            >
              インストール済み ({installedList.length})
            </div>

            {installedList.map((ext) => (
              <div
                key={ext.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '8px 6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                }}
                onClick={() => setSelectedDetailExt(ext)}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Blocks size={18} color={ext.iconColor} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: '#ffffff' }}>
                      {ext.name}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--vscode-text-muted)' }}>
                      {ext.version}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--vscode-text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: '2px',
                    }}
                    title={ext.description}
                  >
                    {ext.description}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--vscode-text-muted)' }}>
                      <span>{ext.publisher}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Star size={10} color="#facc15" fill="#facc15" />
                        {ext.rating}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '10px', padding: '1px 6px' }}
                        onClick={() => toggleEnabled(ext.id)}
                      >
                        {ext.enabled ? '無効' : '有効'}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '10px', padding: '1px 4px' }}
                        onClick={() => toggleInstall(ext.id)}
                        title="アンインストール"
                      >
                        <Trash2 size={11} color="#f87171" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommended Section */}
        {selectedCategory !== 'installed' && (
          <div style={{ marginTop: '14px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: 'var(--vscode-text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '4px 6px',
              }}
            >
              推奨 / AI SKILL パック ({recommendedList.length})
            </div>

            {recommendedList.map((ext) => (
              <div
                key={ext.id}
                style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '8px 6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                }}
                onClick={() => setSelectedDetailExt(ext)}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Blocks size={18} color={ext.iconColor} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '12px', color: '#ffffff' }}>
                      {ext.name}
                    </span>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '10px', padding: '2px 8px', background: 'var(--vscode-blue)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleInstall(ext.id);
                      }}
                    >
                      <Download size={10} />
                      <span>インストール</span>
                    </button>
                  </div>

                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--vscode-text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: '2px',
                    }}
                    title={ext.description}
                  >
                    {ext.description}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--vscode-text-muted)', marginTop: '4px' }}>
                    <span>{ext.publisher}</span>
                    <span>{ext.downloads} DL</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <Star size={10} color="#facc15" fill="#facc15" />
                      {ext.rating}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Extension Detail Modal Drawer */}
      {selectedDetailExt && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--vscode-bg-surface)',
            zIndex: 99,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--vscode-border)',
              background: 'var(--vscode-bg-titlebar)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>拡張機能の詳細</span>
            <button className="tab-close-btn" onClick={() => setSelectedDetailExt(null)}>
              <X size={13} />
            </button>
          </div>

          <div style={{ padding: '16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Blocks size={24} color={selectedDetailExt.iconColor} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff' }}>{selectedDetailExt.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--vscode-text-muted)' }}>
                  {selectedDetailExt.publisher} • {selectedDetailExt.version}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-primary btn-sm"
                style={{
                  flex: 1,
                  background: selectedDetailExt.installed ? '#f87171' : 'var(--vscode-blue)',
                  padding: '6px 12px',
                }}
                onClick={() => {
                  toggleInstall(selectedDetailExt.id);
                  setSelectedDetailExt((prev) => (prev ? { ...prev, installed: !prev.installed } : null));
                }}
              >
                {selectedDetailExt.installed ? 'アンインストール' : 'インストール'}
              </button>
              {selectedDetailExt.installed && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '6px 12px' }}
                  onClick={() => {
                    toggleEnabled(selectedDetailExt.id);
                    setSelectedDetailExt((prev) => (prev ? { ...prev, enabled: !prev.enabled } : null));
                  }}
                >
                  {selectedDetailExt.enabled ? '無効にする' : '有効にする'}
                </button>
              )}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--vscode-text-secondary)', lineHeight: '1.5' }}>
              {selectedDetailExt.description}
            </div>

            <div style={{ borderTop: '1px solid var(--vscode-border)', paddingTop: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--vscode-blue)', marginBottom: '6px' }}>
                セキュリティ & ケーパビリティ
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--vscode-text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={13} color="#81b88b" />
                  <span>Aether Zero-Trust 監査検証済み</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={13} color="var(--vscode-blue)" />
                  <span>評価: {selectedDetailExt.rating} / 5.0 ({selectedDetailExt.downloads} ダウンロード)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
