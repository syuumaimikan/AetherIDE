import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { OpenFileTab } from '../types';
import { Sparkles, X } from 'lucide-react';

interface EditorAreaProps {
  openTabs: OpenFileTab[];
  activeTabIndex: number;
  onSelectTab: (index: number) => void;
  onCloseTab: (index: number) => void;
  onContentChange: (newContent: string) => void;
  onSave: () => void;
  onAiInlineEdit: (instruction: string) => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  openTabs,
  activeTabIndex,
  onSelectTab,
  onCloseTab,
  onContentChange,
  onSave,
  onAiInlineEdit,
}) => {
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');

  const activeTab = openTabs[activeTabIndex];

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInstruction.trim()) return;
    onAiInlineEdit(aiInstruction.trim());
    setAiInstruction('');
    setShowAiInput(false);
  };

  const getMonacoLanguage = (path: string): string => {
    if (path.endsWith('.rs')) return 'rust';
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.toml')) return 'ini';
    if (path.endsWith('.md')) return 'markdown';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.css')) return 'css';
    return 'plaintext';
  };

  return (
    <div className="editor-workspace">
      {/* Tab Bar */}
      <div className="editor-tabs-bar">
        {openTabs.map((tab, idx) => (
          <div
            key={tab.path}
            className={`editor-tab ${idx === activeTabIndex ? 'active' : ''}`}
            onClick={() => onSelectTab(idx)}
          >
            <span>{tab.name}</span>
            {tab.isModified && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-cyan)',
                }}
              />
            )}
            <button
              className="tab-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(idx);
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {openTabs.length > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: 'auto', marginRight: '8px' }}
            onClick={() => setShowAiInput(!showAiInput)}
            title="Inline AI Assistant (Ctrl+I)"
          >
            <Sparkles size={12} color="var(--accent-primary)" />
            <span>AI Edit</span>
          </button>
        )}
      </div>

      {/* Inline AI Edit Prompt Bar */}
      {showAiInput && (
        <form
          onSubmit={handleAiSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-accent)',
          }}
        >
          <Sparkles size={14} color="var(--accent-primary)" />
          <input
            type="text"
            className="input-text"
            style={{ flex: 1 }}
            placeholder="Ask AI to refactor, write doc comments, or generate functions for this file..."
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Generate
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAiInput(false)}
          >
            Cancel
          </button>
        </form>
      )}

      {/* Editor Main Content */}
      <div className="editor-container">
        {activeTab ? (
          <Editor
            height="100%"
            theme="vs-dark"
            language={getMonacoLanguage(activeTab.path)}
            value={activeTab.content}
            onChange={(val) => onContentChange(val || '')}
            options={{
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              fontSize: 13,
              lineHeight: 20,
              minimap: { enabled: true },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              renderWhitespace: 'selection',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              tabSize: 4,
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              gap: '12px',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 512 512" fill="none" opacity={0.3}>
              <polygon
                points="256,96 384,170 384,318 256,392 128,318 128,170"
                stroke="#6366f1"
                strokeWidth="24"
              />
              <polygon
                points="256,150 330,290 182,290"
                stroke="#06b6d4"
                strokeWidth="24"
                strokeLinejoin="round"
              />
            </svg>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>No File Open</div>
            <div style={{ fontSize: '12px' }}>
              Press <kbd style={{ background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: 4 }}>Ctrl+P</kbd> to quick open or choose from the Explorer.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
