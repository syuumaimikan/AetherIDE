import React, { useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { OpenFileTab } from '../types';
import { Sparkles, X, Zap } from 'lucide-react';

interface EditorAreaProps {
  openTabs: OpenFileTab[];
  activeTabIndex: number;
  onSelectTab: (index: number) => void;
  onCloseTab: (index: number) => void;
  onContentChange: (newContent: string) => void;
  onSave: () => void;
  onAiInlineEdit: (instruction: string) => void;
  onOpenFolder?: () => void;
  onOpenCommandCenter?: () => void;
}

export const EditorArea: React.FC<EditorAreaProps> = ({
  openTabs,
  activeTabIndex,
  onSelectTab,
  onCloseTab,
  onContentChange,
  onSave,
  onAiInlineEdit,
  onOpenFolder,
  onOpenCommandCenter,
}) => {
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [inlineAiEnabled, setInlineAiEnabled] = useState(true);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const providerDisposableRef = useRef<any>(null);

  const activeTab = openTabs[activeTabIndex];

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInstruction.trim()) return;
    onAiInlineEdit(aiInstruction.trim());
    setAiInstruction('');
    setShowAiInput(false);
  };

  const getMonacoLanguage = (path: string): string => {
    const p = path.toLowerCase();
    if (p.endsWith('.rs')) return 'rust';
    if (p.endsWith('.ts') || p.endsWith('.tsx')) return 'typescript';
    if (p.endsWith('.js') || p.endsWith('.jsx')) return 'javascript';
    if (p.endsWith('.json')) return 'json';
    if (p.endsWith('.toml')) return 'ini';
    if (p.endsWith('.md')) return 'markdown';
    if (p.endsWith('.py')) return 'python';
    if (p.endsWith('.html')) return 'html';
    if (p.endsWith('.css')) return 'css';
    return 'plaintext';
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    if (providerDisposableRef.current) {
      providerDisposableRef.current.dispose();
    }

    const supportedLanguages = ['rust', 'typescript', 'javascript', 'python', 'json', 'markdown', 'plaintext'];

    providerDisposableRef.current = monaco.languages.registerInlineCompletionsProvider(
      supportedLanguages,
      {
        provideInlineCompletions: async (model, position) => {
          if (!inlineAiEnabled) return { items: [] };

          const lineContent = model.getLineContent(position.lineNumber);
          const prefix = lineContent.substring(0, position.column - 1).trim();

          if (!prefix || prefix.length < 2) return { items: [] };

          let suggestion = '';
          const lang = model.getLanguageId();

          if (lang === 'rust') {
            if (prefix.endsWith('fn main()')) {
              suggestion = ' {\n    println!("Hello from AETHER IDE!");\n}';
            } else if (prefix.startsWith('pub async fn') && !prefix.endsWith('{')) {
              suggestion = ' -> Result<(), AetherError> {\n    Ok(())\n}';
            } else if (prefix.startsWith('pub fn') && !prefix.endsWith('{')) {
              suggestion = ' -> Self {\n    Self::default()\n}';
            } else if (prefix.endsWith('impl')) {
              suggestion = ' Default for State {\n    fn default() -> Self { Self {} }\n}';
            } else if (prefix.endsWith('match')) {
              suggestion = ' result {\n    Ok(val) => val,\n    Err(e) => return Err(e.into()),\n}';
            } else if (prefix.endsWith('struct') && !prefix.includes('{')) {
              suggestion = ' {\n    pub id: String,\n    pub name: String,\n}';
            }
          } else if (lang === 'typescript' || lang === 'javascript') {
            if (prefix.startsWith('export const') && prefix.includes('=') && !prefix.endsWith('=>')) {
              suggestion = ' () => {\n  return <div>Component</div>;\n};';
            } else if (prefix.startsWith('interface') && !prefix.endsWith('{')) {
              suggestion = ' {\n  id: string;\n  name: string;\n  createdAt: string;\n}';
            }
          }

          if (suggestion) {
            return {
              items: [
                {
                  insertText: suggestion,
                  range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                  ),
                },
              ],
            };
          }

          return { items: [] };
        },
        freeInlineCompletions: () => {},
      }
    );
  };

  return (
    <div className="editor-workspace">
      {/* VS Code Tab Bar */}
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
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
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
              <X size={13} />
            </button>
          </div>
        ))}

        {openTabs.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '8px' }}>
            <button
              className={`btn btn-sm ${inlineAiEnabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setInlineAiEnabled(!inlineAiEnabled)}
              title={inlineAiEnabled ? 'Ghost AI: ON (Tabで確定)' : 'Ghost AI: OFF'}
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              <Zap size={11} color={inlineAiEnabled ? '#ffffff' : 'var(--vscode-text-muted)'} />
              <span>Ghost AI: {inlineAiEnabled ? 'ON' : 'OFF'}</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAiInput(!showAiInput)}
              title="Inline AI Assistant (Ctrl+I)"
            >
              <Sparkles size={12} color="var(--vscode-blue)" />
              <span>AI Edit</span>
            </button>
          </div>
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
            background: 'var(--vscode-bg-surface)',
            borderBottom: '1px solid var(--vscode-blue)',
          }}
        >
          <Sparkles size={14} color="var(--vscode-blue)" />
          <input
            type="text"
            className="input-text"
            style={{
              flex: 1,
              background: 'var(--vscode-bg-input)',
              border: '1px solid var(--vscode-border)',
              color: '#ffffff',
              fontSize: '12px',
            }}
            placeholder="AIにリファクタリングやコード生成を依頼 (例: ドキュメントコメントを追加して)..."
            value={aiInstruction}
            onChange={(e) => setAiInstruction(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn-primary btn-sm">
            生成
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAiInput(false)}
          >
            キャンセル
          </button>
        </form>
      )}

      {/* Editor Content or VS Code Watermark Welcome Screen */}
      <div className="editor-container">
        {activeTab ? (
          <>
            <Editor
              height="100%"
              theme="vs-dark"
              language={getMonacoLanguage(activeTab.path)}
              value={activeTab.content}
              onChange={(val) => onContentChange(val || '')}
              onMount={handleEditorDidMount}
              options={{
                fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
                fontSize: 13,
                lineHeight: 20,
                minimap: { enabled: true, side: 'right' },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderWhitespace: 'selection',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                tabSize: 4,
                inlineSuggest: {
                  enabled: inlineAiEnabled,
                  mode: 'subwordSmart',
                },
              }}
            />

            {inlineAiEnabled && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 10,
                  right: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(30, 30, 30, 0.9)',
                  border: '1px solid rgba(0, 120, 212, 0.4)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: 'var(--vscode-text-secondary)',
                  zIndex: 20,
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#81b88b',
                  }}
                />
                <span>Tabキーで補完確定</span>
              </div>
            )}
          </>
        ) : (
          /* VS Code Authentic Watermark Welcome Screen */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--vscode-text-muted)',
              gap: '28px',
              userSelect: 'none',
            }}
          >
            {/* VS Code Large Watermark Ribbon */}
            <div style={{ opacity: 0.06, marginBottom: '-10px' }}>
              <svg width="180" height="180" viewBox="0 0 100 100" fill="none">
                <path
                  d="M71.2 97.4L96.8 84.8C98.8 83.8 100 81.8 100 79.5V20.5C100 18.2 98.8 16.2 96.8 15.2L71.2 2.6C69.6 1.8 67.7 2.1 66.4 3.3L28.1 38.3L11.7 25.8C10.5 24.9 8.9 24.8 7.6 25.6L1.5 29.4C0.6 30 0 31 0 32.1C0 33.2 0.6 34.2 1.5 34.8L20.2 49.2L1.5 63.6C0.6 64.2 0 65.2 0 66.3C0 67.4 0.6 68.4 1.5 69L7.6 72.8C8.9 73.6 10.5 73.5 11.7 72.6L28.1 60.1L66.4 95.1C67.7 96.3 69.6 96.6 71.2 97.4Z"
                  fill="#ffffff"
                />
              </svg>
            </div>

            {/* Shortcut Guide matching VS Code Japanese UI */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                fontSize: '13px',
                minWidth: '340px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
                onClick={onOpenCommandCenter}
              >
                <span style={{ color: 'var(--vscode-text-secondary)' }}>チャットを開く</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 3, fontSize: '11px' }}>Ctrl</kbd>
                  <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 3, fontSize: '11px' }}>Alt</kbd>
                  <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 3, fontSize: '11px' }}>I</kbd>
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
                onClick={onOpenCommandCenter}
              >
                <span style={{ color: 'var(--vscode-text-secondary)' }}>すべてのコマンドの表示</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 3, fontSize: '11px' }}>Ctrl</kbd>
                  <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 3, fontSize: '11px' }}>Shift</kbd>
                  <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 3, fontSize: '11px' }}>P</kbd>
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
                onClick={onOpenFolder}
              >
                <span style={{ color: 'var(--vscode-text-secondary)' }}>フォルダーを開く</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 3, fontSize: '11px' }}>Ctrl</kbd>
                  <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 3, fontSize: '11px' }}>K</kbd>
                  <span style={{ opacity: 0.5 }}>+</span>
                  <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 3, fontSize: '11px' }}>Ctrl</kbd>
                  <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 3, fontSize: '11px' }}>O</kbd>
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                <span style={{ color: 'var(--vscode-text-secondary)' }}>デバッグの開始</span>
                <span>
                  <kbd style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 3, fontSize: '11px' }}>F5</kbd>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
