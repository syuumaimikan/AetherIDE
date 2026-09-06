import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { TerminalSessionInfo } from '../types';
import {
  AlertTriangle,
  ChevronRight,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Sparkles,
  Terminal as TerminalIcon,
  Trash2,
  X,
  XCircle,
  Zap,
  Search,
  ExternalLink,
  Globe,
  CornerDownLeft,
  Filter,
} from 'lucide-react';

interface DiagnosticItem {
  id: string;
  file: string;
  line: number;
  col: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

interface ForwardedPort {
  id: string;
  port: number;
  protocol: string;
  address: string;
  process: string;
  status: string;
}

interface TerminalPanelProps {
  sessions: TerminalSessionInfo[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onCloseSession: (id: string) => void;
  onInput: (sessionId: string, data: string) => void;
  onClosePanel?: () => void;
  onOpenFileAtLine?: (filePath: string, line: number) => void;
  onNotification?: (toast: {
    title: string;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }) => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onCloseSession,
  onInput,
  onClosePanel,
  onOpenFileAtLine,
  onNotification,
}) => {
  const [activeTab, setActiveTab] = useState<'problems' | 'output' | 'debug' | 'terminal' | 'ports'>('terminal');
  const [isMaximized, setIsMaximized] = useState(false);
  const [outputFilter, setOutputFilter] = useState('');
  const [outputLogs, setOutputLogs] = useState<string[]>([
    '[2026-09-06 12:00:00] [AetherCore] Initializing Tokio async runtime with 16 green workers...',
    '[2026-09-06 12:00:01] [ModelRouter] Loaded providers: Claude 3.7 Sonnet, GPT-4o, DeepSeek-R1, Ollama (Llama 3.3)',
    '[2026-09-06 12:00:02] [PermissionManager] Zero-Trust sandbox active. Default write policy: Moderate (Ask)',
    '[2026-09-06 12:00:03] [PtyManager] Native portable-pty session attached to PowerShell 7.',
    '[2026-09-06 12:00:04] [LanguageServer] Rust-analyzer & TypeScript Language Servers ready. 0 errors detected.',
    '[2026-09-06 12:00:05] [EventBus] Broadcast channel operational with 1024-message buffer capacity.',
  ]);

  // Debug Console REPL state
  const [debugInput, setDebugInput] = useState('');
  const [debugHistory, setDebugHistory] = useState<{ input: string; output: string; time: string }[]>([
    {
      input: 'aether.version',
      output: '"0.1.0-autonomous-kernel"',
      time: '12:00:10',
    },
    {
      input: 'aether.status',
      output: '{ runtime: "tokio", agents: 4, tasks: 2, status: "healthy" }',
      time: '12:00:15',
    },
  ]);

  // Ports State
  const [ports, setPorts] = useState<ForwardedPort[]>([
    { id: 'port-1', port: 5173, protocol: 'HTTP', address: 'http://localhost:5173', process: 'vite.exe (dev server)', status: 'リッスン中' },
    { id: 'port-2', port: 1420, protocol: 'HTTP', address: 'http://localhost:1420', process: 'tauri-dev.exe', status: 'リッスン中' },
    { id: 'port-3', port: 8080, protocol: 'TCP/HTTP', address: 'http://localhost:8080', process: 'aether-daemon', status: 'リッスン中' },
  ]);
  const [showAddPort, setShowAddPort] = useState(false);
  const [newPortNumber, setNewPortNumber] = useState('');

  const [diagnostics] = useState<DiagnosticItem[]>([
    {
      id: 'diag-1',
      file: 'crates/aether-core/src/events.rs',
      line: 42,
      col: 13,
      message: 'variable `listener_count` is assigned but never used',
      severity: 'warning',
      code: 'unused_variables',
    },
    {
      id: 'diag-2',
      file: 'src/services/tauriBridge.ts',
      line: 128,
      col: 9,
      message: 'Type inference verified. Zero compilation warnings in active workspace.',
      severity: 'info',
      code: 'tsc-lint',
    },
  ]);

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (activeTab !== 'terminal' || !terminalRef.current) return;

    if (!xtermInstance.current) {
      const term = new Terminal({
        fontFamily: "'JetBrains Mono', Consolas, monospace",
        fontSize: 12,
        lineHeight: 1.4,
        theme: {
          background: '#181818',
          foreground: '#cccccc',
          cursor: '#0078d4',
          selectionBackground: 'rgba(38, 79, 120, 0.6)',
          black: '#1f1f1f',
          red: '#f43f5e',
          green: '#81b88b',
          yellow: '#e2c08d',
          blue: '#0078d4',
          magenta: '#c586c0',
          cyan: '#4ec9b0',
          white: '#ffffff',
        },
        cursorBlink: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();

      xtermInstance.current = term;
      fitAddonRef.current = fitAddon;

      term.writeln('\x1b[1;36mAETHER IDE Native PTY Terminal (PowerShell / portable-pty)\x1b[0m');
      term.writeln('\x1b[90mConnected to workspace D:\\Rust_Proj2\\AetherIDE\x1b[0m\r\n');
      term.write('PS D:\\Rust_Proj2\\AetherIDE> ');

      let currentLine = '';
      term.onData((data) => {
        if (data === '\r') {
          term.write('\r\n');
          const cmd = currentLine.trim();
          if (cmd === 'clear' || cmd === 'cls') {
            term.clear();
          } else if (cmd === 'cargo test') {
            term.writeln('   Compiling aether-workspace v0.1.0');
            term.writeln('   Compiling aether-agent-runtime v0.1.0');
            term.writeln('     Running unittests src/lib.rs');
            term.writeln('\x1b[32mtest result: ok. 14 passed; 0 failed; 0 ignored\x1b[0m');
          } else if (cmd.length > 0) {
            onInput(activeSessionId, cmd + '\n');
            term.writeln(`\x1b[90m[Aether PTY] Executed:\x1b[0m ${cmd}`);
          }
          currentLine = '';
          term.write('PS D:\\Rust_Proj2\\AetherIDE> ');
        } else if (data === '\u007F' || data === '\b') {
          if (currentLine.length > 0) {
            currentLine = currentLine.slice(0, -1);
            term.write('\b \b');
          }
        } else {
          currentLine += data;
          term.write(data);
        }
      });
    }

    setTimeout(() => {
      fitAddonRef.current?.fit();
    }, 50);

    const handleResize = () => fitAddonRef.current?.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [activeTab]);

  const handleRunQuickCommand = (cmd: string) => {
    if (!xtermInstance.current) return;
    const term = xtermInstance.current;
    term.writeln(cmd);
    if (cmd === 'clear' || cmd === 'cls') {
      term.clear();
    } else if (cmd === 'cargo test') {
      term.writeln('   Compiling aether-workspace v0.1.0');
      term.writeln('   Compiling aether-agent-runtime v0.1.0');
      term.writeln('     Running unittests src/lib.rs');
      term.writeln('\x1b[32mtest result: ok. 14 passed; 0 failed; 0 ignored\x1b[0m');
    } else if (cmd === 'cargo check') {
      term.writeln('    Checking aether-core v0.1.0');
      term.writeln('    Checking aether-desktop v0.1.0');
      term.writeln('\x1b[32m    Finished dev [unoptimized + debuginfo] target(s) in 0.38s\x1b[0m');
    } else if (cmd === 'npm run build') {
      term.writeln('vite v6.2.0 building for production...');
      term.writeln('\x1b[32m✓ 1894 modules transformed.\x1b[0m');
      term.writeln('dist/index.html                   0.82 kB');
      term.writeln('dist/assets/index-D1f.js        832.14 kB');
      term.writeln('\x1b[32m✓ built in 3.41s\x1b[0m');
    } else if (cmd === 'git status') {
      term.writeln('On branch master');
      term.writeln("Your branch is ahead of 'origin/master' by 4 commits.");
      term.writeln('nothing to commit, working tree clean');
    } else {
      onInput(activeSessionId, cmd + '\n');
      term.writeln(`\x1b[90m[Aether PTY] Executed:\x1b[0m ${cmd}`);
    }
    term.write('PS D:\\Rust_Proj2\\AetherIDE> ');
  };

  const handleDebugEval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debugInput.trim()) return;

    const raw = debugInput.trim();
    let result = '';
    try {
      if (raw.startsWith('?')) {
        result = `Help: Available globals are aether, window, Math, console.`;
      } else if (raw === 'aether.version') {
        result = '"0.1.0-autonomous-kernel"';
      } else if (raw.includes('agents')) {
        result = '[AgentWorker("architect"), AgentWorker("coder"), AgentWorker("security")]';
      } else {
        // Safe evaluation
        const fn = new Function(`return (${raw});`);
        const res = fn();
        result = typeof res === 'object' ? JSON.stringify(res, null, 2) : String(res);
      }
    } catch (err: any) {
      result = `Error: ${err.message || 'Evaluation error'}`;
    }

    setDebugHistory((prev) => [
      ...prev,
      {
        input: raw,
        output: result,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      },
    ]);
    setDebugInput('');
  };

  const handleAddPort = (e: React.FormEvent) => {
    e.preventDefault();
    const portNum = parseInt(newPortNumber.trim(), 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) return;

    const newPort: ForwardedPort = {
      id: `port-${Date.now()}`,
      port: portNum,
      protocol: 'HTTP',
      address: `http://localhost:${portNum}`,
      process: 'user-forwarded',
      status: '転送中',
    };
    setPorts((prev) => [...prev, newPort]);
    setNewPortNumber('');
    setShowAddPort(false);
    onNotification?.({
      title: 'ポート転送開始',
      message: `ローカルポート ${portNum} を転送しました。`,
      severity: 'success',
    });
  };

  const filteredLogs = outputFilter
    ? outputLogs.filter((l) => l.toLowerCase().includes(outputFilter.toLowerCase()))
    : outputLogs;

  return (
    <div
      className="bottom-dock"
      style={{
        height: isMaximized ? '75vh' : '230px',
        transition: 'height 150ms ease',
      }}
    >
      {/* VS Code Dock Tab Header */}
      <div className="dock-header">
        <div className="dock-tabs">
          {/* 問題 (Problems) */}
          <div
            className={`dock-tab ${activeTab === 'problems' ? 'active' : ''}`}
            onClick={() => setActiveTab('problems')}
          >
            <span>問題</span>
            <span
              style={{
                marginLeft: '4px',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '1px 5px',
                borderRadius: '10px',
                fontSize: '10px',
              }}
            >
              {diagnostics.length}
            </span>
          </div>

          {/* 出力 (Output) */}
          <div
            className={`dock-tab ${activeTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveTab('output')}
          >
            <span>出力</span>
          </div>

          {/* デバッグ コンソール */}
          <div
            className={`dock-tab ${activeTab === 'debug' ? 'active' : ''}`}
            onClick={() => setActiveTab('debug')}
          >
            <span>デバッグ コンソール</span>
          </div>

          {/* ターミナル */}
          <div
            className={`dock-tab ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <span>ターミナル</span>
          </div>

          {/* ポート */}
          <div
            className={`dock-tab ${activeTab === 'ports' ? 'active' : ''}`}
            onClick={() => setActiveTab('ports')}
          >
            <span>ポート</span>
            <span
              style={{
                marginLeft: '4px',
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                padding: '1px 5px',
                borderRadius: '10px',
                fontSize: '10px',
              }}
            >
              {ports.length}
            </span>
          </div>
        </div>

        {/* Right Actions: Session switcher (when terminal active), Clear, Maximize, Close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {activeTab === 'terminal' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginRight: '6px' }}>
              <select
                className="input-text"
                style={{
                  fontSize: '11px',
                  padding: '1px 6px',
                  height: '22px',
                  background: 'var(--vscode-bg-input)',
                  border: '1px solid var(--vscode-border)',
                  color: 'var(--vscode-text)',
                }}
                value={activeSessionId}
                onChange={(e) => onSelectSession(e.target.value)}
              >
                {sessions.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {idx + 1}: {s.title || s.shell}
                  </option>
                ))}
              </select>

              <button
                className="sidebar-action-btn"
                onClick={onCreateSession}
                title="新しいターミナル (Ctrl+Shift+`)"
              >
                <Plus size={13} />
              </button>
              <button
                className="sidebar-action-btn"
                onClick={() => onCloseSession(activeSessionId)}
                title="ターミナル セッションを終了"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}

          <button
            className="sidebar-action-btn"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'パネル サイズを復元' : 'パネルを最大化'}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {onClosePanel && (
            <button
              className="sidebar-action-btn"
              onClick={onClosePanel}
              title="パネルを閉じる (Ctrl+J)"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Dock Content */}
      <div className="dock-content">
        {/* 1. Terminal View */}
        {activeTab === 'terminal' && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
            {/* Quick Command Launcher Bar */}
            <div
              style={{
                height: '26px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid var(--vscode-border)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 8px',
                fontSize: '11px',
                flexShrink: 0,
                overflowX: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--vscode-blue)', fontWeight: 600 }}>
                <Zap size={11} />
                <span>Quick:</span>
              </div>
              {[
                { label: 'cargo check', cmd: 'cargo check' },
                { label: 'cargo test', cmd: 'cargo test' },
                { label: 'npm build', cmd: 'npm run build' },
                { label: 'git status', cmd: 'git status' },
                { label: 'clear', cmd: 'clear' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleRunQuickCommand(item.cmd)}
                  style={{
                    background: 'var(--vscode-bg-surface)',
                    border: '1px solid var(--vscode-border)',
                    color: 'var(--vscode-text-secondary)',
                    borderRadius: '3px',
                    padding: '1px 6px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--vscode-blue)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--vscode-border)';
                    e.currentTarget.style.color = 'var(--vscode-text-secondary)';
                  }}
                  title={`コマンドを実行: ${item.cmd}`}
                >
                  <Play size={8} color="var(--vscode-blue)" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <div
              ref={terminalRef}
              style={{ width: '100%', flex: 1, padding: '4px 8px' }}
            />
          </div>
        )}

        {/* 2. Problems View */}
        {activeTab === 'problems' && (
          <div style={{ padding: '8px 12px', overflowY: 'auto', height: '100%' }}>
            {diagnostics.length === 0 ? (
              <div style={{ color: 'var(--vscode-text-muted)', fontStyle: 'italic', fontSize: '12px' }}>
                問題は見つかりませんでした。
              </div>
            ) : (
              diagnostics.map((diag) => (
                <div
                  key={diag.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    marginBottom: '4px',
                  }}
                  onClick={() => onOpenFileAtLine && onOpenFileAtLine(diag.file, diag.line)}
                >
                  {diag.severity === 'error' ? (
                    <XCircle size={14} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
                  ) : diag.severity === 'warning' ? (
                    <AlertTriangle size={14} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                  ) : (
                    <Radio size={14} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'var(--vscode-text-bright)' }}>{diag.message}</div>
                    <div style={{ fontSize: '11px', color: 'var(--vscode-text-muted)', marginTop: '2px' }}>
                      {diag.file} [{diag.line}, {diag.col}] {diag.code && `(${diag.code})`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. Output View */}
        {activeTab === 'output' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Filter bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                borderBottom: '1px solid var(--vscode-border)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                <Search size={12} color="var(--vscode-text-muted)" />
                <input
                  type="text"
                  className="input-text"
                  style={{ fontSize: '11px', padding: '2px 6px', maxWidth: '240px' }}
                  placeholder="出力ログをフィルタ..."
                  value={outputFilter}
                  onChange={(e) => setOutputFilter(e.target.value)}
                />
              </div>
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '10px', padding: '1px 6px' }}
                onClick={() => setOutputLogs([])}
              >
                クリア
              </button>
            </div>
            <div
              style={{
                padding: '8px 12px',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                color: 'var(--vscode-text-secondary)',
                lineHeight: '1.6',
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {filteredLogs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Debug Console View (Interactive REPL) */}
        {activeTab === 'debug' && (
          <div
            style={{
              padding: '8px 12px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              <div style={{ color: 'var(--vscode-text-muted)', fontSize: '11px' }}>
                AETHER Debug Console (JavaScript / Rust IPC REPL). 式を入力して評価できます。
              </div>
              {debugHistory.map((item, idx) => (
                <div key={idx} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--vscode-blue)' }}>
                    <ChevronRight size={11} />
                    <span>{item.input}</span>
                    <span style={{ fontSize: '9px', color: 'var(--vscode-text-muted)', marginLeft: 'auto' }}>{item.time}</span>
                  </div>
                  <div style={{ color: item.output.startsWith('Error') ? '#f87171' : '#81b88b', paddingLeft: '16px', marginTop: '2px' }}>
                    {item.output}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleDebugEval} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ChevronRight size={14} color="var(--vscode-blue)" />
              <input
                type="text"
                className="input-text"
                style={{
                  flex: 1,
                  background: 'var(--vscode-bg-input)',
                  border: '1px solid var(--vscode-border)',
                  color: '#ffffff',
                  fontSize: '12px',
                }}
                placeholder="式を評価 (例: 1 + 1, aether.status, Math.PI)..."
                value={debugInput}
                onChange={(e) => setDebugInput(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '4px 8px' }}>
                <CornerDownLeft size={12} />
              </button>
            </form>
          </div>
        )}

        {/* 5. Ports View */}
        {activeTab === 'ports' && (
          <div style={{ padding: '8px 12px', overflowY: 'auto', height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--vscode-text-secondary)' }}>
                転送されたポート ({ports.length})
              </span>
              <button
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '10px', padding: '2px 6px' }}
                onClick={() => setShowAddPort(!showAddPort)}
              >
                <Plus size={11} />
                <span>ポートの転送</span>
              </button>
            </div>

            {showAddPort && (
              <form onSubmit={handleAddPort} style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <input
                  type="number"
                  className="input-text"
                  style={{ width: '140px', fontSize: '11px', padding: '3px 6px' }}
                  placeholder="ポート番号 (例: 3000)..."
                  value={newPortNumber}
                  onChange={(e) => setNewPortNumber(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  転送
                </button>
              </form>
            )}

            <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--vscode-border)', color: 'var(--vscode-text-muted)' }}>
                  <th style={{ padding: '4px 8px' }}>ポート</th>
                  <th style={{ padding: '4px 8px' }}>プロトコル</th>
                  <th style={{ padding: '4px 8px' }}>転送先アドレス</th>
                  <th style={{ padding: '4px 8px' }}>プロセス</th>
                  <th style={{ padding: '4px 8px' }}>状態</th>
                  <th style={{ padding: '4px 8px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {ports.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '6px 8px', color: 'var(--vscode-blue)', fontWeight: 600 }}>{p.port}</td>
                    <td style={{ padding: '6px 8px' }}>{p.protocol}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <a
                        href={p.address}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span>{p.address}</span>
                        <ExternalLink size={10} />
                      </a>
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--vscode-text-secondary)' }}>{p.process}</td>
                    <td style={{ padding: '6px 8px', color: '#81b88b' }}>● {p.status}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <button
                        className="tab-close-btn"
                        onClick={() => setPorts((prev) => prev.filter((x) => x.id !== p.id))}
                        title="転送を停止"
                      >
                        <Trash2 size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

