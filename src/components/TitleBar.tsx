import React, { useState, useEffect, useRef } from 'react';
import { AppMode } from '../types';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Cpu,
  Layers,
  Search,
  Sparkles,
  Terminal,
  Keyboard,
  PanelLeft,
  PanelBottom,
  PanelRight,
  FolderOpen,
  FileCode,
  Settings,
} from 'lucide-react';

interface TitleBarProps {
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  workspaceName?: string;
  openCommandCenter: () => void;
  toggleTerminal: () => void;
  toggleLeftSidebar?: () => void;
  toggleRightSidebar?: () => void;
  onRunAutonomousTeam: () => void;
  onOpenKeybindings?: () => void;
  onOpenRules?: () => void;
  onOpenGitGraph?: () => void;
  onOpenFolder?: () => void;
  onOpenFile?: () => void;
  onSaveFile?: () => void;
  onNewFile?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  appMode,
  setAppMode,
  workspaceName = 'AetherIDE',
  openCommandCenter,
  toggleTerminal,
  toggleLeftSidebar,
  toggleRightSidebar,
  onRunAutonomousTeam,
  onOpenKeybindings,
  onOpenRules,
  onOpenGitGraph,
  onOpenFolder,
  onOpenFile,
  onSaveFile,
  onNewFile,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleItemClick = (action?: () => void) => {
    setActiveMenu(null);
    if (action) action();
  };

  return (
    <header className="titlebar">
      <div className="titlebar-left" ref={menuRef}>
        {/* VS Code Ribbon Logo */}
        <div className="titlebar-vscode-icon" title="Aether IDE (VS Code Architecture)">
          <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
            <path
              d="M71.2 97.4L96.8 84.8C98.8 83.8 100 81.8 100 79.5V20.5C100 18.2 98.8 16.2 96.8 15.2L71.2 2.6C69.6 1.8 67.7 2.1 66.4 3.3L28.1 38.3L11.7 25.8C10.5 24.9 8.9 24.8 7.6 25.6L1.5 29.4C0.6 30 0 31 0 32.1C0 33.2 0.6 34.2 1.5 34.8L20.2 49.2L1.5 63.6C0.6 64.2 0 65.2 0 66.3C0 67.4 0.6 68.4 1.5 69L7.6 72.8C8.9 73.6 10.5 73.5 11.7 72.6L28.1 60.1L66.4 95.1C67.7 96.3 69.6 96.6 71.2 97.4Z"
              fill="#0078d4"
            />
            <path
              d="M71.2 97.4C69.6 96.6 67.7 96.3 66.4 95.1L28.1 60.1L66.4 25.1L71.2 2.6V97.4Z"
              fill="#005a9e"
              opacity="0.3"
            />
          </svg>
        </div>

        {/* VS Code Menus */}
        <nav className="menubar">
          {/* ファイル(F) */}
          <div
            className={`menubar-item ${activeMenu === 'file' ? 'active' : ''}`}
            onClick={() => handleMenuClick('file')}
          >
            <span>ファイル(F)</span>
            {activeMenu === 'file' && (
              <div className="menubar-dropdown">
                <div className="menu-entry" onClick={() => handleItemClick(onNewFile)}>
                  <span>新しいテキスト ファイル</span>
                  <span className="menu-shortcut">Ctrl+N</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick(onOpenFile)}>
                  <span>ファイルを開く...</span>
                  <span className="menu-shortcut">Ctrl+O</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick(onOpenFolder)}>
                  <span>フォルダーを開く...</span>
                  <span className="menu-shortcut">Ctrl+K Ctrl+O</span>
                </div>
                <div className="menu-entry separator" />
                <div className="menu-entry" onClick={() => handleItemClick(onSaveFile)}>
                  <span>保存</span>
                  <span className="menu-shortcut">Ctrl+S</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick(onSaveFile)}>
                  <span>名前を付けて保存...</span>
                  <span className="menu-shortcut">Ctrl+Shift+S</span>
                </div>
                <div className="menu-entry separator" />
                <div className="menu-entry" onClick={() => handleItemClick(() => window.close())}>
                  <span>終了</span>
                  <span className="menu-shortcut">Alt+F4</span>
                </div>
              </div>
            )}
          </div>

          {/* 編集(E) */}
          <div
            className={`menubar-item ${activeMenu === 'edit' ? 'active' : ''}`}
            onClick={() => handleMenuClick('edit')}
          >
            <span>編集(E)</span>
            {activeMenu === 'edit' && (
              <div className="menubar-dropdown">
                <div className="menu-entry" onClick={() => handleItemClick()}>
                  <span>元に戻す</span>
                  <span className="menu-shortcut">Ctrl+Z</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick()}>
                  <span>やり直し</span>
                  <span className="menu-shortcut">Ctrl+Y</span>
                </div>
                <div className="menu-entry separator" />
                <div className="menu-entry" onClick={() => handleItemClick()}>
                  <span>切り取り</span>
                  <span className="menu-shortcut">Ctrl+X</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick()}>
                  <span>コピー</span>
                  <span className="menu-shortcut">Ctrl+C</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick()}>
                  <span>貼り付け</span>
                  <span className="menu-shortcut">Ctrl+V</span>
                </div>
                <div className="menu-entry separator" />
                <div className="menu-entry" onClick={() => handleItemClick(openCommandCenter)}>
                  <span>検索</span>
                  <span className="menu-shortcut">Ctrl+F</span>
                </div>
              </div>
            )}
          </div>

          {/* 選択(S) */}
          <div
            className={`menubar-item ${activeMenu === 'selection' ? 'active' : ''}`}
            onClick={() => handleMenuClick('selection')}
          >
            <span>選択(S)</span>
            {activeMenu === 'selection' && (
              <div className="menubar-dropdown">
                <div className="menu-entry" onClick={() => handleItemClick()}>
                  <span>すべて選択</span>
                  <span className="menu-shortcut">Ctrl+A</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick()}>
                  <span>行を上にコピー</span>
                  <span className="menu-shortcut">Alt+Shift+Up</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick()}>
                  <span>行を下にコピー</span>
                  <span className="menu-shortcut">Alt+Shift+Down</span>
                </div>
              </div>
            )}
          </div>

          {/* 表示(V) */}
          <div
            className={`menubar-item ${activeMenu === 'view' ? 'active' : ''}`}
            onClick={() => handleMenuClick('view')}
          >
            <span>表示(V)</span>
            {activeMenu === 'view' && (
              <div className="menubar-dropdown">
                <div className="menu-entry" onClick={() => handleItemClick(openCommandCenter)}>
                  <span>コマンド パレット...</span>
                  <span className="menu-shortcut">Ctrl+Shift+P</span>
                </div>
                <div className="menu-entry separator" />
                <div className="menu-entry" onClick={() => handleItemClick(toggleLeftSidebar)}>
                  <span>プライマリ サイドバーの切り替え</span>
                  <span className="menu-shortcut">Ctrl+B</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick(toggleTerminal)}>
                  <span>パネルの切り替え</span>
                  <span className="menu-shortcut">Ctrl+J</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick(toggleRightSidebar)}>
                  <span>セカンダリ サイドバーの切り替え</span>
                  <span className="menu-shortcut">Ctrl+Alt+B</span>
                </div>
                <div className="menu-entry separator" />
                <div className="menu-entry" onClick={() => handleItemClick(onOpenRules)}>
                  <span>AI ルール設定 (.aether/rules.md)</span>
                  <span className="menu-shortcut">Ctrl+Shift+U</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick(onOpenGitGraph)}>
                  <span>Git Graph (コミット履歴)</span>
                  <span className="menu-shortcut">Ctrl+Shift+G</span>
                </div>
                <div className="menu-entry separator" />
                <div className="menu-entry" onClick={() => handleItemClick(() => setAppMode('normal'))}>
                  <span>Normal IDE モード</span>
                  <span className="menu-shortcut">Ctrl+Shift+1</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick(() => setAppMode('agent'))}>
                  <span>AI Agent Swarm モード</span>
                  <span className="menu-shortcut">Ctrl+Shift+2</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick(() => setAppMode('os'))}>
                  <span>AI Agent OS モード</span>
                  <span className="menu-shortcut">Ctrl+Shift+3</span>
                </div>
              </div>
            )}
          </div>

          {/* 移動(G) */}
          <div
            className={`menubar-item ${activeMenu === 'go' ? 'active' : ''}`}
            onClick={() => handleMenuClick('go')}
          >
            <span>移動(G)</span>
            {activeMenu === 'go' && (
              <div className="menubar-dropdown">
                <div className="menu-entry" onClick={() => handleItemClick(openCommandCenter)}>
                  <span>ファイルへ移動...</span>
                  <span className="menu-shortcut">Ctrl+P</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick(openCommandCenter)}>
                  <span>シンボルへ移動...</span>
                  <span className="menu-shortcut">Ctrl+Shift+O</span>
                </div>
              </div>
            )}
          </div>

          {/* 実行(R) */}
          <div
            className={`menubar-item ${activeMenu === 'run' ? 'active' : ''}`}
            onClick={() => handleMenuClick('run')}
          >
            <span>実行(R)</span>
            {activeMenu === 'run' && (
              <div className="menubar-dropdown">
                <div className="menu-entry" onClick={() => handleItemClick(onRunAutonomousTeam)}>
                  <span>Autonomous Team 実行</span>
                  <span className="menu-shortcut">Ctrl+Shift+R</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick(toggleTerminal)}>
                  <span>デバッグなしで実行</span>
                  <span className="menu-shortcut">Ctrl+F5</span>
                </div>
              </div>
            )}
          </div>

          {/* ターミナル(T) */}
          <div
            className={`menubar-item ${activeMenu === 'terminal' ? 'active' : ''}`}
            onClick={() => handleMenuClick('terminal')}
          >
            <span>ターミナル(T)</span>
            {activeMenu === 'terminal' && (
              <div className="menubar-dropdown">
                <div className="menu-entry" onClick={() => handleItemClick(toggleTerminal)}>
                  <span>新しいターミナル</span>
                  <span className="menu-shortcut">Ctrl+Shift+`</span>
                </div>
                <div className="menu-entry" onClick={() => handleItemClick(toggleTerminal)}>
                  <span>ターミナルの切り替え</span>
                  <span className="menu-shortcut">Ctrl+`</span>
                </div>
              </div>
            )}
          </div>

          {/* ヘルプ(H) */}
          <div
            className={`menubar-item ${activeMenu === 'help' ? 'active' : ''}`}
            onClick={() => handleMenuClick('help')}
          >
            <span>ヘルプ(H)</span>
            {activeMenu === 'help' && (
              <div className="menubar-dropdown">
                <div className="menu-entry" onClick={() => handleItemClick(onOpenKeybindings)}>
                  <span>キーボード ショートカット</span>
                  <span className="menu-shortcut">Ctrl+K Ctrl+S</span>
                </div>
                <div className="menu-entry separator" />
                <div className="menu-entry" onClick={() => handleItemClick()}>
                  <span>AETHER IDE について</span>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Navigation Arrows */}
        <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
          <div className="nav-arrow-btn" title="戻る (Alt+Left)">
            <ArrowLeft size={13} />
          </div>
          <div className="nav-arrow-btn" title="進む (Alt+Right)">
            <ArrowRight size={13} />
          </div>
        </div>
      </div>

      {/* Center Search Pill (VS Code Command Center) */}
      <div className="titlebar-center">
        <div className="titlebar-search" onClick={openCommandCenter}>
          <Search size={13} style={{ marginRight: '4px', opacity: 0.7 }} />
          <span>{workspaceName} [管理者]</span>
          <kbd style={{ marginLeft: 'auto' }}>Ctrl+P</kbd>
        </div>
      </div>

      {/* Right Controls: Mode badges, layout toggles */}
      <div className="titlebar-right">
        {/* 3-in-1 Compact Mode Switcher */}
        <div className="mode-switcher">
          <button
            className={`mode-btn ${appMode === 'normal' ? 'active' : ''}`}
            onClick={() => setAppMode('normal')}
            title="Normal IDE Mode"
          >
            <Layers size={12} />
            <span>IDE</span>
          </button>
          <button
            className={`mode-btn ${appMode === 'agent' ? 'active' : ''}`}
            onClick={() => setAppMode('agent')}
            title="Multi-Agent Autonomous Pipeline"
          >
            <Bot size={12} />
            <span>Swarm</span>
          </button>
          <button
            className={`mode-btn ${appMode === 'os' ? 'active' : ''}`}
            onClick={() => setAppMode('os')}
            title="AI Agent OS Host Control"
          >
            <Cpu size={12} />
            <span>OS</span>
          </button>
        </div>

        {/* Layout Toggle Icons (Left, Bottom, Right Panel) */}
        <button
          className="layout-icon-btn"
          onClick={toggleLeftSidebar}
          title="プライマリ サイドバーの切り替え (Ctrl+B)"
        >
          <PanelLeft size={14} />
        </button>
        <button
          className="layout-icon-btn"
          onClick={toggleTerminal}
          title="パネルの切り替え (Ctrl+J)"
        >
          <PanelBottom size={14} />
        </button>
        <button
          className="layout-icon-btn"
          onClick={toggleRightSidebar}
          title="セカンダリ サイドバーの切り替え"
        >
          <PanelRight size={14} />
        </button>
      </div>
    </header>
  );
};
