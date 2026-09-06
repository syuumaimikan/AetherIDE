import React, { useState } from 'react';
import { FileNode } from '../types';
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface FileExplorerProps {
  rootNode: FileNode | null;
  activeFilePath?: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (parentPath: string, name: string) => void;
  onCreateFolder: (parentPath: string, name: string) => void;
  onDeletePath: (path: string) => void;
  onRefresh: () => void;
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
    if (name.endsWith('.rs')) return <FileCode size={14} color="#f97316" />;
    if (name.endsWith('.ts') || name.endsWith('.tsx')) return <FileCode size={14} color="#38bdf8" />;
    if (name.endsWith('.json') || name.endsWith('.toml')) return <FileText size={14} color="#facc15" />;
    if (name.endsWith('.md')) return <FileText size={14} color="#a855f7" />;
    return <FileText size={14} color="#94a3b8" />;
  };

  const isSelected = activeFilePath === node.path;

  if (node.is_dir) {
    return (
      <div>
        <div
          className={`tree-node ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {isOpen ? <FolderOpen size={14} color="#6366f1" /> : <Folder size={14} color="#6366f1" />}
          <span>{node.name}</span>
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
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
      onClick={() => onSelectFile(node.path)}
    >
      <span className="tree-indent" />
      {getFileIcon(node.name)}
      <span>{node.name}</span>
    </div>
  );
};

export const FileExplorer: React.FC<FileExplorerProps> = ({
  rootNode,
  activeFilePath,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeletePath,
  onRefresh,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const parent = rootNode ? rootNode.path : '';
    onCreateFile(parent, newFileName.trim());
    setNewFileName('');
    setIsCreating(false);
  };

  return (
    <div className="left-sidebar">
      <div className="sidebar-header">
        <span>Explorer</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsCreating(true)}
            title="New File"
          >
            <Plus size={12} />
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            title="Refresh Tree"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateSubmit} style={{ padding: '6px 10px' }}>
          <input
            type="text"
            className="input-text"
            style={{ width: '100%' }}
            placeholder="filename.rs / path"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            autoFocus
            onBlur={() => setIsCreating(false)}
          />
        </form>
      )}

      <div className="sidebar-content">
        {rootNode ? (
          <FileTreeNode
            node={rootNode}
            depth={0}
            activeFilePath={activeFilePath}
            onSelectFile={onSelectFile}
            onDeletePath={onDeletePath}
          />
        ) : (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
            No workspace open.
          </div>
        )}
      </div>
    </div>
  );
};
