import React, { useState } from 'react';
import {
  Bug,
  ChevronDown,
  ChevronRight,
  Circle,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Settings,
  Square,
  StepForward,
  CornerDownRight,
  CornerUpLeft,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface DebugPanelProps {
  onStartDebug?: (configName: string) => void;
  onOpenFileAtLine?: (path: string, line?: number) => void;
}

interface WatchItem {
  id: string;
  expr: string;
  value: string;
}

interface BreakpointItem {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ onStartDebug, onOpenFileAtLine }) => {
  const [selectedConfig, setSelectedConfig] = useState('aether-desktop-debug');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [newWatchInput, setNewWatchInput] = useState('');
  const [isAddingWatch, setIsAddingWatch] = useState(false);
  const [watchList, setWatchList] = useState<WatchItem[]>([
    { id: 'w1', expr: 'metrics.total_tokens_used', value: '9260' },
    { id: 'w2', expr: 'pipeline_stages.len()', value: '5' },
  ]);
  const [breakpoints, setBreakpoints] = useState<BreakpointItem[]>([
    { id: 'b1', file: '/src/main.rs', line: 12, enabled: true },
    { id: 'b2', file: '/crates/aether-core/src/events.rs', line: 34, enabled: true },
  ]);
  const [expandedSections, setExpandedSections] = useState({
    variables: true,
    watch: true,
    callstack: true,
    breakpoints: true,
  });

  const toggleSection = (key: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    if (onStartDebug) {
      onStartDebug(selectedConfig);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
  };

  const handleAddWatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchInput.trim()) return;
    setWatchList((prev) => [
      ...prev,
      {
        id: `w-${Date.now()}`,
        expr: newWatchInput.trim(),
        value: 'Ok(true)',
      },
    ]);
    setNewWatchInput('');
    setIsAddingWatch(false);
  };

  const removeWatch = (id: string) => {
    setWatchList((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleBreakpoint = (id: string) => {
    setBreakpoints((prev) =>
      prev.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b))
    );
  };

  return (
    <div className="left-sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <span style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>
          実行とデバッグ : RUN
        </span>
      </div>

      {/* Configuration & Launch Bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--vscode-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            className="input-text"
            style={{
              flex: 1,
              fontSize: '11px',
              padding: '4px 6px',
              background: 'var(--vscode-bg-input)',
              border: '1px solid var(--vscode-border)',
              color: '#ffffff',
            }}
            value={selectedConfig}
            onChange={(e) => setSelectedConfig(e.target.value)}
          >
            <option value="aether-desktop-debug">Aether Desktop (Debug)</option>
            <option value="cargo-test-workspace">Cargo Test (All 11 Crates)</option>
            <option value="vite-dev-server">Vite Web Dev Server (Port 5173)</option>
          </select>

          {isRunning ? (
            <button
              className="btn btn-danger btn-sm"
              style={{ padding: '4px 8px' }}
              onClick={handleStop}
              title="デバッグの停止 (Shift+F5)"
            >
              <Square size={12} fill="#fb7185" />
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              style={{ padding: '4px 8px', background: '#81b88b', color: '#181818' }}
              onClick={handleStart}
              title="デバッグの開始 (F5)"
            >
              <Play size={12} fill="#181818" />
            </button>
          )}
        </div>

        {/* Floating Style Debug Actions Bar when Active */}
        {isRunning && (
          <div
            style={{
              marginTop: '8px',
              padding: '4px 8px',
              background: 'var(--vscode-bg-surface)',
              border: '1px solid var(--vscode-border)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            <button
              className="tab-close-btn"
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? '続行 (F5)' : '一時停止 (F6)'}
              style={{ padding: '3px 6px' }}
            >
              {isPaused ? <Play size={13} color="#81b88b" fill="#81b88b" /> : <Pause size={13} color="#38bdf8" />}
            </button>
            <button
              className="tab-close-btn"
              onClick={() => {}}
              title="ステップ オーバー (F10)"
              style={{ padding: '3px 6px' }}
            >
              <StepForward size={13} color="#38bdf8" />
            </button>
            <button
              className="tab-close-btn"
              onClick={() => {}}
              title="ステップ イン (F11)"
              style={{ padding: '3px 6px' }}
            >
              <CornerDownRight size={13} color="#38bdf8" />
            </button>
            <button
              className="tab-close-btn"
              onClick={() => {}}
              title="ステップ アウト (Shift+F11)"
              style={{ padding: '3px 6px' }}
            >
              <CornerUpLeft size={13} color="#38bdf8" />
            </button>
            <button
              className="tab-close-btn"
              onClick={handleStart}
              title="再起動 (Ctrl+Shift+F5)"
              style={{ padding: '3px 6px' }}
            >
              <RotateCcw size={13} color="#81b88b" />
            </button>
            <button
              className="tab-close-btn"
              onClick={handleStop}
              title="停止 (Shift+F5)"
              style={{ padding: '3px 6px' }}
            >
              <Square size={12} fill="#f43f5e" color="#f43f5e" />
            </button>
          </div>
        )}
      </div>

      {/* Debug Collapsible Sections */}
      <div className="sidebar-content" style={{ padding: '4px 0' }}>
        {/* 1. Variables */}
        <div>
          <div
            className="sidebar-header"
            style={{ height: '26px', cursor: 'pointer', background: 'transparent' }}
            onClick={() => toggleSection('variables')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {expandedSections.variables ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>変数 (VARIABLES)</span>
            </div>
          </div>
          {expandedSections.variables && (
            <div style={{ padding: '4px 16px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              {isRunning ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#9cdcfe' }}>workspace_root</span>
                    <span style={{ color: '#ce9178' }}>"D:\\Rust_Proj2\\AetherIDE"</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#9cdcfe' }}>active_threads</span>
                    <span style={{ color: '#b5cea8' }}>16</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                    <span style={{ color: '#9cdcfe' }}>sandbox_policy</span>
                    <span style={{ color: '#4ec9b0' }}>Moderate (Ask)</span>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--vscode-text-muted)', fontStyle: 'italic' }}>
                  デバッグセッションがアクティブではありません。
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. Watch */}
        <div>
          <div
            className="sidebar-header"
            style={{ height: '26px', cursor: 'pointer', background: 'transparent' }}
            onClick={() => toggleSection('watch')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {expandedSections.watch ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>ウォッチ式 (WATCH)</span>
            </div>
            <button
              className="tab-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingWatch(true);
              }}
              title="ウォッチ式を追加"
            >
              <Plus size={12} />
            </button>
          </div>
          {expandedSections.watch && (
            <div style={{ padding: '4px 16px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              {isAddingWatch && (
                <form onSubmit={handleAddWatch} style={{ marginBottom: '6px' }}>
                  <input
                    type="text"
                    className="input-text"
                    style={{ width: '100%', fontSize: '11px', padding: '2px 6px' }}
                    placeholder="評価する式を入力 (Enterで追加)..."
                    value={newWatchInput}
                    onChange={(e) => setNewWatchInput(e.target.value)}
                    autoFocus
                    onBlur={() => {
                      if (!newWatchInput.trim()) setIsAddingWatch(false);
                    }}
                  />
                </form>
              )}
              {watchList.length === 0 && !isAddingWatch ? (
                <div style={{ color: 'var(--vscode-text-muted)', fontStyle: 'italic' }}>
                  評価する式を追加するには [+] をクリックしてください。
                </div>
              ) : (
                watchList.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '2px 0',
                    }}
                  >
                    <span style={{ color: '#9cdcfe' }}>{w.expr}:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#b5cea8' }}>{w.value}</span>
                      <button
                        className="tab-close-btn"
                        onClick={() => removeWatch(w.id)}
                        title="削除"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 3. Call Stack */}
        <div>
          <div
            className="sidebar-header"
            style={{ height: '26px', cursor: 'pointer', background: 'transparent' }}
            onClick={() => toggleSection('callstack')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {expandedSections.callstack ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>コール スタック (CALL STACK)</span>
            </div>
          </div>
          {expandedSections.callstack && (
            <div style={{ padding: '4px 16px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              {isRunning ? (
                <div
                  style={{ color: '#9cdcfe', cursor: 'pointer' }}
                  onClick={() => onOpenFileAtLine?.('/src-tauri/src/lib.rs', 10)}
                  title="クリックしてソースへジャンプ"
                >
                  main::aether_desktop_lib::run (src-tauri\src\lib.rs:10)
                </div>
              ) : (
                <div style={{ color: 'var(--vscode-text-muted)', fontStyle: 'italic' }}>
                  実行中のスレッドはありません。
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Breakpoints */}
        <div>
          <div
            className="sidebar-header"
            style={{ height: '26px', cursor: 'pointer', background: 'transparent' }}
            onClick={() => toggleSection('breakpoints')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {expandedSections.breakpoints ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <span>ブレークポイント (BREAKPOINTS)</span>
            </div>
          </div>
          {expandedSections.breakpoints && (
            <div style={{ padding: '4px 16px', fontSize: '11px' }}>
              {breakpoints.map((bp) => (
                <div
                  key={bp.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '3px 0',
                    cursor: 'pointer',
                  }}
                  onClick={() => onOpenFileAtLine?.(bp.file, bp.line)}
                  title="クリックしてブレークポイント位置へジャンプ"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={bp.enabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleBreakpoint(bp.id);
                      }}
                      style={{ accentColor: '#f43f5e', cursor: 'pointer' }}
                    />
                    <Circle
                      size={9}
                      fill={bp.enabled ? '#f43f5e' : 'transparent'}
                      color="#f43f5e"
                    />
                    <span
                      style={{
                        color: bp.enabled ? 'var(--vscode-text-bright)' : 'var(--vscode-text-muted)',
                        textDecoration: bp.enabled ? 'none' : 'line-through',
                      }}
                    >
                      {bp.file.split(/[\\/]/).pop()} : {bp.line}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--vscode-text-muted)' }}>
                    {bp.file.startsWith('/crates') ? 'crate' : 'app'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
