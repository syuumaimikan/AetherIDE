import React, { useState, useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { OpenFileTab } from '../types';
import {
  Sparkles,
  X,
  Zap,
  Check,
  RotateCcw,
  Bot,
  Send,
  Sliders,
  FileCode,
  ChevronRight,
  Folder,
  Code2,
  SplitSquareVertical,
  Maximize2,
  BookOpen,
  Eye,
} from 'lucide-react';
import { TauriBridge } from '../services/tauriBridge';

interface EditorAreaProps {
  openTabs: OpenFileTab[];
  activeTabIndex: number;
  targetLine?: { line: number; timestamp: number } | null;
  onSelectTab: (index: number) => void;
  onCloseTab: (index: number) => void;
  onCloseOtherTabs?: (index: number) => void;
  onCloseRightTabs?: (index: number) => void;
  onCloseAllTabs?: () => void;
  onContentChange: (newContent: string) => void;
  onSave: () => void;
  onAiInlineEdit: (instruction: string) => void;
  onOpenFolder?: () => void;
  onOpenCommandCenter?: () => void;
  onCursorChange?: (pos: { line: number; col: number }) => void;
}

// Markdown Preview Component
const MarkdownPreviewView: React.FC<{ content: string; title: string; onEditClick?: () => void }> = ({
  content,
  title,
  onEditClick,
}) => {
  const [copied, setCopied] = useState(false);
  const lines = content.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--vscode-bg-editor)',
        color: 'var(--vscode-text)',
      }}
    >
      {/* Markdown Preview Header Toolbar */}
      <div
        style={{
          height: '28px',
          background: 'var(--vscode-bg-titlebar)',
          borderBottom: '1px solid var(--vscode-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          fontSize: '11px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Eye size={12} color="var(--vscode-blue)" />
          <span style={{ fontWeight: 600, color: 'var(--vscode-blue)' }}>プレビュー: {title}</span>
          <span style={{ color: 'var(--vscode-text-muted)' }}>({lines.length} 行)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleCopy}
            style={{ fontSize: '10px', padding: '1px 6px' }}
          >
            {copied ? 'コピー済み' : 'マークダウンをコピー'}
          </button>
          {onEditClick && (
            <button
              className="btn btn-primary btn-sm"
              onClick={onEditClick}
              style={{ fontSize: '10px', padding: '1px 6px', background: 'var(--vscode-blue)' }}
            >
              ソースコードを編集
            </button>
          )}
        </div>
      </div>

      {/* Markdown Body */}
      <div
        style={{
          padding: '24px 36px',
          overflowY: 'auto',
          flex: 1,
          fontSize: '13px',
          lineHeight: '1.7',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('# ')) {
            return (
              <h1
                key={idx}
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#ffffff',
                  borderBottom: '1px solid var(--vscode-border)',
                  paddingBottom: '6px',
                  margin: '18px 0 12px',
                }}
              >
                {trimmed.slice(2)}
              </h1>
            );
          } else if (trimmed.startsWith('## ')) {
            return (
              <h2
                key={idx}
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#ffffff',
                  borderBottom: '1px solid var(--vscode-border)',
                  paddingBottom: '4px',
                  margin: '16px 0 8px',
                }}
              >
                {trimmed.slice(3)}
              </h2>
            );
          } else if (trimmed.startsWith('### ')) {
            return (
              <h3
                key={idx}
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--vscode-blue)',
                  margin: '14px 0 6px',
                }}
              >
                {trimmed.slice(4)}
              </h3>
            );
          } else if (trimmed.startsWith('> [!NOTE]') || trimmed.startsWith('> [!TIP]')) {
            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(0, 120, 212, 0.12)',
                  borderLeft: '3px solid var(--vscode-blue)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  margin: '8px 0',
                  fontSize: '12px',
                }}
              >
                {trimmed}
              </div>
            );
          } else if (trimmed.startsWith('> [!WARNING]') || trimmed.startsWith('> [!CAUTION]')) {
            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(244, 63, 94, 0.12)',
                  borderLeft: '3px solid #f43f5e',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  margin: '8px 0',
                  fontSize: '12px',
                }}
              >
                {trimmed}
              </div>
            );
          } else if (trimmed.startsWith('> ')) {
            return (
              <blockquote
                key={idx}
                style={{
                  borderLeft: '3px solid var(--vscode-border)',
                  paddingLeft: '12px',
                  margin: '6px 0',
                  color: 'var(--vscode-text-secondary)',
                  fontStyle: 'italic',
                }}
              >
                {trimmed.slice(2)}
              </blockquote>
            );
          } else if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ')) {
            const isDone = trimmed.startsWith('- [x] ');
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '4px 0',
                  fontSize: '12px',
                }}
              >
                <input type="checkbox" checked={isDone} readOnly style={{ accentColor: 'var(--vscode-blue)' }} />
                <span
                  style={{
                    textDecoration: isDone ? 'line-through' : 'none',
                    color: isDone ? 'var(--vscode-text-muted)' : 'inherit',
                  }}
                >
                  {trimmed.slice(6)}
                </span>
              </div>
            );
          } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <li key={idx} style={{ marginLeft: '20px', margin: '3px 0' }}>
                {trimmed.slice(2)}
              </li>
            );
          } else if (trimmed.startsWith('```')) {
            return (
              <div
                key={idx}
                style={{
                  background: 'var(--vscode-bg-surface)',
                  border: '1px solid var(--vscode-border)',
                  borderRadius: '4px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  color: '#38bdf8',
                  margin: '6px 0',
                }}
              >
                {trimmed}
              </div>
            );
          } else if (trimmed.startsWith('|')) {
            return (
              <div
                key={idx}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  background: 'rgba(255,255,255,0.02)',
                  padding: '2px 6px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                {trimmed}
              </div>
            );
          } else if (trimmed === '') {
            return <div key={idx} style={{ height: '8px' }} />;
          }
          return <p key={idx} style={{ margin: '4px 0', color: 'var(--vscode-text)' }}>{line}</p>;
        })}
      </div>
    </div>
  );
};

export const EditorArea: React.FC<EditorAreaProps> = ({
  openTabs,
  activeTabIndex,
  targetLine,
  onSelectTab,
  onCloseTab,
  onCloseOtherTabs,
  onCloseRightTabs,
  onCloseAllTabs,
  onContentChange,
  onSave,
  onAiInlineEdit,
  onOpenFolder,
  onOpenCommandCenter,
  onCursorChange,
}) => {
  const [showAiFloatingBar, setShowAiFloatingBar] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-3-7-sonnet');
  const [isGenerating, setIsGenerating] = useState(false);
  const [inlineAiEnabled, setInlineAiEnabled] = useState(true);
  const [pendingDiff, setPendingDiff] = useState<{ original: string; modified: string } | null>(null);

  // Split & Preview View State
  const [isSplitView, setIsSplitView] = useState(false);
  const [splitTabIndex, setSplitTabIndex] = useState<number>(0);
  const [isMarkdownPreview, setIsMarkdownPreview] = useState(false);
  const [secondaryPreview, setSecondaryPreview] = useState(false);
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number; tabIndex: number } | null>(null);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const providerDisposableRef = useRef<any>(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setTabContextMenu(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const activeTab = openTabs[activeTabIndex];
  const secondaryTab = openTabs[splitTabIndex] || activeTab;

  useEffect(() => {
    if (targetLine && editorRef.current) {
      editorRef.current.revealLineInCenter(targetLine.line);
      editorRef.current.setPosition({ lineNumber: targetLine.line, column: 1 });
      editorRef.current.focus();
    }
  }, [targetLine]);

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

    // Track cursor changes for Status Bar
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({ line: e.position.lineNumber, col: e.position.column });
    });

    // Ctrl+I shortcut inside Monaco
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      setShowAiFloatingBar((prev) => !prev);
    });

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

  const handleFloatingAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInstruction.trim() || !activeTab) return;

    setIsGenerating(true);
    try {
      const prompt = `[File: ${activeTab.path}]\n\`\`\`${activeTab.language}\n${activeTab.content}\n\`\`\`\n\nInstruction: ${aiInstruction.trim()}`;
      const response = await TauriBridge.runAiCompletion(prompt, selectedModel);

      // Extract code block or response
      let code = response;
      const match = response.match(/```(?:\w+)?\s*([\s\S]*?)```/);
      if (match) {
        code = match[1];
      }

      setPendingDiff({
        original: activeTab.content,
        modified: code,
      });
      setShowAiFloatingBar(false);
    } catch (err) {
      console.error('AI Inline generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptDiff = () => {
    if (pendingDiff) {
      onContentChange(pendingDiff.modified);
      setPendingDiff(null);
    }
  };

  const handleRejectDiff = () => {
    setPendingDiff(null);
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
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setTabContextMenu({ x: e.clientX, y: e.clientY, tabIndex: idx });
            }}
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

        {/* Tab Context Menu Popup */}
        {tabContextMenu && (
          <div
            style={{
              position: 'fixed',
              top: tabContextMenu.y,
              left: tabContextMenu.x,
              background: 'var(--vscode-bg-surface)',
              border: '1px solid var(--vscode-border)',
              borderRadius: '6px',
              padding: '4px 0',
              minWidth: '190px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              zIndex: 9999,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="menu-entry"
              style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
              onClick={() => {
                onCloseTab(tabContextMenu.tabIndex);
                setTabContextMenu(null);
              }}
            >
              タブを閉じる (Close)
            </div>
            <div
              className="menu-entry"
              style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
              onClick={() => {
                onCloseOtherTabs?.(tabContextMenu.tabIndex);
                setTabContextMenu(null);
              }}
            >
              他のタブを閉じる (Close Others)
            </div>
            <div
              className="menu-entry"
              style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
              onClick={() => {
                onCloseRightTabs?.(tabContextMenu.tabIndex);
                setTabContextMenu(null);
              }}
            >
              右側のタブを閉じる (Close to Right)
            </div>
            <div
              className="menu-entry"
              style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
              onClick={() => {
                onCloseAllTabs?.();
                setTabContextMenu(null);
              }}
            >
              すべてのタブを閉じる (Close All)
            </div>
            <div style={{ height: '1px', background: 'var(--vscode-border)', margin: '4px 0' }} />
            <div
              className="menu-entry"
              style={{ padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
              onClick={() => {
                const tab = openTabs[tabContextMenu.tabIndex];
                if (tab) navigator.clipboard.writeText(tab.path);
                setTabContextMenu(null);
              }}
            >
              パスをコピー (Copy Path)
            </div>
          </div>
        )}

        {openTabs.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', paddingRight: '8px' }}>
            {activeTab && (activeTab.path.toLowerCase().endsWith('.md') || activeTab.path.toLowerCase().endsWith('.markdown')) && (
              <button
                className={`btn btn-sm ${isMarkdownPreview ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsMarkdownPreview(!isMarkdownPreview)}
                title="マークダウン プレビュー切替"
                style={{ fontSize: '11px', padding: '2px 8px' }}
              >
                <BookOpen size={12} color={isMarkdownPreview ? '#ffffff' : 'var(--vscode-blue)'} />
                <span>{isMarkdownPreview ? 'ソースコード' : 'プレビュー'}</span>
              </button>
            )}
            <button
              className={`btn btn-sm ${isSplitView ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setIsSplitView(!isSplitView)}
              title="エディターを左右に分割 (Split Editor Right)"
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              <SplitSquareVertical size={12} color={isSplitView ? '#ffffff' : 'var(--vscode-blue)'} />
              <span>{isSplitView ? '1画面に戻す' : '分割 (Split)'}</span>
            </button>
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
              className={`btn btn-sm ${showAiFloatingBar ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowAiFloatingBar(!showAiFloatingBar)}
              title="Cursor風 インライン AI 編集 (Ctrl+I)"
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              <Sparkles size={11} color="var(--vscode-blue)" />
              <span>AI Edit (Ctrl+I)</span>
            </button>
          </div>
        )}
      </div>

      {/* Cursor-style Floating Inline AI Prompt Bar */}
      {showAiFloatingBar && (
        <div
          style={{
            position: 'absolute',
            top: '45px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            width: '560px',
            maxWidth: '90%',
            background: 'var(--vscode-bg-surface)',
            border: '1px solid var(--vscode-blue)',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--vscode-blue)' }}>
              <Sparkles size={14} />
              <span>Inline Code Assistant</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  fontSize: '11px',
                  background: 'var(--vscode-bg-input)',
                  border: '1px solid var(--vscode-border)',
                  color: 'var(--vscode-text)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="deepseek-r1">DeepSeek-R1</option>
                <option value="ollama-llama-3-3">Ollama Local</option>
              </select>
              <button
                className="tab-close-btn"
                onClick={() => setShowAiFloatingBar(false)}
                title="閉じる (Esc)"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          <form onSubmit={handleFloatingAiSubmit} style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              className="input-text"
              style={{
                flex: 1,
                background: 'var(--vscode-bg-input)',
                border: '1px solid var(--vscode-border)',
                color: '#ffffff',
                fontSize: '12px',
                padding: '6px 10px',
              }}
              placeholder="指示を入力 (例: エラーハンドリングを追加、型ガードを記述、テストを追加)..."
              value={aiInstruction}
              onChange={(e) => setAiInstruction(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              disabled={isGenerating || !aiInstruction.trim()}
              className="btn btn-primary btn-sm"
              style={{ background: 'var(--vscode-blue)', padding: '6px 12px' }}
            >
              {isGenerating ? '生成中...' : '生成'}
            </button>
          </form>
        </div>
      )}

      {/* Pending Diff Acceptance Bar */}
      {pendingDiff && (
        <div
          style={{
            background: 'var(--vscode-bg-surface)',
            borderBottom: '1px solid var(--vscode-blue)',
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 90,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--vscode-blue)', fontWeight: 600 }}>AI コードパッチ生成完了</span>
            <span style={{ color: 'var(--vscode-text-muted)', fontSize: '11px' }}>
              差分をプレビュー中。変更を採用しますか？
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAcceptDiff}
              style={{ background: '#81b88b', color: '#181818', fontWeight: 600 }}
              title="変更を採用 (Ctrl+Enter)"
            >
              <Check size={12} />
              <span>採用 (Accept)</span>
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleRejectDiff}
              title="変更を破棄 (Esc)"
            >
              <RotateCcw size={12} />
              <span>破棄 (Reject)</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor Content or VS Code Watermark Welcome Screen */}
      <div className="editor-container" style={{ display: 'flex', flexDirection: 'column' }}>
        {activeTab ? (
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Primary Left Editor Pane */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: isSplitView ? '1px solid var(--vscode-border)' : 'none', overflow: 'hidden' }}>
              {/* VS Code Breadcrumbs Bar */}
              <div
                style={{
                  height: '24px',
                  background: 'var(--vscode-bg-editor)',
                  borderBottom: '1px solid var(--vscode-border)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontSize: '11px',
                  color: 'var(--vscode-text-muted)',
                  gap: '4px',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {activeTab.path
                  .split(/[\\/]/)
                  .filter(Boolean)
                  .map((segment, idx, arr) => {
                    const isLast = idx === arr.length - 1;
                    return (
                      <React.Fragment key={idx}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            color: isLast ? '#ffffff' : 'var(--vscode-text-secondary)',
                            padding: '1px 3px',
                            borderRadius: '3px',
                          }}
                          className="breadcrumb-item"
                          title={segment}
                        >
                          {isLast ? (
                            <FileCode size={12} color="var(--vscode-blue)" />
                          ) : (
                            <Folder size={12} color="#dcb67a" />
                          )}
                          <span>{segment}</span>
                        </div>
                        {!isLast && <ChevronRight size={10} color="var(--vscode-text-muted)" opacity={0.6} />}
                      </React.Fragment>
                    );
                  })}
              </div>

              {isMarkdownPreview && (activeTab.path.toLowerCase().endsWith('.md') || activeTab.path.toLowerCase().endsWith('.markdown')) ? (
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  <MarkdownPreviewView
                    content={activeTab.content}
                    title={activeTab.name}
                    onEditClick={() => setIsMarkdownPreview(false)}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={getMonacoLanguage(activeTab.path)}
                    value={pendingDiff ? pendingDiff.modified : activeTab.content}
                    onChange={(val) => {
                      if (!pendingDiff) {
                        onContentChange(val || '');
                      }
                    }}
                    onMount={handleEditorDidMount}
                    options={{
                      fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
                      fontSize: 13,
                      lineHeight: 20,
                      minimap: { enabled: !isSplitView, side: 'right' },
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
                </div>
              )}
            </div>

            {/* Secondary Right Editor Pane (When Split) */}
            {isSplitView && secondaryTab && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Secondary Tab Switcher & Breadcrumbs */}
                <div
                  style={{
                    height: '24px',
                    background: 'var(--vscode-bg-titlebar)',
                    borderBottom: '1px solid var(--vscode-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 8px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCode size={12} color="#38bdf8" />
                    <select
                      value={splitTabIndex}
                      onChange={(e) => setSplitTabIndex(parseInt(e.target.value))}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ffffff',
                        fontSize: '11px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {openTabs.map((t, idx) => (
                        <option key={t.path} value={idx} style={{ background: 'var(--vscode-bg-surface)' }}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {(secondaryTab.path.toLowerCase().endsWith('.md') || secondaryTab.path.toLowerCase().endsWith('.markdown')) && (
                      <button
                        className={`btn btn-sm ${secondaryPreview ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSecondaryPreview(!secondaryPreview)}
                        title="マークダウン プレビュー切替"
                        style={{ fontSize: '10px', padding: '1px 6px' }}
                      >
                        <BookOpen size={10} color={secondaryPreview ? '#ffffff' : 'var(--vscode-blue)'} />
                        <span>{secondaryPreview ? 'コード' : 'プレビュー'}</span>
                      </button>
                    )}
                    <button
                      className="tab-close-btn"
                      onClick={() => setIsSplitView(false)}
                      title="分割を閉じる"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  {secondaryPreview && (secondaryTab.path.toLowerCase().endsWith('.md') || secondaryTab.path.toLowerCase().endsWith('.markdown')) ? (
                    <MarkdownPreviewView
                      content={secondaryTab.content}
                      title={secondaryTab.name}
                      onEditClick={() => setSecondaryPreview(false)}
                    />
                  ) : (
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      language={getMonacoLanguage(secondaryTab.path)}
                      value={secondaryTab.content}
                      options={{
                        fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
                        fontSize: 13,
                        lineHeight: 20,
                        minimap: { enabled: false },
                        smoothScrolling: true,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        tabSize: 4,
                        readOnly: false,
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
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
