# AETHER Agent OS - Host Control & Security Sandboxing

The **AI Agent OS** within AETHER bridges the gap between conventional code editors and autonomous computer operations. It equips AI agents with the tools to safely observe, debug, and manipulate host operating system resources under human supervision.

---

## 1. Core Principles

1. **Host Visibility**: Agents can inspect real host state: running processes, CPU cores, open ports, and network connectivity.
2. **Deterministic Boundaries**: Agents cannot escape the designated workspace directory for filesystem writes unless explicitly granted elevated permissions.
3. **Multi-Tier Risk Assessment**: Every action is classified before execution. High and Critical risk actions can never bypass human confirmation.
4. **Immutable Audit Trail**: Every command executed, tool invoked, and process terminated is logged with millisecond timestamps.

---

## 2. Risk Matrix

| Risk Level | Description | Typical Operations | Default Policy |
|---|---|---|---|
| **Safe** | Read-only queries with zero system side effects. | `os_system_info`, `fs_read_file`, `git status` | `AllowAlways` |
| **Low** | Read operations on user files and directory listings. | `fs_list_dir`, `search_files` | `AllowAlways` |
| **Moderate** | Modifying workspace files within repo boundaries. | `fs_write_file`, `git commit` | `Ask` |
| **High** | Spawning subprocesses, external network calls, killing processes. | `terminal_execute`, `os_kill_process`, `os_http_request` | `Ask` |
| **Critical** | Destructive commands, system-wide file modifications. | `rm -rf`, `taskkill /F`, sensitive system dir access | `Ask` / Strict Guard |

---

## 3. Host Process Explorer

The Host Process Explorer provides an interactive view of system processes:
- Windows: Uses `tasklist /FO CSV /NH` for structured parsing of image names, PIDs, sessions, and memory footprints.
- Unix/macOS: Uses `ps -eo pid,comm,rss`.
- **Termination Guard**:
  - Critical system processes (`winlogon.exe`, `csrss.exe`, `services.exe`, `lsass.exe`) are protected against accidental termination.
  - Termination requests trigger security audit records.

---

## 4. Network Diagnostics & Socket Probes

1. **TCP Reachability Probe (`OsNetworkCheckTool`)**:
   - Executes direct asynchronous socket connection attempts via `tokio::net::TcpStream::connect`.
   - Measures sub-millisecond round-trip connection latency.
   - Used by agents to verify local dev servers (`localhost:3000`, `127.0.0.1:8080`), database endpoints, or API servers.

2. **Sandboxed HTTP Probe (`OsHttpRequestTool`)**:
   - Executes sandboxed GET/POST/HEAD requests via `reqwest`.
   - Enforces 15-second timeout limits.
   - Body response previews are capped at 50KB to protect context window limits.

---

## 5. Security Audit Ledger

The audit ledger maintains an append-only log of events:
```json
{
  "id": "aud-001",
  "timestamp": "2026-09-06T02:40:12Z",
  "agent_id": "agent-coder-02",
  "category": "filesystem_write",
  "action": "write_file",
  "resource": "src/kernel.rs",
  "risk_level": "moderate",
  "decision": "allow_once",
  "reason": "Human authorized file edit via modal confirmation"
}
```
Entries are accessible in real-time in the **Agent OS Cockpit** UI and queryable via Tauri IPC commands.
