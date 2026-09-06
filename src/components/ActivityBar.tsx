import React from 'react';
import { ActivityTab } from '../types';
import {
  Files,
  Search,
  GitBranch,
  Bot,
  Terminal,
  Settings,
  Bug,
  Blocks,
  Cpu,
  UserCircle,
} from 'lucide-react';

interface ActivityBarProps {
  activeTab: ActivityTab | null;
  setActiveTab: (tab: ActivityTab) => void;
  openSettings: () => void;
  gitChangeCount?: number;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  setActiveTab,
  openSettings,
  gitChangeCount = 0,
}) => {
  return (
    <aside className="activity-bar">
      <div className="activity-bar-group">
        {/* Explorer */}
        <button
          className={`activity-item ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('explorer')}
          title="エクスプローラー (Ctrl+Shift+E)"
        >
          <Files size={20} />
        </button>

        {/* Search */}
        <button
          className={`activity-item ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          title="検索 (Ctrl+Shift+F)"
        >
          <Search size={20} />
        </button>

        {/* Source Control */}
        <button
          className={`activity-item ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => setActiveTab('git')}
          title="ソース管理 (Ctrl+Shift+G)"
        >
          <GitBranch size={20} />
          {gitChangeCount > 0 && (
            <span className="activity-badge">{gitChangeCount}</span>
          )}
        </button>

        {/* Run & Debug */}
        <button
          className={`activity-item ${activeTab === 'terminal' ? 'active' : ''}`}
          onClick={() => setActiveTab('terminal')}
          title="実行とデバッグ (Ctrl+Shift+D)"
        >
          <Bug size={20} />
        </button>

        {/* Extensions */}
        <button
          className={`activity-item ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
          title="AI Agent Swarm & 拡張機能 (Ctrl+Shift+X)"
        >
          <Blocks size={20} />
        </button>

        {/* Agent OS Cockpit */}
        <button
          className="activity-item"
          onClick={() => setActiveTab('agents')}
          title="AI Agent OS: システム & ホスト操作"
        >
          <Cpu size={20} />
        </button>
      </div>

      <div className="activity-bar-group">
        {/* Accounts */}
        <button
          className="activity-item"
          title="アカウント"
          onClick={openSettings}
        >
          <UserCircle size={20} />
        </button>

        {/* Settings */}
        <button
          className="activity-item"
          onClick={openSettings}
          title="管理 (Ctrl+,)"
        >
          <Settings size={20} />
        </button>
      </div>
    </aside>
  );
};
