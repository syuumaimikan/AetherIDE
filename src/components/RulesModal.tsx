import React, { useState } from 'react';
import { X, Shield, Sparkles, BookOpen, Save, Check, FileText } from 'lucide-react';
import { TauriBridge } from '../services/tauriBridge';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [rulesContent, setRulesContent] = useState<string>(`# AETHER Autonomous Architecture & Coding Rules
# (Automatically injected into AI Copilot & Multi-Agent Swarm)

## 1. Rust Engineering Standards
- **Zero Unwraps Policy**: Never use \`.unwrap()\` or \`.expect()\` in production code paths. Propagate errors using \`AetherResult<T>\` and \`?\`.
- **Async Tokio Concurrency**: All I/O, PTY operations, and file access must run non-blocking on Tokio green tasks.
- **Strict Linting**: Treat compiler warnings as errors. Enforce clean clippy adherence.

## 2. TypeScript & React Standards
- **React 19 & Pure Functions**: Zero uncontrolled side-effects. Use clean hooks and explicit dependency arrays.
- **Strict Typing**: No \`any\` types. Define interfaces in \`src/types/index.ts\`.
- **Zero Placeholder UI**: Build rich, interactive, production-grade components with micro-animations.

## 3. Zero-Trust Security Sandbox
- File overwrites and process termination must be guarded by RiskAnalyzer heuristics.
- All agent invocations are logged into the immutable Audit Ledger.
`);

  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      await TauriBridge.writeFile('/.aether/rules.md', rulesContent);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save rules:', err);
    }
  };

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
          backgroundColor: 'var(--vscode-bg-surface)',
          border: '1px solid var(--vscode-border)',
          borderRadius: '10px',
          width: '720px',
          maxWidth: '95vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--vscode-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--vscode-bg-titlebar)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={18} color="var(--vscode-blue)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#ffffff' }}>
                AI ルール & プロジェクト開発規約 (.aether/rules.md)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--vscode-text-muted)' }}>
                Cursor rules / CLAUDE.md 互換のシステムプロンプト・行動指針管理
              </div>
            </div>
          </div>
          <button className="tab-close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--vscode-text-secondary)' }}>
            以下のマークダウン定義は、AI Copilot、インライン補完、および 5段階 Autonomous Swarm DAG の全エージェントに自動注入されます：
          </div>

          <textarea
            value={rulesContent}
            onChange={(e) => setRulesContent(e.target.value)}
            style={{
              flex: 1,
              minHeight: '320px',
              padding: '12px',
              borderRadius: '6px',
              background: 'var(--vscode-bg-input)',
              border: '1px solid var(--vscode-border)',
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              lineHeight: '1.6',
              resize: 'none',
              outline: 'none',
            }}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--vscode-border)',
            background: 'var(--vscode-bg-titlebar)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--vscode-text-muted)' }}>
            ファイルパス: <code>/.aether/rules.md</code>
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              閉じる
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              style={{ background: 'var(--vscode-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isSaved ? <Check size={13} /> : <Save size={13} />}
              <span>{isSaved ? '保存完了' : 'ルールを保存'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
