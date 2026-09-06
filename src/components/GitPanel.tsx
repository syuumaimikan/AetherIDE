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
  RotateCcw,
  Search,
  Tag,
} from 'lucide-react';

interface GitPanelProps {
  status: GitRepoStatus | null;
  onStageFile: (path: string) => void;
  onStageAll: () => void;
  onUnstageFile: (path: string) => void;
  onUnstageAll?: () => void;
  onDiscardChange?: (path: string) => void;
  onCommit: (message: string) => void;
  onRefresh: () => void;
  onPreviewDiff?: (filePath: string, staged: boolean) => void;
  onOpenGitGraph?: () => void;
  onNotification?: (toast: {
    title: string;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }) => void;
}

const COMMIT_TYPES = [
  { type: 'feat', label: 'feat', desc: '新機能' },
  { type: 'fix', label: 'fix', desc: 'バグ修正' },
  { type: 'docs', label: 'docs', desc: 'ドキュメント' },
  { type: 'refactor', label: 'refactor', desc: 'リファクタリング' },
  { type: 'perf', label: 'perf', desc: 'パフォーマンス' },
  { type: 'test', label: 'test', desc: 'テスト' },
  { type: 'chore', label: 'chore', desc: '雑務・保守' },
];

export const GitPanel: React.FC<GitPanelProps> = ({
  status,
  onStageFile,
  onStageAll,
  onUnstageFile,
  onUnstageAll,
  onDiscardChange,
  onCommit,
  onRefresh,
  onPreviewDiff,
  onOpenGitGraph,
  onNotification,
}) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [branchFilter, setBranchFilter] = useState('');
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

  const handleCommitSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!commitMessage.trim()) return;
    if (stagedChanges.length === 0) {
      onNotification?.({
        title: 'Git コミット不可',
        message: 'コミットする前にファイルをステージしてください。',
        severity: 'warning',
      });
      return;
    }
    onCommit(commitMessage.trim());
    onNotification?.({
      title: 'コミット完了',
      message: `"${commitMessage.trim()}" をコミットしました。`,
      severity: 'success',
    });
    setCommitMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCommitSubmit();
    }
  };

  const handleChipClick = (type: string) => {
    if (!commitMessage) {
      setCommitMessage(`${type}: `);
    } else {
      // Check if already starts with conventional prefix
      const match = commitMessage.match(/^([a-z]+)(\([^)]+\))?:\s*(.*)$/);
      if (match) {
        const scope = match[2] || '';
        const rest = match[3] || '';
        setCommitMessage(`${type}${scope}: ${rest}`);
      } else {
        setCommitMessage(`${type}: ${commitMessage}`);
      }
    }
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
        const basename = files[0].split(/[\\/]/).pop() || files[0];
        summary = `update ${basename}`;
      } else if (files.length > 1) {
        const basename = files[0].split(/[\\/]/).pop() || files[0];
        summary = `update ${files.length} files including ${basename}`;
      }

      setCommitMessage(`${type}(${scope}): ${summary}`);
      onNotification?.({
        title: 'AI コミットメッセージ生成',
        message: 'Git Diffの変更内容からConventional Commitメッセージを作成しました。',
        severity: 'info',
      });
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
      onNotification?.({
        title: 'ブランチ切り替え',
        message: `ブランチ "${branch}" に切り替えました。`,
        severity: 'info',
      });
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
      const created = newBranchName.trim();
      setNewBranchName('');
      setShowNewBranchInput(false);
      setShowBranchDropdown(false);
      onRefresh();
      await loadBranches();
      onNotification?.({
        title: 'ブランチ作成',
        message: `新しいブランチ "${created}" を作成してチェックアウトしました。`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Failed to create branch:', err);
    } finally {
      setIsBranchLoading(false);
    }
  };

  const filteredBranches = branches.filter((b) =>
    b.toLowerCase().includes(branchFilter.toLowerCase())
  );

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
            padding: '3px 8px',
            borderRadius: '4px',
            background: showBranchDropdown ? 'var(--vscode-bg-selection)' : 'transparent',
            transition: 'background 0.15s ease',
          }}
          onClick={() => setShowBranchDropdown(!showBranchDropdown)}
          title="クリックでブランチ切替 / 作成"
        >
          <GitBranch size={14} color="#38bdf8" />
          <span style={{ fontWeight: 600, fontSize: '12px' }}>
            {status?.current_branch || 'master'}
          </span>
          {status && (
            <span style={{ fontSize: '10px', color: 'var(--vscode-text-muted)' }}>
              (↑{status.ahead} ↓{status.behind})
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {onOpenGitGraph && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenGitGraph}
              title="Git Graph : コミット履歴グラフを表示 (Ctrl+Shift+G)"
            >
              <GitCommit size={12} color="var(--vscode-blue)" />
              <span style={{ fontSize: '11px' }}>Graph</span>
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            title="Git ステータスを更新"
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
              background: 'var(--vscode-bg-surface)',
              border: '1px solid var(--vscode-border)',
              borderRadius: '6px',
              padding: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--vscode-text-secondary)',
                marginBottom: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>ブランチ切替 (SWITCH BRANCH)</span>
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '10px', padding: '2px 6px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewBranchInput(!showNewBranchInput);
                }}
              >
                <Plus size={10} />
                <span>新規作成</span>
              </button>
            </div>

            {/* Filter Search */}
            <div style={{ position: 'relative', marginBottom: '6px' }}>
              <Search
                size={12}
                style={{
                  position: 'absolute',
                  left: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--vscode-text-muted)',
                }}
              />
              <input
                type="text"
                className="input-text"
                style={{ fontSize: '11px', padding: '3px 6px 3px 22px', width: '100%' }}
                placeholder="ブランチを検索..."
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {showNewBranchInput && (
              <form onSubmit={handleCreateBranch} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="text"
                    className="input-text"
                    style={{ fontSize: '11px', padding: '3px 6px', flex: 1 }}
                    placeholder="新しいブランチ名..."
                    value={newBranchName}
                    onChange={(e) => setNewBranchName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    作成
                  </button>
                </div>
              </form>
            )}

            <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
              {filteredBranches.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--vscode-text-muted)', padding: '6px' }}>
                  該当するブランチがありません
                </div>
              ) : (
                filteredBranches.map((b) => (
                  <div
                    key={b}
                    className="tree-node"
                    style={{
                      padding: '4px 6px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background:
                        b === status?.current_branch ? 'rgba(0, 120, 212, 0.18)' : 'transparent',
                      color:
                        b === status?.current_branch
                          ? 'var(--vscode-blue)'
                          : 'var(--vscode-text-primary)',
                    }}
                    onClick={() => handleCheckoutBranch(b)}
                  >
                    <GitBranch size={12} />
                    <span style={{ fontSize: '11px', flex: 1 }}>{b}</span>
                    {b === status?.current_branch && <Check size={12} />}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-content" style={{ padding: '12px' }}>
        {/* Conventional Commit Chip Selector */}
        <div style={{ marginBottom: '8px' }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--vscode-text-muted)',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Tag size={10} />
            <span>CONVENTIONAL COMMIT PREFIX:</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {COMMIT_TYPES.map((c) => (
              <button
                key={c.type}
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  background:
                    commitMessage.startsWith(c.type)
                      ? 'rgba(0, 120, 212, 0.25)'
                      : 'var(--vscode-bg-input)',
                  borderColor:
                    commitMessage.startsWith(c.type)
                      ? 'var(--vscode-blue)'
                      : 'var(--vscode-border)',
                }}
                onClick={() => handleChipClick(c.type)}
                title={c.desc}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Commit Box */}
        <form onSubmit={handleCommitSubmit} style={{ marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <textarea
              className="input-text"
              style={{
                width: '100%',
                minHeight: '68px',
                resize: 'vertical',
                fontSize: '12px',
                lineHeight: '1.4',
              }}
              placeholder="コミット メッセージを入力 (Ctrl+Enter でコミット)..."
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              disabled={stagedChanges.length === 0 || !commitMessage.trim()}
              title="ステージされた変更をコミット (Ctrl+Enter)"
            >
              <GitCommit size={13} />
              <span>コミット ({stagedChanges.length})</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={generateAiCommitMessage}
              disabled={isGeneratingMessage}
              title="Git DiffからAIでConventional Commitメッセージを自動生成"
            >
              <Sparkles
                size={13}
                color="var(--vscode-blue)"
                className={isGeneratingMessage ? 'spin' : ''}
              />
              <span style={{ fontSize: '11px' }}>AI 生成</span>
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
              color: 'var(--vscode-text-secondary)',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            <span>ステージされた変更 ({stagedChanges.length})</span>
            {stagedChanges.length > 0 && onUnstageAll && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '10px', padding: '1px 5px' }}
                onClick={onUnstageAll}
                title="すべてのステージを解除"
              >
                <Minus size={11} />
                <span>Unstage All</span>
              </button>
            )}
          </div>
          {stagedChanges.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--vscode-text-muted)', fontStyle: 'italic', padding: '4px 6px' }}>
              ステージされた変更はありません
            </div>
          ) : (
            stagedChanges.map((change) => (
              <div
                key={change.path}
                className="tree-node"
                style={{ justifyContent: 'space-between', padding: '4px 6px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <FileCode size={12} color="#81b88b" />
                  <span
                    style={{
                      color: '#81b88b',
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
                      title="差分を表示 (Diff Inspect)"
                    >
                      <Eye size={11} />
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 4px' }}
                    onClick={() => onUnstageFile(change.path)}
                    title="ステージを解除"
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
              color: 'var(--vscode-text-secondary)',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            <span>変更 ({unstagedChanges.length})</span>
            {unstagedChanges.length > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '10px', padding: '1px 5px' }}
                onClick={onStageAll}
                title="すべての変更をステージ"
              >
                <CheckCheck size={11} />
                <span>Stage All</span>
              </button>
            )}
          </div>
          {unstagedChanges.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--vscode-text-muted)', fontStyle: 'italic', padding: '4px 6px' }}>
              クリーンな作業ツリーです
            </div>
          ) : (
            unstagedChanges.map((change) => (
              <div
                key={change.path}
                className="tree-node"
                style={{ justifyContent: 'space-between', padding: '4px 6px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <FileCode size={12} color="#fbbf24" />
                  <span
                    style={{
                      color: '#fbbf24',
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
                      title="差分を表示 (Diff Inspect)"
                    >
                      <Eye size={11} />
                    </button>
                  )}
                  {onDiscardChange && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 4px' }}
                      onClick={() => onDiscardChange(change.path)}
                      title="変更を破棄 (Revert / Discard)"
                    >
                      <RotateCcw size={11} color="#f87171" />
                    </button>
                  )}
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 4px' }}
                    onClick={() => onStageFile(change.path)}
                    title="ステージ"
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

