import React, { useState, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { OpenFileTab } from '../types';
import { Sparkles, X, Zap, Check, Eye } from 'lucide-react';
import { TauriBridge } from '../services/tauriBridge';

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
  const [inlineAiEnabled, setInlineAiEnabled] = useState(true);
  const [lastSuggestedText, setLastSuggestedText] = useState<string | null>(null);

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

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register Inline Completion Provider for smart ghost text (Cursor / Copilot experience)
    if (providerDisposableRef.current) {
      providerDisposableRef.current.dispose();
    }

    const supportedLanguages = ['rust', 'typescript', 'javascript', 'python', 'json', 'markdown', 'plaintext'];

    providerDisposableRef.current = monaco.languages.registerInlineCompletionsProvider(
      supportedLanguages,
      {
        provideInlineCompletions: async (model, position) => {
          if (!inlineAiEnabled) {
            return { items: [] };
          }

          const lineContent = model.getLineContent(position.lineNumber);
          const prefix = lineContent.substring(0, position.column - 1).trim();

          // Don't trigger on completely blank lines or when line is empty
          if (!prefix || prefix.length < 2) {
            return { items: [] };
          }

          // Contextual heuristic generator for instant zero-latency ghost text
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
            } else if (prefix.includes('// TODO')) {
              suggestion = ' implement non-blocking lock-free event queue';
            }
          } else if (lang === 'typescript' || lang === 'javascript') {
            if (prefix.startsWith('export const') && prefix.includes('=') && !prefix.endsWith('=>')) {
              suggestion = ' () => {\n  return <div>Component</div>;\n};';
            } else if (prefix.startsWith('interface') && !prefix.endsWith('{')) {
              suggestion = ' {\n  id: string;\n  name: string;\n  createdAt: string;\n}';
            } else if (prefix.startsWith('useEffect(')) {
              suggestion = '() => {\n    // Auto-subscribe\n  }, []);';
            } else if (prefix.includes('// TODO')) {
              suggestion = ' add reactive stream subscriber and error boundary';
            }
          } else if (lang === 'python') {
            if (prefix.startsWith('def') && prefix.endsWith(':')) {
              suggestion = '\n    """Aether Autonomous Agent Handler."""\n    pass';
            } else if (prefix.startsWith('class') && prefix.endsWith(':')) {
              suggestion = '\n    def __init__(self):\n        super().__init__()';
            }
          }

          if (suggestion) {
            setLastSuggestedText(suggestion.split('\n')[0]);
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
        freeInlineCompletions: () => {
          setLastSuggestedText(null);
        },
      }
    );
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
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
            <button
              className={`btn btn-sm ${inlineAiEnabled ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setInlineAiEnabled(!inlineAiEnabled)}
              title={inlineAiEnabled ? 'Inline Ghost Text: Enabled (Press Tab to accept)' : 'Inline Ghost Text: Disabled'}
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              <Zap size={11} color={inlineAiEnabled ? '#fff' : 'var(--text-muted)'} />
              <span>Ghost AI: {inlineAiEnabled ? 'ON' : 'OFF'}</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAiInput(!showAiInput)}
              title="Inline AI Assistant (Ctrl+I)"
            >
              <Sparkles size={12} color="var(--accent-primary)" />
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
      <div className="editor-container" style={{ position: 'relative' }}>
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
                inlineSuggest: {
                  enabled: inlineAiEnabled,
                  mode: 'subwordSmart',
                  showToolbar: 'always',
                },
                suggest: {
                  preview: true,
                  showStatusBar: true,
                },
              }}
            />

            {/* Subtle Inline AI Status Tag in Editor bottom-right */}
            {inlineAiEnabled && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 24,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(17, 19, 24, 0.85)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  color: 'var(--text-secondary)',
                  zIndex: 20,
                  pointerEvents: 'none',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-emerald)',
                    boxShadow: '0 0 6px var(--accent-emerald)',
                  }}
                />
                <span>Tab to Accept Suggestion</span>
              </div>
            )}
          </>
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
