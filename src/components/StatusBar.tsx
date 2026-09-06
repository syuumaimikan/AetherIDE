import React from 'react';
import { GitBranch, XCircle, AlertTriangle, Bell, Sparkles, Check } from 'lucide-react';
import { GitRepoStatus } from '../types';

interface StatusBarProps {
  gitStatus: GitRepoStatus | null;
  activeLanguage?: string;
  onOpenTerminal?: () => void;
  onOpenKeybindings?: () => void;
  onRefreshGit?: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  gitStatus,
  activeLanguage = 'Rust',
  onOpenTerminal,
  onOpenKeybindings,
  onRefreshGit,
}) => {
  return (
    <footer className="statusbar">
      {/* Left items: Remote WSL, Git Branch, Sync, Errors/Warnings */}
      <div className="statusbar-left">
        {/* Remote Connection Block (VS Code Blue) */}
        <div
          className="statusbar-remote-btn"
          title="リモート ウィンドウを開く (WSL / SSH / Container)"
          onClick={onOpenTerminal}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.5 11.5L1 8l3.5-3.5.7.7L2.4 8l2.8 2.8-.7.7zm7 0l3.5-3.5L11.5 4.5l-.7.7 2.8 2.8-2.8 2.8.7.7zM6 13h1l3-10H9l-3 10z" />
          </svg>
        </div>

        {/* Git Branch */}
        <div
          className="statusbar-item"
          title={`Git ブランチ: ${gitStatus?.current_branch || 'master'} (クリックで更新)`}
          onClick={onRefreshGit}
        >
          <GitBranch size={12} />
          <span>{gitStatus?.current_branch || 'master'}*</span>
          {gitStatus && (
            <span style={{ fontSize: '10px', opacity: 0.8 }}>
              ↑{gitStatus.ahead} ↓{gitStatus.behind}
            </span>
          )}
        </div>

        {/* Errors & Warnings Count */}
        <div className="statusbar-item" title="問題 (Ctrl+Shift+M)" onClick={onOpenTerminal}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <XCircle size={12} color="#f87171" />
            <span>0</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '4px' }}>
            <AlertTriangle size={12} color="#fbbf24" />
            <span>0</span>
          </div>
        </div>

        {/* Reconnect notice matching screenshot */}
        <div
          className="statusbar-item"
          style={{ opacity: 0.75, fontSize: '11px' }}
          onClick={onOpenTerminal}
        >
          <span>⚡ 言語機能をアクティブ化しています..</span>
        </div>
      </div>

      {/* Right items: Encoding, Indent, Language, AI status, Bell */}
      <div className="statusbar-right">
        <div className="statusbar-item" title="インデントの選択">
          <span>スペース: 4</span>
        </div>

        <div className="statusbar-item" title="エンコードの選択">
          <span>UTF-8</span>
        </div>

        <div className="statusbar-item" title="行末文字の選択">
          <span>CRLF</span>
        </div>

        <div className="statusbar-item" title="言語モードの選択">
          <span>{activeLanguage}</span>
        </div>

        {/* AI Copilot & Swarm Status Arc */}
        <div
          className="statusbar-item"
          style={{ color: '#38bdf8' }}
          title="Aether AI Copilot & Autonomous Swarm: Operational"
          onClick={onOpenKeybindings}
        >
          <Sparkles size={12} />
          <span>Aether AI</span>
        </div>

        {/* Notification Bell */}
        <div className="statusbar-item" title="通知の表示">
          <Bell size={12} />
        </div>
      </div>
    </footer>
  );
};
