import React from 'react';
import { ActivityTab } from '../types';
import {
  Files,
  Search,
  GitBranch,
  Bot,
  Terminal,
  Settings,
  ShieldCheck,
} from 'lucide-react';

interface ActivityBarProps {
  activeTab: ActivityTab;
  setActiveTab: (tab: ActivityTab) => void;
  openSettings: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab,
  setActiveTab,
  openSettings,
}) => {
  return (
    <aside className="activity-bar">
      <div className="activity-bar-top">
        <button
          className={`activity-icon-btn ${activeTab === 'explorer' ? 'active' : ''}`}
          onClick={() => setActiveTab('explorer')}
          title="Explorer (Ctrl+Shift+E)"
        >
          <Files size={18} />
        </button>

        <button
          className={`activity-icon-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          title="Search Workspace (Ctrl+Shift+F)"
        >
          <Search size={18} />
        </button>

        <button
          className={`activity-icon-btn ${activeTab === 'git' ? 'active' : ''}`}
          onClick={() => setActiveTab('git')}
          title="Source Control (Ctrl+Shift+G)"
        >
          <GitBranch size={18} />
        </button>

        <button
          className={`activity-icon-btn ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
          title="AI Agent Swarm & Orchestrator"
        >
          <Bot size={18} />
        </button>

        <button
          className={`activity-icon-btn ${activeTab === 'terminal' ? 'active' : ''}`}
          onClick={() => setActiveTab('terminal')}
          title="Terminal & Process Monitor"
        >
          <Terminal size={18} />
        </button>
      </div>

      <div className="activity-bar-bottom">
        <button
          className="activity-icon-btn"
          onClick={openSettings}
          title="Settings & Model Providers"
        >
          <Settings size={18} />
        </button>
      </div>
    </aside>
  );
};
