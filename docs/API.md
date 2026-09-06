# AETHER Desktop IPC API Reference

This document outlines the Tauri 2 IPC commands registered in `src-tauri/src/commands.rs` and consumed by `src/services/tauriBridge.ts`.

---

## 1. Workspace Commands

| Command | Arguments | Returns | Description |
|---|---|---|---|
| `get_workspace_info` | None | `WorkspaceInfo` | Current workspace path and project name |
| `get_file_tree` | `max_depth?: number` | `FileNode` | Hierarchical recursive directory tree |
| `read_file` | `path: string` | `string` | Read file contents as UTF-8 string |
| `write_file` | `path: string, content: string` | `void` | Write UTF-8 file (audited and risk-checked) |
| `create_file` | `path: string` | `void` | Create a new empty file |
| `create_folder` | `path: string` | `void` | Create a new directory |
| `delete_path` | `path: string` | `void` | Delete file or directory (high-risk checked) |
| `rename_path` | `old_path: string, new_path: string` | `void` | Rename or move file |

---

## 2. Terminal Commands

| Command | Arguments | Returns | Description |
|---|---|---|---|
| `create_terminal_session` | `shell?: string, cols?: number, rows?: number` | `TerminalSessionInfo` | Spawn a new native PTY session |
| `write_terminal_input` | `session_id: string, data: string` | `void` | Send keystrokes / commands to PTY stdin |
| `resize_terminal` | `session_id: string, cols: number, rows: number` | `void` | Resize PTY viewport |
| `close_terminal_session` | `session_id: string` | `void` | Terminate PTY session |
| `list_terminal_sessions` | None | `TerminalSessionInfo[]` | List active PTY sessions |

---

## 3. Git Commands

| Command | Arguments | Returns | Description |
|---|---|---|---|
| `get_git_status` | None | `GitRepoStatus` | Current branch, staged/unstaged changes, ahead/behind |
| `stage_file` | `path: string` | `void` | Stage specific file in git index |
| `stage_all` | None | `void` | Stage all working changes |
| `unstage_file` | `path: string` | `void` | Unstage file |
| `git_commit` | `message: string` | `string` | Commit staged changes with message |
| `get_git_diff` | `staged: boolean` | `string` | Get unified diff string |

---

## 4. Search Commands

| Command | Arguments | Returns | Description |
|---|---|---|---|
| `search_content` | `query: string, is_regex?: bool, case_sensitive?: bool` | `FileMatch[]` | Search file contents with line/column matches |
| `search_files` | `query: string, limit?: number` | `string[]` | Fuzzy match file paths in workspace |

---

## 5. AI & Multi-Agent Commands

| Command | Arguments | Returns | Description |
|---|---|---|---|
| `list_providers` | None | `[string, string][]` | List configured AI model providers |
| `run_ai_completion` | `prompt: string, model?: string` | `string` | Run single-shot AI completion |
| `list_agents` | None | `Agent[]` | List configured agents in swarm |
| `create_agent` | `name: string, role: string, model?: string` | `Agent` | Register a new agent |
| `run_agent_task` | `agent_id: string, task_prompt: string` | `AgentStepResult[]` | Run autonomous agent loop on a task |
| `list_tasks` | None | `OrchestratorTask[]` | List all tasks in orchestrator DAG |
| `submit_task` | `title: string, description: string, priority?: string` | `string` | Enqueue task in orchestrator |
| `get_dashboard_metrics` | None | `AgentDashboardMetrics` | Aggregated tokens, tasks, and swarms |
| `run_team_pipeline` | `goal: string` | `[string, AgentStepResult[]][]` | Execute 5-stage swarm pipeline |

---

## 6. Host Agent OS & Security Commands

| Command | Arguments | Returns | Description |
|---|---|---|---|
| `os_list_processes` | `filter?: string` | `{ total_processes: number, processes: HostProcess[] }` | List running host OS processes |
| `os_kill_process` | `pid: number, force?: bool` | `{ success: bool, pid: number, stdout: string, stderr: string }` | Terminate process via PID (risk-checked) |
| `os_network_check` | `host: string, port: number, timeout_ms?: number` | `NetworkCheckResult` | Test TCP socket reachability & latency |
| `os_http_request` | `url: string, method?: string, body?: string, headers?: map` | `HttpRequestResult` | Execute sandboxed HTTP request |
| `os_get_system_stats` | None | `SystemStatsResult` | CPU cores, OS platform, architecture, workspace |
| `os_get_audit_logs` | `limit?: number` | `AuditEntry[]` | Query immutable security audit records |
| `resolve_permission_request`| `request_id: string, decision: string` | `bool` | Submit human decision (`allow_once`, `allow_always`, `deny`) |
