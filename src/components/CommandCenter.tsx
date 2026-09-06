import React, { useEffect, useState } from 'react';
import { Search, Terminal, Sparkles, FileText, Settings, Shield } from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  category: 'File' | 'Action' | 'Agent' | 'View';
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
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  isOpen,
  onClose,
  availableFiles,
  onOpenFile,
  onRunTeamPipeline,
  onOpenSettings,
  onToggleTerminal,
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
      title: 'Run 5-Stage Autonomous Development Team (Architect -> Coder -> Test -> Review -> Security)',
      category: 'Agent',
      icon: <Sparkles size={14} color="var(--accent-primary)" />,
      action: () => {
        onRunTeamPipeline();
        onClose();
      },
    },
    {
      id: 'cmd-terminal',
      title: 'Toggle Sandboxed Terminal Dock',
      category: 'View',
      icon: <Terminal size={14} color="var(--accent-cyan)" />,
      action: () => {
        onToggleTerminal();
        onClose();
      },
    },
    {
      id: 'cmd-settings',
      title: 'Open Settings & AI Model Provider Configurations',
      category: 'Action',
      icon: <Settings size={14} color="var(--text-secondary)" />,
      action: () => {
        onOpenSettings();
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
