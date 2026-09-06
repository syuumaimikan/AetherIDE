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

export const ExtensionsPanel: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
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
          return { ...ext, installed: nextInstalled, enabled: nextInstalled };
        }
        return ext;
      })
    );
  };

  const toggleEnabled = (id: string) => {
    setExtensions((prev) =>
      prev.map((ext) => (ext.id === id ? { ...ext, enabled: !ext.enabled } : ext))
    );
  };

  const filtered = extensions.filter(
    (ext) =>
      ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ext.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const installedList = filtered.filter((e) => e.installed);
  const recommendedList = filtered.filter((e) => !e.installed);

  return (
    <div className="left-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <span style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>
          拡張機能 : MARKETPLACE
        </span>
      </div>

      {/* Search Bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--vscode-border)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
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
            placeholder="拡張機能を検索する..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="sidebar-content" style={{ padding: '0 8px' }}>
        {/* Installed Section */}
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

                  <div style={{ display: 'flex', gap: '4px' }}>
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

        {/* Recommended Section */}
        <div style={{ marginTop: '16px' }}>
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
                    onClick={() => toggleInstall(ext.id)}
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
      </div>
    </div>
  );
};
