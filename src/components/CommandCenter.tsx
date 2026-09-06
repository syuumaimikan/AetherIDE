import React, { useEffect, useState } from 'react';
import {
  Search,
  Terminal,
  Sparkles,
  FileText,
  Settings,
  Shield,
  GitBranch,
  GitCommit,
  FolderOpen,
  FilePlus,
  Keyboard,
  Cpu,
  Bot,
  Layers,
  BookOpen,
} from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  category: 'File' | 'Action' | 'Agent' | 'View' | 'Git' | 'Preferences' | 'Help';
  icon?: React.ReactNode;
  action: () => void;
}

interface CommandCenterProps {
  isOpen: boolean;
  onClose: () => void;
  availableFiles: string[];
  onOpenFile: (path: string) => void;
  onRunTeamPipeline: () => void;
  onOpenSettings: () => void;
  onToggleTerminal: () => void;
  onOpenRules?: () => void;
  onOpenKeybindings?: () => void;
  onOpenGitGraph?: () => void;
  onOpenFolder?: () => void;
  onNewFile?: () => void;
  onSwitchMode?: (mode: 'normal' | 'agent' | 'os') => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  isOpen,
  onClose,
  availableFiles,
  onOpenFile,
  onRunTeamPipeline,
  onOpenSettings,
  onToggleTerminal,
  onOpenRules,
  onOpenKeybindings,
  onOpenGitGraph,
  onOpenFolder,
  onNewFile,
  onSwitchMode,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const baseCommands: CommandItem[] = [
    {
      id: 'cmd-pipeline',
      title: 'Agent: 5-Stage Autonomous Development Swarm 実行 (Architect -> Coder -> QA -> Audit -> Security)',
      category: 'Agent',
      icon: <Sparkles size={14} color="var(--vscode-blue)" />,
      action: () => {
        onRunTeamPipeline();
        onClose();
      },
    },
    {
      id: 'cmd-rules',
      title: 'AI: プロジェクトルール & システムプロンプト編集 (.aether/rules.md)',
      category: 'Agent',
      icon: <BookOpen size={14} color="#81b88b" />,
      action: () => {
        if (onOpenRules) onOpenRules();
        onClose();
      },
    },
    {
      id: 'cmd-git-graph',
      title: 'Git: Git Graph (コミット履歴 & ブランチグラフを表示)',
      category: 'Git',
      icon: <GitCommit size={14} color="#38bdf8" />,
      action: () => {
        if (onOpenGitGraph) onOpenGitGraph();
        onClose();
      },
    },
    {
      id: 'cmd-open-folder',
      title: 'File: フォルダーを開く... (Native OS Dialog)',
      category: 'File',
      icon: <FolderOpen size={14} color="#dcb67a" />,
      action: () => {
        if (onOpenFolder) onOpenFolder();
        onClose();
      },
    },
    {
      id: 'cmd-new-file',
      title: 'File: 新しいファイルを作成',
      category: 'File',
      icon: <FilePlus size={14} color="#38bdf8" />,
      action: () => {
        if (onNewFile) onNewFile();
        onClose();
      },
    },
    {
      id: 'cmd-mode-normal',
      title: 'View: Normal IDE モードに切り替え (Pure High-Speed Editor)',
      category: 'View',
      icon: <Layers size={14} color="var(--vscode-text-secondary)" />,
      action: () => {
        if (onSwitchMode) onSwitchMode('normal');
        onClose();
      },
    },
    {
      id: 'cmd-mode-agent',
      title: 'View: AI Agent Swarm モードに切り替え (Multi-Agent Team Orchestration)',
      category: 'View',
      icon: <Bot size={14} color="var(--vscode-blue)" />,
      action: () => {
        if (onSwitchMode) onSwitchMode('agent');
        onClose();
      },
    },
    {
      id: 'cmd-mode-os',
      title: 'View: AI Agent OS モードに切り替え (Host Process & Network Control Cockpit)',
      category: 'View',
      icon: <Cpu size={14} color="#a855f7" />,
      action: () => {
        if (onSwitchMode) onSwitchMode('os');
        onClose();
      },
    },
    {
      id: 'cmd-terminal',
      title: 'View: サンドボックス統合ターミナル ドックの切り替え',
      category: 'View',
      icon: <Terminal size={14} color="#81b88b" />,
      action: () => {
        onToggleTerminal();
        onClose();
      },
    },
    {
      id: 'cmd-settings',
      title: 'Preferences: 設定 & AI モデルプロバイダー構成 (OpenAI / Anthropic / Local LLM)',
      category: 'Preferences',
      icon: <Settings size={14} color="var(--vscode-text-secondary)" />,
      action: () => {
        onOpenSettings();
        onClose();
      },
    },
    {
      id: 'cmd-keybindings',
      title: 'Help: キーボード ショートカット リファレンス (Keybindings)',
      category: 'Help',
      icon: <Keyboard size={14} color="var(--vscode-text-secondary)" />,
      action: () => {
        if (onOpenKeybindings) onOpenKeybindings();
        onClose();
      },
    },
  ];

  const fileCommands: CommandItem[] = availableFiles.map((file) => ({
    id: `file-${file}`,
    title: file,
    category: 'File',
    icon: <FileText size={14} color="var(--text-secondary)" />,
    action: () => {
      onOpenFile(file);
      onClose();
    },
  }));

  const allItems = [...baseCommands, ...fileCommands];
  const filtered = allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="command-center-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-input-wrapper">
          <Search size={16} color="var(--accent-primary)" />
          <input
            type="text"
            className="command-input"
            placeholder="Type a command or filename..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <kbd style={{ fontSize: '10px', background: 'var(--bg-app)', padding: '2px 6px', borderRadius: 4 }}>
            ESC to close
          </kbd>
        </div>

        <div className="command-list">
          {filtered.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
              No matching commands or files.
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                className={`command-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={item.action}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.icon}
                  <span>{item.title}</span>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-app)',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  {item.category}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
