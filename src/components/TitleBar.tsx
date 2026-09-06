import React from 'react';
import { AppMode } from '../types';
import { Bot, Cpu, Layers, Search, Sparkles, Terminal, Keyboard } from 'lucide-react';

interface TitleBarProps {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  openCommandCenter: () => void;
  toggleTerminal: () => void;
  onRunAutonomousTeam: () => void;
  onOpenKeybindings?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  appMode,
  setAppMode,
  openCommandCenter,
  toggleTerminal,
  onRunAutonomousTeam,
  onOpenKeybindings,
}) => {
  return (
    <header className="titlebar">
      <div className="titlebar-left">
        <div className="titlebar-logo">
          <svg width="18" height="18" viewBox="0 0 512 512" fill="none">
            <polygon
              points="256,96 384,170 384,318 256,392 128,318 128,170"
              stroke="#6366f1"
              strokeWidth="36"
            />
            <polygon
              points="256,150 330,290 182,290"
              stroke="#06b6d4"
              strokeWidth="36"
              strokeLinejoin="round"
            />
            <circle cx="256" cy="230" r="32" fill="#a855f7" />
          </svg>
          <span>AETHER IDE</span>
        </div>

        {/* 3-in-1 Mode Switcher */}
        <div className="mode-switcher">
          <button
            className={`mode-btn ${appMode === 'normal' ? 'active' : ''}`}
            onClick={() => setAppMode('normal')}
            title="Standard High-Speed Developer IDE"
          >
            <Layers size={13} />
            <span>Normal IDE</span>
          </button>
          <button
            className={`mode-btn ${appMode === 'agent' ? 'active' : ''}`}
            onClick={() => setAppMode('agent')}
            title="Multi-Agent Autonomous Orchestration Workspace"
          >
            <Bot size={13} />
            <span>AI Agent IDE</span>
          </button>
          <button
            className={`mode-btn ${appMode === 'os' ? 'active' : ''}`}
            onClick={() => setAppMode('os')}
            title="AI Agent OS: System Control & Tool Sandboxing"
          >
            <Cpu size={13} />
            <span>AI Agent OS</span>
          </button>
        </div>
      </div>

      <div className="titlebar-center">
        <div className="titlebar-search" onClick={openCommandCenter}>
          <Search size={14} />
          <span>Search files, commands, and multi-agent tasks...</span>
          <kbd>Ctrl+P</kbd>
        </div>
      </div>

      <div className="titlebar-right">
        {onOpenKeybindings && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onOpenKeybindings}
            title="Keyboard Shortcuts Help (? / Ctrl+Shift+H)"
            style={{ padding: '4px 7px' }}
          >
            <Keyboard size={13} />
          </button>
        )}

        <button
          className="btn btn-secondary btn-sm"
          onClick={toggleTerminal}
          title="Toggle Terminal Dock (Ctrl+`)"
        >
          <Terminal size={13} />
          <span>Terminal</span>
        </button>

        <button
          className="btn btn-primary btn-sm"
          onClick={onRunAutonomousTeam}
          title="Trigger 5-Stage Autonomous Pipeline (Architect -> Coder -> Tester -> Reviewer -> Security)"
        >
          <Sparkles size={13} />
          <span>Autonomous Team</span>
        </button>
      </div>
    </header>
  );
};
