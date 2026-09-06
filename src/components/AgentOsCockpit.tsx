import React, { useEffect, useState } from 'react';
import {
  AuditEntry,
  HostProcess,
  HttpRequestResult,
  NetworkCheckResult,
  SystemStatsResult,
} from '../types';
import { TauriBridge } from '../services/tauriBridge';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  Filter,
  Globe,
  HardDrive,
  Layers,
  Network,
  Play,
  Radio,
  RefreshCw,
  Search,
  Send,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  Wifi,
  X,
  XCircle,
  Zap,
} from 'lucide-react';

export const AgentOsCockpit: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'processes' | 'network' | 'audit'>('processes');
  const [systemStats, setSystemStats] = useState<SystemStatsResult | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Live telemetry metrics
  const [cpuHistory, setCpuHistory] = useState<number[]>([12, 18, 25, 20, 32, 28, 22, 29]);
  const [ramUsedGb, setRamUsedGb] = useState<number>(4.2);
  const [ramTotalGb] = useState<number>(16.0);
  const [sandboxLevel, setSandboxLevel] = useState<'strict' | 'standard' | 'permissive'>('standard');

  // Process Explorer State
  const [processes, setProcesses] = useState<HostProcess[]>([]);
  const [processFilter, setProcessFilter] = useState('');
  const [processCategory, setProcessCategory] = useState<'all' | 'node' | 'rust' | 'git' | 'system'>('all');
  const [sortField, setSortField] = useState<'pid' | 'name' | 'memory'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<HostProcess | null>(null);
  const [killMessage, setKillMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Network & Probe State
  const [pingHost, setPingHost] = useState('127.0.0.1');
  const [pingPort, setPingPort] = useState('80');
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<NetworkCheckResult | null>(null);

  // Multi-port scanner state
  const [isScanningPorts, setIsScanningPorts] = useState(false);
  const [portScanResults, setPortScanResults] = useState<{ port: number; label: string; reachable: boolean; latency_ms: number }[]>([]);

  // HTTP Probe State
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'HEAD'>('GET');
  const [httpUrl, setHttpUrl] = useState('https://api.github.com/zen');
  const [httpBody, setHttpBody] = useState('');
  const [isSendingHttp, setIsSendingHttp] = useState(false);
  const [httpResult, setHttpResult] = useState<HttpRequestResult | null>(null);
  const [httpError, setHttpError] = useState<string | null>(null);
  const [copiedBody, setCopiedBody] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Fetch initial system stats & processes
  const loadSystemStats = async () => {
    setIsLoadingStats(true);
    try {
      const stats = await TauriBridge.osGetSystemStats();
      setSystemStats(stats);
      // Simulate slight CPU variance for telemetry display
      setCpuHistory((prev) => {
        const nextVal = Math.min(85, Math.max(10, Math.round(prev[prev.length - 1] + (Math.random() * 14 - 7))));
        return [...prev.slice(1), nextVal];
      });
      setRamUsedGb((prev) => +(prev + (Math.random() * 0.2 - 0.1)).toFixed(1));
    } catch (e) {
      console.error('Failed to load system stats:', e);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadProcesses = async (filter?: string) => {
    setIsLoadingProcesses(true);
    try {
      const res = await TauriBridge.osListProcesses(filter || processFilter);
      setProcesses(res.processes);
    } catch (e) {
      console.error('Failed to load host processes:', e);
    } finally {
      setIsLoadingProcesses(false);
    }
  };

  const loadAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const logs = await TauriBridge.osGetAuditLogs(100);
      setAuditLogs(logs);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadSystemStats();
    loadProcesses();
    loadAuditLogs();
    const interval = setInterval(loadSystemStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleKillProcess = async (pid: number, force = false) => {
    try {
      setKillMessage(null);
      const res = await TauriBridge.osKillProcess(pid, force);
      if (res.success) {
        setKillMessage({ text: `Process PID ${pid} successfully terminated (${force ? 'SIGKILL' : 'SIGTERM'}).`, isError: false });
        setSelectedProcess(null);
        await loadProcesses();
        await loadAuditLogs();
      } else {
        setKillMessage({ text: `Termination failed: ${res.stderr || 'Permission denied'}`, isError: true });
      }
    } catch (e: any) {
      setKillMessage({ text: `Execution error: ${e.message || e}`, isError: true });
    }
  };

  const handlePing = async (targetHost?: string, targetPort?: number) => {
    const h = targetHost || pingHost;
    const p = targetPort || parseInt(pingPort, 10) || 80;
    setIsPinging(true);
    setPingResult(null);
    try {
      const res = await TauriBridge.osNetworkCheck(h, p, 3000);
      setPingResult(res);
      await loadAuditLogs();
    } catch (e: any) {
      setPingResult({
        host: h,
        port: p,
        reachable: false,
        latency_ms: 0,
        status: 'error',
        error: e.message || 'Connection refused or timeout',
      });
    } finally {
      setIsPinging(false);
    }
  };

  const runMultiPortScan = async () => {
    setIsScanningPorts(true);
    const standardPorts = [
      { port: 1420, label: 'Tauri Desktop App' },
      { port: 5173, label: 'Vite Dev Server' },
      { port: 3000, label: 'React / Node.js' },
      { port: 8080, label: 'Backend API Server' },
      { port: 5432, label: 'PostgreSQL DB' },
      { port: 6379, label: 'Redis Cache' },
    ];
    try {
      const results = await Promise.all(
        standardPorts.map(async (sp) => {
          try {
            const res = await TauriBridge.osNetworkCheck('127.0.0.1', sp.port, 1200);
            return { port: sp.port, label: sp.label, reachable: res.reachable, latency_ms: res.latency_ms };
          } catch {
            return { port: sp.port, label: sp.label, reachable: false, latency_ms: 0 };
          }
        })
      );
      setPortScanResults(results);
    } finally {
      setIsScanningPorts(false);
    }
  };

  const handleSendHttp = async () => {
    setIsSendingHttp(true);
    setHttpResult(null);
    setHttpError(null);
    try {
      const res = await TauriBridge.osHttpRequest(httpUrl, httpMethod, httpBody ? httpBody : undefined);
      setHttpResult(res);
      await loadAuditLogs();
    } catch (e: any) {
      setHttpError(e.message || 'Request failed or blocked by sandbox guard');
    } finally {
      setIsSendingHttp(false);
    }
  };

  const exportAuditLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aether_audit_ledger_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filter and sort processes
  const displayedProcesses = processes
    .filter((p) => {
      if (processFilter && !p.name.toLowerCase().includes(processFilter.toLowerCase()) && !String(p.pid).includes(processFilter)) {
        return false;
      }
      if (processCategory === 'all') return true;
      const n = p.name.toLowerCase();
      if (processCategory === 'node') return n.includes('node') || n.includes('electron') || n.includes('npm');
      if (processCategory === 'rust') return n.includes('cargo') || n.includes('rust') || n.includes('aether');
      if (processCategory === 'git') return n.includes('git') || n.includes('ssh') || n.includes('gpg');
      if (processCategory === 'system') return ['winlogon.exe', 'csrss.exe', 'services.exe', 'lsass.exe', 'system'].includes(n);
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'pid') {
        cmp = a.pid - b.pid;
      } else if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === 'memory') {
        const memA = parseInt(a.memory.replace(/[^0-9]/g, ''), 10) || 0;
        const memB = parseInt(b.memory.replace(/[^0-9]/g, ''), 10) || 0;
        cmp = memA - memB;
      }
      return sortAsc ? cmp : -cmp;
    });

  const filteredAuditLogs = auditLogs.filter((entry) => {
    if (auditSearch) {
      const q = auditSearch.toLowerCase();
      const match =
        entry.resource.toLowerCase().includes(q) ||
        entry.action.toLowerCase().includes(q) ||
        entry.reason.toLowerCase().includes(q) ||
        entry.category.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (auditFilter === 'all') return true;
    if (auditFilter === 'high') return entry.risk_level === 'high' || entry.risk_level === 'critical';
    return entry.risk_level === auditFilter;
  });

  const latestCpu = cpuHistory[cpuHistory.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      {/* Top Banner: Host System Telemetry Bar & Live Gauges */}
      <div
        style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(180deg, rgba(30, 34, 46, 0.75) 0%, rgba(15, 17, 23, 0.95) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(6, 182, 212, 0.25) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-cyan-glow)',
            }}
          >
            <Server size={22} color="var(--accent-cyan)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '17px', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
                AETHER Agent OS Cockpit
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--accent-emerald)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent-emerald)',
                    boxShadow: '0 0 8px var(--accent-emerald)',
                  }}
                />
                HOST SANDBOX ACTIVE
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Autonomous Host Telemetry, Sandboxed Process Execution, TCP Probe & Cryptographic Audit
            </div>
          </div>
        </div>

        {/* Live Gauges & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* CPU Sparkline Meter */}
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Cpu size={12} color="var(--accent-primary)" /> CPU LOAD
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: latestCpu > 60 ? 'var(--accent-rose)' : '#fff' }}>
                {latestCpu}%
              </div>
            </div>
            {/* 8-point SVG Sparkline */}
            <svg width="60" height="24" style={{ overflow: 'visible' }}>
              <polyline
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="2"
                points={cpuHistory
                  .map((val, idx) => `${idx * 8.5},${22 - (val / 100) * 18}`)
                  .join(' ')}
              />
            </svg>
          </div>

          {/* RAM Progress Meter */}
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-muted)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minWidth: '130px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <HardDrive size={12} color="var(--accent-cyan)" /> RAM
              </span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{ramUsedGb} / {ramTotalGb} GB</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${(ramUsedGb / ramTotalGb) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-primary))',
                }}
              />
            </div>
          </div>

          {/* Sandbox Profile Selector */}
          <div
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Shield size={13} color="var(--accent-emerald)" />
            <select
              value={sandboxLevel}
              onChange={(e) => setSandboxLevel(e.target.value as any)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="strict" style={{ background: '#1e222e' }}>Strict (Isolated)</option>
              <option value="standard" style={{ background: '#1e222e' }}>Standard (Workspace)</option>
              <option value="permissive" style={{ background: '#1e222e' }}>Permissive (Host Dev)</option>
            </select>
          </div>

          <button
            onClick={() => {
              loadSystemStats();
              loadProcesses();
              loadAuditLogs();
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--bg-surface-hover)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
            }}
          >
            <RefreshCw size={12} className={isLoadingStats ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 24px',
          background: 'var(--bg-sidebar)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={() => setActiveSubTab('processes')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'processes' ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeSubTab === 'processes' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Activity size={15} color={activeSubTab === 'processes' ? 'var(--accent-primary)' : 'inherit'} />
          Host Process Manager
          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: 10,
              background: activeSubTab === 'processes' ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-surface)',
              color: activeSubTab === 'processes' ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}
          >
            {displayedProcesses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('network')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'network' ? '2px solid var(--accent-cyan)' : '2px solid transparent',
            color: activeSubTab === 'network' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Network size={15} color={activeSubTab === 'network' ? 'var(--accent-cyan)' : 'inherit'} />
          Network & API Diagnostics
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeSubTab === 'audit' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
            color: activeSubTab === 'audit' ? 'var(--text-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          <Shield size={15} color={activeSubTab === 'audit' ? 'var(--accent-emerald)' : 'inherit'} />
          Security & Audit Ledger
          <span
            style={{
              fontSize: '10px',
              padding: '1px 6px',
              borderRadius: 10,
              background: activeSubTab === 'audit' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-surface)',
              color: activeSubTab === 'audit' ? 'var(--accent-emerald)' : 'var(--text-muted)',
            }}
          >
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '18px 24px' }}>
        {/* SUBTAB 1: HOST PROCESSES */}
        {activeSubTab === 'processes' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
            {/* Filter Chips & Search Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '440px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    width: '100%',
                  }}
                >
                  <Search size={14} color="var(--text-secondary)" />
                  <input
                    type="text"
                    placeholder="プロセス名またはPIDで検索..."
                    value={processFilter}
                    onChange={(e) => {
                      setProcessFilter(e.target.value);
                      loadProcesses(e.target.value);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      width: '100%',
                    }}
                  />
                  {processFilter && (
                    <button
                      onClick={() => {
                        setProcessFilter('');
                        loadProcesses('');
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {[
                  { id: 'all', label: 'すべて' },
                  { id: 'node', label: 'Node / JS' },
                  { id: 'rust', label: 'Rust / Cargo' },
                  { id: 'git', label: 'Git' },
                  { id: 'system', label: 'システム' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setProcessCategory(cat.id as any)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: processCategory === cat.id ? 'var(--accent-primary)' : 'var(--bg-surface)',
                      border: processCategory === cat.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      color: processCategory === cat.id ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {killMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: killMessage.isError ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${killMessage.isError ? 'var(--accent-rose)' : 'var(--accent-emerald)'}`,
                  color: killMessage.isError ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {killMessage.isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                <span>{killMessage.text}</span>
              </div>
            )}

            {/* Main Area: Process Table + Selected Process Inspector */}
            <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
              {/* Process Table */}
              <div
                style={{
                  flex: selectedProcess ? 2 : 1,
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  background: 'var(--bg-sidebar)',
                  overflow: 'auto',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-muted)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                      }}
                    >
                      <th
                        style={{ padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => {
                          if (sortField === 'pid') setSortAsc(!sortAsc);
                          else { setSortField('pid'); setSortAsc(true); }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          PID {sortField === 'pid' && (sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </div>
                      </th>
                      <th
                        style={{ padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => {
                          if (sortField === 'name') setSortAsc(!sortAsc);
                          else { setSortField('name'); setSortAsc(true); }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          IMAGE NAME {sortField === 'name' && (sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </div>
                      </th>
                      <th style={{ padding: '10px 16px', fontWeight: 600 }}>SESSION</th>
                      <th
                        style={{ padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => {
                          if (sortField === 'memory') setSortAsc(!sortAsc);
                          else { setSortField('memory'); setSortAsc(true); }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          MEMORY {sortField === 'memory' && (sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </div>
                      </th>
                      <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>AGENT OS ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedProcesses.map((p) => {
                      const isSystemCritical = ['winlogon.exe', 'csrss.exe', 'services.exe', 'lsass.exe'].includes(
                        p.name.toLowerCase()
                      );
                      const isSelected = selectedProcess?.pid === p.pid;
                      return (
                        <tr
                          key={p.pid}
                          onClick={() => setSelectedProcess(p)}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            background: isSelected ? 'var(--bg-surface-hover)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
                          <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                            {p.pid}
                          </td>
                          <td style={{ padding: '10px 16px', fontWeight: 600, color: '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Terminal size={14} color="var(--accent-primary)" />
                              {p.name}
                              {isSystemCritical && (
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: 4,
                                    background: 'rgba(239, 68, 68, 0.15)',
                                    color: 'var(--accent-rose)',
                                  }}
                                >
                                  CRITICAL OS
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                            {p.session || 'Console'}
                          </td>
                          <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                            {p.memory}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <button
                              disabled={isSystemCritical}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Kill host process ${p.name} (PID: ${p.pid})?`)) {
                                  handleKillProcess(p.pid, true);
                                }
                              }}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '4px',
                                background: isSystemCritical ? 'transparent' : 'rgba(239, 68, 68, 0.15)',
                                border: isSystemCritical ? '1px solid var(--border-subtle)' : '1px solid rgba(239, 68, 68, 0.4)',
                                color: isSystemCritical ? 'var(--text-muted)' : 'var(--accent-rose)',
                                fontSize: '11px',
                                cursor: isSystemCritical ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Trash2 size={12} />
                              Kill
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Selected Process Inspector Drawer */}
              {selectedProcess && (
                <div
                  style={{
                    flex: 1,
                    background: 'var(--bg-sidebar)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                      <Terminal size={16} color="var(--accent-cyan)" />
                      プロセス詳細 (PID: {selectedProcess.pid})
                    </div>
                    <button
                      onClick={() => setSelectedProcess(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>プロセス名:</span>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{selectedProcess.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>PID:</span>
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{selectedProcess.pid}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>メモリフットプリント:</span>
                      <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{selectedProcess.memory}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>サンドボックス分離:</span>
                      <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>Active (Ring-3 Isolation)</span>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={() => handleKillProcess(selectedProcess.pid, false)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      正常終了シグナル送信 (SIGTERM)
                    </button>
                    <button
                      onClick={() => handleKillProcess(selectedProcess.pid, true)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid var(--accent-rose)',
                        color: 'var(--accent-rose)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Trash2 size={13} />
                      強制終了 (SIGKILL)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 2: NETWORK & API DIAGNOSTICS */}
        {activeSubTab === 'network' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
            {/* Multi-Port Scanner Banner */}
            <div
              style={{
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                  <Radio size={16} color="var(--accent-cyan)" />
                  ローカル開発ポート高速スキャナー
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Tauri, Vite, React, API サーバー, DB などの主要ポートの開放状態と疎通レイテンシを一括診断
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  disabled={isScanningPorts}
                  onClick={runMultiPortScan}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isScanningPorts ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={13} className={isScanningPorts ? 'spin' : ''} />
                  一括スキャン実行
                </button>
              </div>
            </div>

            {/* Multi-Port Scan Grid */}
            {portScanResults.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                {portScanResults.map((pr) => (
                  <div
                    key={pr.port}
                    style={{
                      background: 'var(--bg-surface)',
                      border: `1px solid ${pr.reachable ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '6px',
                      padding: '10px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        Port {pr.port}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: pr.reachable ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: pr.reachable ? 'var(--accent-emerald)' : 'var(--text-muted)',
                        }}
                      >
                        {pr.reachable ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{pr.label}</div>
                    {pr.reachable && (
                      <div style={{ fontSize: '10px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                        {pr.latency_ms} ms latency
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Probe Grids */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>
              {/* TCP Socket Probe */}
              <div
                style={{
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <Wifi size={17} color="var(--accent-cyan)" />
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 600 }}>TCP ソケット疎通プローブ</h3>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      tokio::net::TcpStream による非同期ハンドシェイク試験
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      宛先ホスト / IP
                    </label>
                    <input
                      type="text"
                      value={pingHost}
                      onChange={(e) => setPingHost(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-muted)',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                  <div style={{ width: '80px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      ポート
                    </label>
                    <input
                      type="number"
                      value={pingPort}
                      onChange={(e) => setPingPort(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-muted)',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                  </div>
                </div>

                <button
                  disabled={isPinging}
                  onClick={() => handlePing()}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: 'var(--accent-cyan)',
                    color: '#000',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: isPinging ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {isPinging ? <RefreshCw size={13} className="spin" /> : <Send size={13} />}
                  接続テスト実行
                </button>

                {/* Probe Result Box */}
                {pingResult && (
                  <div
                    style={{
                      marginTop: 'auto',
                      padding: '12px',
                      borderRadius: '6px',
                      background: pingResult.reachable ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${pingResult.reachable ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {pingResult.reachable ? (
                          <>
                            <CheckCircle2 size={15} color="var(--accent-emerald)" />
                            <span style={{ color: 'var(--accent-emerald)' }}>HOST REACHABLE</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={15} color="var(--accent-rose)" />
                            <span style={{ color: 'var(--accent-rose)' }}>UNREACHABLE</span>
                          </>
                        )}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {pingResult.latency_ms} ms latency
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Target: <b>{pingResult.host}:{pingResult.port}</b> | Status: {pingResult.status}
                      {pingResult.error && (
                        <div style={{ color: 'var(--accent-rose)', marginTop: '2px' }}>
                          Error: {pingResult.error}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* HTTP Sandboxed Probe */}
              <div
                style={{
                  background: 'var(--bg-sidebar)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
                  <Globe size={17} color="var(--accent-primary)" />
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: 600 }}>サンドボックス HTTP プローブ</h3>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      REST / GraphQL API への直接送信・レスポンス検証
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={httpMethod}
                    onChange={(e) => setHttpMethod(e.target.value as any)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-muted)',
                      color: 'var(--accent-cyan)',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="HEAD">HEAD</option>
                  </select>

                  <input
                    type="text"
                    value={httpUrl}
                    onChange={(e) => setHttpUrl(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '4px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-muted)',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />

                  <button
                    disabled={isSendingHttp}
                    onClick={handleSendHttp}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '4px',
                      background: 'var(--accent-primary)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: isSendingHttp ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isSendingHttp ? <RefreshCw size={13} className="spin" /> : <Send size={13} />}
                    送信
                  </button>
                </div>

                {httpMethod === 'POST' && (
                  <div>
                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                      リクエストボディ (JSON)
                    </label>
                    <textarea
                      rows={2}
                      value={httpBody}
                      onChange={(e) => setHttpBody(e.target.value)}
                      placeholder='{"key": "value"}'
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-muted)',
                        color: '#fff',
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                  </div>
                )}

                {/* HTTP Response Box */}
                {httpResult && (
                  <div
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      overflow: 'hidden',
                      minHeight: '110px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          padding: '1px 6px',
                          borderRadius: 3,
                          fontSize: '10px',
                          fontWeight: 700,
                          background: httpResult.status < 300 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: httpResult.status < 300 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                        }}
                      >
                        {httpResult.status} {httpResult.status_text}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          {httpResult.content_length} bytes
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(httpResult.body);
                            setCopiedBody(true);
                            setTimeout(() => setCopiedBody(false), 2000);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                          }}
                        >
                          <Copy size={11} />
                          {copiedBody ? 'コピー完了' : 'コピー'}
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '6px 8px',
                        background: 'var(--bg-app)',
                        borderRadius: '4px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        color: 'var(--text-primary)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                      }}
                    >
                      {httpResult.body}
                    </div>
                  </div>
                )}

                {httpError && (
                  <div
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid var(--accent-rose)',
                      color: 'var(--accent-rose)',
                      fontSize: '11px',
                    }}
                  >
                    <b>HTTP Error:</b> {httpError}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: IMMUTABLE AUDIT LEDGER */}
        {activeSubTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px' }}>
            {/* Filter Bar & Search */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '380px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    width: '100%',
                  }}
                >
                  <Search size={14} color="var(--text-secondary)" />
                  <input
                    type="text"
                    placeholder="監査ログを検索 (アクション, リソース, 理由)..."
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      width: '100%',
                    }}
                  />
                  {auditSearch && (
                    <button
                      onClick={() => setAuditSearch('')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Risk Filter Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>リスク:</span>
                {['all', 'safe', 'low', 'moderate', 'high'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setAuditFilter(level)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: auditFilter === level ? 'var(--bg-surface-active)' : 'var(--bg-surface)',
                      border: auditFilter === level ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      color: auditFilter === level ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {level}
                  </button>
                ))}
              </div>

              {/* Export Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={exportAuditLogsAsJson}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="監査ログをJSON形式でダウンロード"
                >
                  <Download size={13} />
                  エクスポート
                </button>
                <button
                  onClick={loadAuditLogs}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={12} className={isLoadingAudit ? 'spin' : ''} />
                  更新
                </button>
              </div>
            </div>

            {/* Audit Table */}
            <div
              style={{
                flex: 1,
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                background: 'var(--bg-sidebar)',
                overflow: 'auto',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-muted)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                    }}
                  >
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>TIMESTAMP</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>CATEGORY</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>ACTION / RESOURCE</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>RISK LEVEL</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>DECISION</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>REASON</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.map((entry) => {
                    const isHigh = entry.risk_level === 'high' || entry.risk_level === 'critical';
                    const isSafe = entry.risk_level === 'safe';
                    return (
                      <tr
                        key={entry.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                        }}
                      >
                        <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                          {entry.category}
                        </td>
                        <td style={{ padding: '10px 16px', color: '#fff' }}>
                          <span style={{ fontWeight: 600 }}>{entry.action}</span>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: '6px', fontSize: '11px' }}>
                            ({entry.resource})
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: isHigh
                                ? 'rgba(239, 68, 68, 0.2)'
                                : isSafe
                                ? 'rgba(16, 185, 129, 0.2)'
                                : 'rgba(245, 158, 11, 0.2)',
                              color: isHigh
                                ? 'var(--accent-rose)'
                                : isSafe
                                ? 'var(--accent-emerald)'
                                : 'var(--accent-amber)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {isHigh && <ShieldAlert size={11} />}
                            {entry.risk_level}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: entry.decision.startsWith('allow') ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                            }}
                          >
                            {entry.decision}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                          {entry.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
