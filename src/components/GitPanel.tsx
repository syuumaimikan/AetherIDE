import React, { useState } from 'react';
import { GitRepoStatus } from '../types';
import {
  Check,
  CheckCheck,
  FileCheck,
  GitBranch,
  GitCommit,
  Minus,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface GitPanelProps {
  status: GitRepoStatus | null;
  onStageFile: (path: string) => void;
  onStageAll: () => void;
  onUnstageFile: (path: string) => void;
  onCommit: (message: string) => void;
  onRefresh: () => void;
}

export const GitPanel: React.FC<GitPanelProps> = ({
  status,
  onStageFile,
  onStageAll,
  onUnstageFile,
  onCommit,
  onRefresh,
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);

  const stagedChanges = status?.changes.filter((c) => c.is_staged) || [];
  const unstagedChanges = status?.changes.filter((c) => !c.is_staged) || [];

  const handleCommitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    onCommit(commitMessage.trim());
    setCommitMessage('');
  };

  const generateAiCommitMessage = () => {
    setIsGeneratingMessage(true);
    setTimeout(() => {
      setCommitMessage('feat(agent): integrate multi-agent team pipeline and sandboxed pty');
      setIsGeneratingMessage(false);
    }, 600);
  };

  return (
    <div className="left-sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GitBranch size={14} color="var(--accent-cyan)" />
          <span>{status?.current_branch || 'main'}</span>
          {status && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              (↑{status.ahead} ↓{status.behind})
            </span>
          )}
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          title="Refresh Git Status"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      <div className="sidebar-content" style={{ padding: '12px' }}>
        {/* Commit Box */}
        <form onSubmit={handleCommitSubmit} style={{ marginBottom: '16px' }}>
          <textarea
            className="input-text"
            style={{ width: '100%', minHeight: '64px', resize: 'vertical' }}
            placeholder="Commit message..."
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              disabled={stagedChanges.length === 0}
            >
              <GitCommit size={13} />
              <span>Commit ({stagedChanges.length})</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={generateAiCommitMessage}
              title="Generate commit message using AI"
            >
              <Sparkles size={13} color="var(--accent-primary)" />
            </button>
          </div>
        </form>

        {/* Staged Changes */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            <span>Staged Changes ({stagedChanges.length})</span>
          </div>
          {stagedChanges.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No staged files.
            </div>
          ) : (
            stagedChanges.map((change) => (
              <div
                key={change.path}
                className="tree-node"
                style={{ justifyContent: 'space-between' }}
              >
                <span style={{ color: 'var(--accent-emerald)', fontSize: '12px' }}>
                  {change.path}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onUnstageFile(change.path)}
                  title="Unstage"
                >
                  <Minus size={10} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Changes */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            <span>Changes ({unstagedChanges.length})</span>
            {unstagedChanges.length > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={onStageAll}
                title="Stage All"
              >
                <CheckCheck size={12} />
                <span>Stage All</span>
              </button>
            )}
          </div>
          {unstagedChanges.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Clean working tree.
            </div>
          ) : (
            unstagedChanges.map((change) => (
              <div
                key={change.path}
                className="tree-node"
                style={{ justifyContent: 'space-between' }}
              >
                <span style={{ color: 'var(--accent-amber)', fontSize: '12px' }}>
                  {change.path}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onStageFile(change.path)}
                  title="Stage"
                >
                  <Plus size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
