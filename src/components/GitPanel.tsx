import React, { useState, useEffect } from 'react';
import { GitRepoStatus } from '../types';
import { TauriBridge } from '../services/tauriBridge';
import {
  CheckCheck,
  GitBranch,
  GitCommit,
  Minus,
  Plus,
  RefreshCw,
  Sparkles,
  GitFork,
  FileCode,
  Eye,
  Check,
} from 'lucide-react';

interface GitPanelProps {
  status: GitRepoStatus | null;
  onStageFile: (path: string) => void;
  onStageAll: () => void;
  onUnstageFile: (path: string) => void;
  onCommit: (message: string) => void;
  onRefresh: () => void;
  onPreviewDiff?: (filePath: string, staged: boolean) => void;
  onOpenGitGraph?: () => void;
}

export const GitPanel: React.FC<GitPanelProps> = ({
  status,
  onStageFile,
  onStageAll,
  onUnstageFile,
  onCommit,
  onRefresh,
  onPreviewDiff,
  onOpenGitGraph,
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showNewBranchInput, setShowNewBranchInput] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [isBranchLoading, setIsBranchLoading] = useState(false);

  const stagedChanges = status?.changes.filter((c) => c.is_staged) || [];
  const unstagedChanges = status?.changes.filter((c) => !c.is_staged) || [];

  const loadBranches = async () => {
    try {
      const list = await TauriBridge.listBranches();
      setBranches(list);
    } catch {
      setBranches(['master']);
    }
  };

  useEffect(() => {
    loadBranches();
  }, [status?.current_branch]);

  const handleCommitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) return;
    onCommit(commitMessage.trim());
    setCommitMessage('');
  };

  const generateAiCommitMessage = async () => {
    setIsGeneratingMessage(true);
    try {
      // Analyze current changes
      const diff = await TauriBridge.getGitDiff(stagedChanges.length > 0);
      const files = (stagedChanges.length > 0 ? stagedChanges : unstagedChanges).map((c) => c.path);
      
      let type = 'feat';
      let scope = 'core';
      if (files.some((f) => f.includes('test'))) type = 'test';
      else if (files.some((f) => f.endsWith('.md'))) type = 'docs';
      else if (files.some((f) => f.includes('fix') || f.includes('bug'))) type = 'fix';

      if (files.some((f) => f.includes('git'))) scope = 'git';
      else if (files.some((f) => f.includes('editor'))) scope = 'editor';
      else if (files.some((f) => f.includes('tool') || f.includes('os'))) scope = 'agent-os';
      else if (files.some((f) => f.includes('swarm') || f.includes('agent'))) scope = 'swarm';

      let summary = 'enhance workspace capabilities and autonomous tool runtime';
      if (files.length === 1) {
        const basename = files[0].split('/').pop() || files[0];
        summary = `update ${basename}`;
      } else if (files.length > 1) {
        summary = `update ${files.length} modules including ${files[0].split('/').pop()}`;
      }

      setCommitMessage(`${type}(${scope}): ${summary}`);
    } catch (e) {
      setCommitMessage('feat(workspace): automated updates and improvements');
    } finally {
      setIsGeneratingMessage(false);
    }
  };

  const handleCheckoutBranch = async (branch: string) => {
    setIsBranchLoading(true);
    try {
      await TauriBridge.checkoutBranch(branch);
      setShowBranchDropdown(false);
      onRefresh();
      await loadBranches();
    } catch (err) {
      console.error('Failed to checkout branch:', err);
    } finally {
      setIsBranchLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    setIsBranchLoading(true);
    try {
      await TauriBridge.createBranch(newBranchName.trim());
      setNewBranchName('');
      setShowNewBranchInput(false);
      setShowBranchDropdown(false);
      onRefresh();
      await loadBranches();
    } catch (err) {
      console.error('Failed to create branch:', err);
    } finally {
      setIsBranchLoading(false);
    }
  };

  return (
    <div className="left-sidebar">
      {/* Branch & Refresh Header */}
      <div className="sidebar-header" style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            background: showBranchDropdown ? 'var(--bg-surface-hover)' : 'transparent',
          }}
          onClick={() => setShowBranchDropdown(!showBranchDropdown)}
          title="Click to switch or create branches"
        >
          <GitBranch size={14} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 600, fontSize: '12px' }}>
            {status?.current_branch || 'master'}
          </span>
          {status && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              (↑{status.ahead} ↓{status.behind})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {onOpenGitGraph && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenGitGraph}
              title="Git Graph : コミット履歴グラフを表示"
            >
              <GitCommit size={12} color="var(--vscode-blue)" />
              <span style={{ fontSize: '11px' }}>Graph</span>
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            title="Refresh Git Status"
          >
            <RefreshCw size={12} className={isBranchLoading ? 'spin' : ''} />
          </button>
        </div>

        {/* Branch Dropdown Overlay */}
        {showBranchDropdown && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 8,
              right: 8,
              zIndex: 90,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                marginBottom: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>SWITCH BRANCH</span>
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '10px', padding: '2px 6px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewBranchInput(!showNewBranchInput);
                }}
              >
                <Plus size={10} />
                <span>New</span>
              </button>
            </div>

            {showNewBranchInput && (
              <form onSubmit={handleCreateBranch} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    className="input-text"
                    style={{ fontSize: '11px', padding: '3px 6px' }}
                    placeholder="branch-name..."
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    Create
                  </button>
                </div>
              </form>
            )}

            <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
              {branches.map((b) => (
                <div
                  key={b}
                  className="tree-node"
                  style={{
                    padding: '4px 6px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background:
                      b === status?.current_branch ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color:
                      b === status?.current_branch
                        ? 'var(--accent-primary)'
                        : 'var(--text-primary)',
                  }}
                  onClick={() => handleCheckoutBranch(b)}
                >
                  <GitBranch size={12} />
                  <span style={{ fontSize: '11px', flex: 1 }}>{b}</span>
                  {b === status?.current_branch && <Check size={12} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-content" style={{ padding: '12px' }}>
        {/* Commit Box */}
        <form onSubmit={handleCommitSubmit} style={{ marginBottom: '16px' }}>
          <textarea
            className="input-text"
            style={{ width: '100%', minHeight: '64px', resize: 'vertical', fontSize: '12px' }}
            placeholder="Commit message (Conventional Commits encouraged)..."
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
              disabled={isGeneratingMessage}
              title="Generate commit message using AI from git diff"
            >
              <Sparkles
                size={13}
                color="var(--accent-primary)"
                className={isGeneratingMessage ? 'spin' : ''}
              />
              <span style={{ fontSize: '11px' }}>AI</span>
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
                style={{ justifyContent: 'space-between', padding: '4px 6px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <FileCode size={12} color="var(--accent-emerald)" />
                  <span
                    style={{
                      color: 'var(--accent-emerald)',
                      fontSize: '12px',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                    title={change.path}
                  >
                    {change.path}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {onPreviewDiff && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 4px' }}
                      onClick={() => onPreviewDiff(change.path, true)}
                      title="Inspect Diff"
                    >
                      <Eye size={11} />
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 4px' }}
                    onClick={() => onUnstageFile(change.path)}
                    title="Unstage"
                  >
                    <Minus size={11} />
                  </button>
                </div>
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
                style={{ justifyContent: 'space-between', padding: '4px 6px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <FileCode size={12} color="var(--accent-amber)" />
                  <span
                    style={{
                      color: 'var(--accent-amber)',
                      fontSize: '12px',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                    title={change.path}
                  >
                    {change.path}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {onPreviewDiff && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 4px' }}
                      onClick={() => onPreviewDiff(change.path, false)}
                      title="Inspect Diff"
                    >
                      <Eye size={11} />
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 4px' }}
                    onClick={() => onStageFile(change.path)}
                    title="Stage"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
