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
  ArrowRight,
  CheckCircle2,
  Cpu,
  Globe,
  HardDrive,
  Layers,
  Network,
  RefreshCw,
  Search,
  Send,
  Server,
  Shield,
  ShieldAlert,
  Terminal,
  Trash2,
  Wifi,
  XCircle,
} from 'lucide-react';

export const AgentOsCockpit: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'processes' | 'network' | 'audit'>('processes');
  const [systemStats, setSystemStats] = useState<SystemStatsResult | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Process Explorer State
  const [processes, setProcesses] = useState<HostProcess[]>([]);
  const [processFilter, setProcessFilter] = useState('');
  const [isLoadingProcesses, setIsLoadingProcesses] = useState(false);
  const [selectedPid, setSelectedPid] = useState<number | null>(null);
  const [killMessage, setKillMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Network & Probe State
  const [pingHost, setPingHost] = useState('127.0.0.1');
  const [pingPort, setPingPort] = useState('80');
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<NetworkCheckResult | null>(null);

  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'HEAD'>('GET');
  const [httpUrl, setHttpUrl] = useState('https://api.github.com/zen');
  const [httpBody, setHttpBody] = useState('');
  const [isSendingHttp, setIsSendingHttp] = useState(false);
  const [httpResult, setHttpResult] = useState<HttpRequestResult | null>(null);
  const [httpError, setHttpError] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Fetch initial system stats & processes
  const loadSystemStats = async () => {
    setIsLoadingStats(true);
    try {
      const stats = await TauriBridge.osGetSystemStats();
      setSystemStats(stats);
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
  }, []);

  const handleKillProcess = async (pid: number) => {
    try {
      setKillMessage(null);
      const res = await TauriBridge.osKillProcess(pid, true);
      if (res.success) {
        setKillMessage({ text: `Process PID ${pid} successfully terminated.`, isError: false });
        await loadProcesses();
        await loadAuditLogs();
      } else {
        setKillMessage({ text: `Termination failed: ${res.stderr || 'Permission denied'}`, isError: true });
      }
    } catch (e: any) {
      setKillMessage({ text: `Execution error: ${e.message || e}`, isError: true });
    }
  };

  const handlePing = async () => {
    setIsPinging(true);
    setPingResult(null);
    try {
      const portNum = parseInt(pingPort, 10) || 80;
      const res = await TauriBridge.osNetworkCheck(pingHost, portNum, 3000);
      setPingResult(res);
      await loadAuditLogs();
    } catch (e: any) {
      setPingResult({
        host: pingHost,
        port: parseInt(pingPort, 10) || 80,
        reachable: false,
        latency_ms: 0,
        status: 'error',
        error: e.message || 'Connection refused or timeout',
      });
    } finally {
      setIsPinging(false);
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

  const filteredAuditLogs = auditLogs.filter((entry) => {
    if (auditFilter === 'all') return true;
    if (auditFilter === 'high') return entry.risk_level === 'high' || entry.risk_level === 'critical';
    return entry.risk_level === auditFilter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-app)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      {/* Top Banner: Host System Telemetry Bar */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(180deg, rgba(30, 34, 46, 0.6) 0%, rgba(15, 17, 23, 0.9) 100%)',
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
              width: 42,
              height: 42,
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
              Autonomous Host Control, Sandboxed Process Execution, TCP Probe & Cryptographic Audit
            </div>
          </div>
        </div>

        {/* System Specs Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
            }}
          >
            <Cpu size={14} color="var(--accent-primary)" />
            <span style={{ color: 'var(--text-secondary)' }}>CPUs:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {systemStats?.num_cpus || '16'} Cores
            </span>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
            }}
          >
            <Layers size={14} color="var(--accent-cyan)" />
            <span style={{ color: 'var(--text-secondary)' }}>Platform:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              {systemStats?.os || 'Windows'} ({systemStats?.arch || 'x86_64'})
            </span>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              maxWidth: '280px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={systemStats?.workspace || ''}
          >
            <HardDrive size={14} color="var(--accent-emerald)" />
            <span style={{ color: 'var(--text-secondary)' }}>Sandbox:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {systemStats?.workspace ? systemStats.workspace.split(/[\\/]/).pop() : 'AetherIDE'}
            </span>
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
              transition: 'background var(--trans-fast)',
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
            {processes.length}
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
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {/* SUBTAB 1: HOST PROCESSES */}
        {activeSubTab === 'processes' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
            {/* Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  flex: 1,
                  maxWidth: '420px',
                }}
              >
                <Search size={14} color="var(--text-secondary)" />
                <input
                  type="text"
                  placeholder="Filter processes by name (e.g. node, cargo, rust)..."
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
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total active: <b>{processes.length}</b> processes
                </span>
                <button
                  onClick={() => loadProcesses()}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={12} className={isLoadingProcesses ? 'spin' : ''} />
                  Refresh
                </button>
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

            {/* Process Table */}
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
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>PID</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>IMAGE NAME</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>SESSION</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600 }}>MEMORY FOOTPRINT</th>
                    <th style={{ padding: '10px 16px', fontWeight: 600, textAlign: 'right' }}>AGENT OS ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((p) => {
                    const isSystemCritical = ['winlogon.exe', 'csrss.exe', 'services.exe', 'lsass.exe'].includes(
                      p.name.toLowerCase()
                    );
                    const isSelected = selectedPid === p.pid;
                    return (
                      <tr
                        key={p.pid}
                        onClick={() => setSelectedPid(p.pid)}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          background: isSelected ? 'var(--bg-surface-hover)' : 'transparent',
                          transition: 'background var(--trans-fast)',
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
                              if (confirm(`Kill host process ${p.name} (PID: ${p.pid})? This action is audited.`)) {
                                handleKillProcess(p.pid);
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
                              transition: 'all var(--trans-fast)',
                            }}
                            title={isSystemCritical ? 'Protected by Host RiskAnalyzer' : 'Terminate process via Agent OS'}
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
          </div>
        )}

        {/* SUBTAB 2: NETWORK & API DIAGNOSTICS */}
        {activeSubTab === 'network' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '100%' }}>
            {/* TCP Socket Probe */}
            <div
              style={{
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <Wifi size={18} color="var(--accent-cyan)" />
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>TCP Socket Reachability Probe</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Direct asynchronous socket handshake test using tokio::net::TcpStream
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Destination Host / IP
                  </label>
                  <input
                    type="text"
                    value={pingHost}
                    onChange={(e) => setPingHost(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-muted)',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <div style={{ width: '90px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Port
                  </label>
                  <input
                    type="number"
                    value={pingPort}
                    onChange={(e) => setPingPort(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
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
                onClick={handlePing}
                style={{
                  padding: '8px 16px',
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
                  gap: '8px',
                }}
              >
                {isPinging ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
                Test Socket Connection
              </button>

              {/* Probe Result Box */}
              {pingResult && (
                <div
                  style={{
                    marginTop: 'auto',
                    padding: '14px',
                    borderRadius: '6px',
                    background: pingResult.reachable ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${pingResult.reachable ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {pingResult.reachable ? (
                        <>
                          <CheckCircle2 size={16} color="var(--accent-emerald)" />
                          <span style={{ color: 'var(--accent-emerald)' }}>HOST REACHABLE</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={16} color="var(--accent-rose)" />
                          <span style={{ color: 'var(--accent-rose)' }}>UNREACHABLE</span>
                        </>
                      )}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {pingResult.latency_ms} ms latency
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Target: <b>{pingResult.host}:{pingResult.port}</b> | Status: {pingResult.status}
                    {pingResult.error && (
                      <div style={{ color: 'var(--accent-rose)', marginTop: '4px' }}>
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
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                <Globe size={18} color="var(--accent-primary)" />
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Sandboxed HTTP Request Probe</h3>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Restricted network client with timeout guard and body size ceiling
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={httpMethod}
                  onChange={(e) => setHttpMethod(e.target.value as any)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
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
                    padding: '8px 12px',
                    borderRadius: '6px',
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
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isSendingHttp ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSendingHttp ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
                  Send
                </button>
              </div>

              {httpMethod === 'POST' && (
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Request Body (JSON / Raw)
                  </label>
                  <textarea
                    rows={3}
                    value={httpBody}
                    onChange={(e) => setHttpBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
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
                    padding: '12px',
                    borderRadius: '6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '11px',
                        fontWeight: 700,
                        background: httpResult.status < 300 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: httpResult.status < 300 ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                      }}
                    >
                      {httpResult.status} {httpResult.status_text}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Size: {httpResult.content_length} bytes
                    </span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      overflow: 'auto',
                      padding: '8px',
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
                    padding: '12px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid var(--accent-rose)',
                    color: 'var(--accent-rose)',
                    fontSize: '12px',
                  }}
                >
                  <b>HTTP Error:</b> {httpError}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUBTAB 3: IMMUTABLE AUDIT LEDGER */}
        {activeSubTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
            {/* Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Filter Risk:</span>
                {['all', 'safe', 'low', 'moderate', 'high'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setAuditFilter(level)}
                    style={{
                      padding: '4px 10px',
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Ledger Count: <b>{filteredAuditLogs.length}</b> verified events
                </span>
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
                  Refresh Ledger
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
                          transition: 'background var(--trans-fast)',
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
