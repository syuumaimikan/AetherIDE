import React, { useState } from 'react';
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
} from 'lucide-react';

interface FileExplorerProps {
  rootNode: FileNode | null;
  workspaceName?: string;
  activeFilePath?: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (parentPath: string, name: string) => void;
  onCreateFolder: (parentPath: string, name: string) => void;
  onDeletePath: (path: string) => void;
  onRefresh: () => void;
  onOpenFolder?: () => void;
}

const FileTreeNode: React.FC<{
  node: FileNode;
  depth: number;
  activeFilePath?: string;
  onSelectFile: (path: string) => void;
  onDeletePath: (path: string) => void;
}> = ({ node, depth, activeFilePath, onSelectFile, onDeletePath }) => {
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
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeletePath,
  onRefresh,
  onOpenFolder,
}) => {
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newPathName, setNewPathName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPathName.trim()) return;
    if (isCreatingFile) {
      onCreateFile('', newPathName.trim());
      setIsCreatingFile(false);
    } else if (isCreatingFolder) {
      onCreateFolder('', newPathName.trim());
      setIsCreatingFolder(false);
    }
    setNewPathName('');
  };

  const displayName = workspaceName.toUpperCase();

  return (
    <div className="left-sidebar">
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
        </div>
      </div>

      <div className="sidebar-content">
        {/* Inline Create Input */}
        {(isCreatingFile || isCreatingFolder) && (
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
        {rootNode ? (
          <div style={{ padding: '4px 0' }}>
            <FileTreeNode
              node={rootNode}
              depth={0}
              activeFilePath={activeFilePath}
              onSelectFile={onSelectFile}
              onDeletePath={onDeletePath}
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
        )}
      </div>
    </div>
  );
};
