import React, { useState, useEffect } from 'react';
import { FileNode } from '../types';
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  RefreshCw,
  MinusSquare,
  Lock,
  Settings,
  GitBranch,
  FolderTree,
  Copy,
  Trash2,
  Edit2,
  ExternalLink,
  Filter,
  FolderArchive,
  Search,
  X,
} from 'lucide-react';

interface FileExplorerProps {
  rootNode: FileNode | null;
  workspaceName?: string;
  activeFilePath?: string;
  activeFileContent?: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (parentPath: string, name: string) => void;
  onCreateFolder: (parentPath: string, name: string) => void;
  onDeletePath: (path: string) => void;
  onRefresh: () => void;
  onOpenFolder?: () => void;
  onJumpToLine?: (line: number) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  node: FileNode;
}

interface OutlineSymbol {
  name: string;
  kind: 'function' | 'struct' | 'interface' | 'variable' | 'class';
  line: number;
}

function extractSymbols(content?: string): OutlineSymbol[] {
  if (!content) return [];
  const lines = content.split('\n');
  const symbols: OutlineSymbol[] = [];

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*')) return;

    // Rust
    if (
      trimmed.startsWith('fn ') ||
      trimmed.startsWith('pub fn ') ||
      trimmed.startsWith('async fn ') ||
      trimmed.startsWith('pub async fn ')
    ) {
      const match = trimmed.match(/(?:pub\s+)?(?:async\s+)?fn\s+([a-zA-Z0-9_]+)/);
      if (match) symbols.push({ name: match[1], kind: 'function', line: lineNum });
    } else if (trimmed.startsWith('struct ') || trimmed.startsWith('pub struct ')) {
      const match = trimmed.match(/(?:pub\s+)?struct\s+([a-zA-Z0-9_]+)/);
      if (match) symbols.push({ name: match[1], kind: 'struct', line: lineNum });
    } else if (trimmed.startsWith('enum ') || trimmed.startsWith('pub enum ')) {
      const match = trimmed.match(/(?:pub\s+)?enum\s+([a-zA-Z0-9_]+)/);
      if (match) symbols.push({ name: match[1], kind: 'struct', line: lineNum });
    } else if (trimmed.startsWith('impl ') || trimmed.startsWith('impl<')) {
      const match = trimmed.match(/impl(?:<[^>]+>)?\s+([a-zA-Z0-9_]+)/);
      if (match) symbols.push({ name: `impl ${match[1]}`, kind: 'struct', line: lineNum });
    }
    // TypeScript / JavaScript
    else if (trimmed.startsWith('export const ') || trimmed.startsWith('const ')) {
      const match = trimmed.match(/(?:export\s+)?const\s+([a-zA-Z0-9_]+)/);
      if (match) symbols.push({ name: match[1], kind: 'variable', line: lineNum });
    } else if (trimmed.startsWith('export function ') || trimmed.startsWith('function ')) {
      const match = trimmed.match(/(?:export\s+)?function\s+([a-zA-Z0-9_]+)/);
      if (match) symbols.push({ name: match[1], kind: 'function', line: lineNum });
    } else if (trimmed.startsWith('export interface ') || trimmed.startsWith('interface ')) {
      const match = trimmed.match(/(?:export\s+)?interface\s+([a-zA-Z0-9_]+)/);
      if (match) symbols.push({ name: match[1], kind: 'interface', line: lineNum });
    } else if (trimmed.startsWith('export class ') || trimmed.startsWith('class ')) {
      const match = trimmed.match(/(?:export\s+)?class\s+([a-zA-Z0-9_]+)/);
      if (match) symbols.push({ name: match[1], kind: 'class', line: lineNum });
    }
  });

  return symbols;
}

const FileTreeNode: React.FC<{
  node: FileNode;
  depth: number;
  activeFilePath?: string;
  onSelectFile: (path: string) => void;
  onDeletePath: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}> = ({ node, depth, activeFilePath, onSelectFile, onDeletePath, onContextMenu }) => {
  const [isOpen, setIsOpen] = useState(true);

  const getFileIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.rs')) {
      return <FileCode size={14} color="#e44d26" />;
    }
    if (lower.endsWith('.ts') || lower.endsWith('.tsx')) {
      return <FileCode size={14} color="#3178c6" />;
    }
    if (lower.endsWith('.js') || lower.endsWith('.jsx')) {
      return <FileCode size={14} color="#f7df1e" />;
    }
    if (lower.endsWith('.md')) {
      return <FileText size={14} color="#42a5f5" />;
    }
    if (lower.endsWith('.toml')) {
      return <Settings size={14} color="#4ec9b0" />;
    }
    if (lower.endsWith('.json')) {
      return <FileText size={14} color="#facc15" />;
    }
    if (lower.endsWith('.lock')) {
      return <Lock size={13} color="#d7ba7d" />;
    }
    if (lower.includes('gitignore')) {
      return <GitBranch size={14} color="#f44336" />;
    }
    return <FileText size={14} color="#9d9d9d" />;
  };

  const isSelected = activeFilePath === node.path;

  if (node.is_dir) {
    return (
      <div>
        <div
          className={`tree-node ${isSelected ? 'selected' : ''}`}
          style={{
            paddingLeft: `${depth * 14 + 10}px`,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '13px',
            height: '24px',
            cursor: 'pointer',
            color: 'var(--vscode-text)',
          }}
          onClick={() => setIsOpen(!isOpen)}
          onContextMenu={(e) => onContextMenu(e, node)}
        >
          <span style={{ display: 'inline-flex', opacity: 0.8 }}>
            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
          <span style={{ display: 'inline-flex' }}>
            {isOpen ? (
              <FolderOpen size={14} color="#dcb67a" />
            ) : (
              <Folder size={14} color="#dcb67a" />
            )}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </span>
        </div>
        {isOpen && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activeFilePath={activeFilePath}
                onSelectFile={onSelectFile}
                onDeletePath={onDeletePath}
                onContextMenu={onContextMenu}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`tree-node ${isSelected ? 'selected' : ''}`}
      style={{
        paddingLeft: `${depth * 14 + 26}px`,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        height: '24px',
        cursor: 'pointer',
        color: isSelected ? '#ffffff' : 'var(--vscode-text)',
        background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
      }}
      onClick={() => onSelectFile(node.path)}
      onContextMenu={(e) => onContextMenu(e, node)}
    >
      <span style={{ display: 'inline-flex', flexShrink: 0 }}>
        {getFileIcon(node.name)}
      </span>
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: node.name.endsWith('.md') ? '#42a5f5' : 'inherit',
        }}
      >
        {node.name}
      </span>
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  rootNode,
  workspaceName = 'AETHERIDE',
  activeFilePath,
  activeFileContent,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeletePath,
  onRefresh,
  onOpenFolder,
  onJumpToLine,
}) => {
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newPathName, setNewPathName] = useState('');
  const [createParentPath, setCreateParentPath] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filterText, setFilterText] = useState('');

  // Accordion Sections
  const [isFilesOpen, setIsFilesOpen] = useState(true);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  useEffect(() => {
    const handleCloseContext = () => setContextMenu(null);
    window.addEventListener('click', handleCloseContext);
    return () => window.removeEventListener('click', handleCloseContext);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node,
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPathName.trim()) return;
    if (isCreatingFile) {
      onCreateFile(createParentPath, newPathName.trim());
      setIsCreatingFile(false);
    } else if (isCreatingFolder) {
      onCreateFolder(createParentPath, newPathName.trim());
      setIsCreatingFolder(false);
    }
    setNewPathName('');
    setCreateParentPath('');
  };

  const displayName = workspaceName.toUpperCase();
  const symbols = extractSymbols(activeFileContent);

  const getSymbolIcon = (kind: OutlineSymbol['kind']) => {
    switch (kind) {
      case 'function':
        return <span style={{ color: '#a855f7', fontWeight: 'bold', fontSize: '11px' }}>ƒ</span>;
      case 'struct':
      case 'class':
        return <span style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '11px' }}>S</span>;
      case 'interface':
        return <span style={{ color: '#81b88b', fontWeight: 'bold', fontSize: '11px' }}>I</span>;
      case 'variable':
      default:
        return <span style={{ color: '#facc15', fontWeight: 'bold', fontSize: '11px' }}>v</span>;
    }
  };

  return (
    <div className="left-sidebar" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* VS Code Explorer Header */}
      <div className="sidebar-header">
        <span style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>
          エクスプローラー : {displayName}
        </span>
        <div className="sidebar-actions">
          <button
            className="sidebar-action-btn"
            title="新しいファイル..."
            onClick={() => {
              setCreateParentPath('');
              setIsCreatingFile(true);
              setIsCreatingFolder(false);
            }}
          >
            <FilePlus size={14} />
          </button>
          <button
            className="sidebar-action-btn"
            title="新しいフォルダー..."
            onClick={() => {
              setCreateParentPath('');
              setIsCreatingFolder(true);
              setIsCreatingFile(false);
            }}
          >
            <FolderPlus size={14} />
          </button>
          <button
            className="sidebar-action-btn"
            title="エクスプローラーの更新"
            onClick={onRefresh}
          >
            <RefreshCw size={13} />
          </button>
          <button
            className="sidebar-action-btn"
            title={isFilterVisible ? 'フィルターを閉じる' : 'ファイル名でフィルター'}
            onClick={() => {
              setIsFilterVisible(!isFilterVisible);
              if (isFilterVisible) setFilterText('');
            }}
          >
            <Filter size={13} color={isFilterVisible ? 'var(--vscode-blue)' : 'inherit'} />
          </button>
        </div>
      </div>

      {/* Explorer Quick Filter Bar */}
      {isFilterVisible && (
        <div style={{ padding: '6px 10px', background: 'var(--vscode-bg-surface)', borderBottom: '1px solid var(--vscode-border)' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={12} style={{ position: 'absolute', left: '6px', color: 'var(--vscode-text-muted)' }} />
            <input
              type="text"
              className="input-text"
              style={{
                width: '100%',
                paddingLeft: '24px',
                paddingRight: '20px',
                background: 'var(--vscode-bg-input)',
                border: '1px solid var(--vscode-border)',
                fontSize: '11px',
                paddingTop: '2px',
                paddingBottom: '2px',
                color: '#ffffff',
              }}
              placeholder="ファイル名でフィルター..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              autoFocus
            />
            {filterText && (
              <button
                className="tab-close-btn"
                style={{ position: 'absolute', right: '4px' }}
                onClick={() => setFilterText('')}
              >
                <X size={11} />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Workspace Files Section Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            background: 'var(--vscode-bg-titlebar)',
            borderBottom: '1px solid var(--vscode-border)',
            userSelect: 'none',
            color: '#ffffff',
          }}
          onClick={() => setIsFilesOpen(!isFilesOpen)}
        >
          <span style={{ marginRight: '4px', opacity: 0.8 }}>
            {isFilesOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
          <span>{displayName} (ワークスペース)</span>
        </div>

        {/* Inline Create Input */}
        {isFilesOpen && (isCreatingFile || isCreatingFolder) && (
          <form onSubmit={handleCreateSubmit} style={{ padding: '4px 12px' }}>
            <input
              type="text"
              className="input-text"
              style={{
                width: '100%',
                fontSize: '12px',
                padding: '3px 6px',
                background: 'var(--vscode-bg-input)',
                border: '1px solid var(--vscode-blue)',
                color: '#ffffff',
              }}
              placeholder={isCreatingFile ? 'ファイル名 (例: main.rs)...' : 'フォルダー名...'}
              value={newPathName}
              onChange={(e) => setNewPathName(e.target.value)}
              onBlur={() => {
                setIsCreatingFile(false);
                setIsCreatingFolder(false);
              }}
              autoFocus
            />
          </form>
        )}

        {/* Tree Content */}
        {isFilesOpen &&
          (rootNode ? (
            <div style={{ padding: '4px 0' }}>
              <FileTreeNode
                node={rootNode}
                depth={0}
                activeFilePath={activeFilePath}
                onSelectFile={onSelectFile}
                onDeletePath={onDeletePath}
                onContextMenu={handleContextMenu}
              />
            </div>
          ) : (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <FolderTree size={36} color="var(--vscode-text-muted)" opacity={0.6} />
              <div style={{ fontSize: '12px', color: 'var(--vscode-text-secondary)' }}>
                フォルダーが開かれていません
              </div>
              {onOpenFolder && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={onOpenFolder}
                  style={{
                    width: '100%',
                    background: 'var(--vscode-blue)',
                    color: '#ffffff',
                    padding: '6px 12px',
                  }}
                >
                  フォルダーを開く
                </button>
              )}
            </div>
          ))}

        {/* OUTLINE (アウトライン) Accordion */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            background: 'var(--vscode-bg-titlebar)',
            borderTop: '1px solid var(--vscode-border)',
            borderBottom: '1px solid var(--vscode-border)',
            userSelect: 'none',
            color: '#ffffff',
          }}
          onClick={() => setIsOutlineOpen(!isOutlineOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ opacity: 0.8 }}>
              {isOutlineOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
            <span>アウトライン (OUTLINE)</span>
          </div>
          {symbols.length > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--vscode-text-muted)' }}>
              {symbols.length} シンボル
            </span>
          )}
        </div>

        {isOutlineOpen && (
          <div style={{ padding: '4px 0', maxHeight: '180px', overflowY: 'auto' }}>
            {symbols.length > 0 ? (
              symbols.map((sym, idx) => (
                <div
                  key={idx}
                  className="tree-node"
                  style={{
                    paddingLeft: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    height: '22px',
                    cursor: 'pointer',
                  }}
                  onClick={() => onJumpToLine && onJumpToLine(sym.line)}
                >
                  <div style={{ width: '14px', textAlign: 'center' }}>
                    {getSymbolIcon(sym.kind)}
                  </div>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sym.name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--vscode-text-muted)', paddingRight: '8px' }}>
                    :{sym.line}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: '8px 16px', fontSize: '11px', color: 'var(--vscode-text-muted)', fontStyle: 'italic' }}>
                シンボルが見つかりません
              </div>
            )}
          </div>
        )}

        {/* TIMELINE (タイムライン) Accordion */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '4px 8px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            background: 'var(--vscode-bg-titlebar)',
            borderTop: '1px solid var(--vscode-border)',
            borderBottom: '1px solid var(--vscode-border)',
            userSelect: 'none',
            color: '#ffffff',
          }}
          onClick={() => setIsTimelineOpen(!isTimelineOpen)}
        >
          <span style={{ marginRight: '4px', opacity: 0.8 }}>
            {isTimelineOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </span>
          <span>タイムライン (TIMELINE)</span>
        </div>

        {isTimelineOpen && (
          <div style={{ padding: '6px 16px', fontSize: '11px', color: 'var(--vscode-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GitBranch size={12} color="var(--vscode-blue)" />
              <span>Git: 最後のコミット</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={12} color="#81b88b" />
              <span>ローカル履歴 (Auto-saved)</span>
            </div>
          </div>
        )}
      </div>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
            backgroundColor: 'var(--vscode-bg-surface)',
            border: '1px solid var(--vscode-border)',
            borderRadius: '6px',
            padding: '4px 0',
            minWidth: '200px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!contextMenu.node.is_dir ? (
            <div
              className="menu-entry"
              onClick={() => {
                onSelectFile(contextMenu.node.path);
                setContextMenu(null);
              }}
            >
              <ExternalLink size={13} />
              <span>開く (Open)</span>
            </div>
          ) : (
            <>
              <div
                className="menu-entry"
                onClick={() => {
                  setCreateParentPath(contextMenu.node.path);
                  setIsCreatingFile(true);
                  setIsCreatingFolder(false);
                  setContextMenu(null);
                }}
              >
                <FilePlus size={13} color="var(--vscode-blue)" />
                <span>新しいファイル (New File)</span>
              </div>
              <div
                className="menu-entry"
                onClick={() => {
                  setCreateParentPath(contextMenu.node.path);
                  setIsCreatingFolder(true);
                  setIsCreatingFile(false);
                  setContextMenu(null);
                }}
              >
                <FolderPlus size={13} color="#dcb67a" />
                <span>新しいフォルダー (New Folder)</span>
              </div>
              <div className="menu-entry separator" />
            </>
          )}
          <div
            className="menu-entry"
            onClick={() => {
              navigator.clipboard.writeText(contextMenu.node.path);
              setContextMenu(null);
            }}
          >
            <Copy size={13} />
            <span>パスをコピー</span>
          </div>
          <div
            className="menu-entry"
            onClick={() => {
              const rel = contextMenu.node.path.split(/[\\/]/).slice(-2).join('/');
              navigator.clipboard.writeText(rel);
              setContextMenu(null);
            }}
          >
            <Copy size={13} />
            <span>相対パスをコピー</span>
          </div>
          <div className="menu-entry separator" />
          <div
            className="menu-entry"
            style={{ color: '#f87171' }}
            onClick={() => {
              if (confirm(`本当に削除しますか: ${contextMenu.node.name}`)) {
                onDeletePath(contextMenu.node.path);
              }
              setContextMenu(null);
            }}
          >
            <Trash2 size={13} color="#f87171" />
            <span>削除 (Delete)</span>
          </div>
        </div>
      )}
    </div>
  );
};
