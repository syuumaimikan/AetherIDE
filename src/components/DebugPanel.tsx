import React, { useState } from 'react';
import {
  Bug,
  ChevronDown,
  ChevronRight,
  Circle,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Square,
  StepForward,
  RotateCcw,
} from 'lucide-react';

interface DebugPanelProps {
  onStartDebug?: (configName: string) => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ onStartDebug }) => {
  const [selectedConfig, setSelectedConfig] = useState('aether-desktop-debug');
  const [isRunning, setIsRunning] = useState(false);
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
    if (onStartDebug) {
      onStartDebug(selectedConfig);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
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
            <Plus size={12} />
          </div>
          {expandedSections.watch && (
            <div style={{ padding: '4px 16px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <div style={{ color: 'var(--vscode-text-muted)', fontStyle: 'italic' }}>
                評価する式を追加するには [+] をクリックしてください。
              </div>
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
                <div style={{ color: '#9cdcfe' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' }}>
                <Circle size={9} fill="#f43f5e" color="#f43f5e" />
                <span style={{ color: 'var(--vscode-text-bright)' }}>src/main.rs : 12</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0' }}>
                <Circle size={9} fill="#f43f5e" color="#f43f5e" />
                <span style={{ color: 'var(--vscode-text-bright)' }}>crates/aether-core/src/events.rs : 34</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
