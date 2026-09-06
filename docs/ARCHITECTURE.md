# AETHER IDE - System Architecture Deep Dive

This document details the architectural principles, threading model, memory guarantees, and subsystem interactions of AETHER IDE.

---

## 1. Architectural Philosophy

AETHER IDE is designed to avoid common failure modes of modern desktop IDEs:
1. **Zero UI Freezes**: No synchronous disk I/O, regex execution, or subprocess launches ever run on the main Tauri UI thread.
2. **Zero-Allocation Telemetry**: Internal events route through Tokio channels and ring buffers.
3. **Defense in Depth**: The Agent OS has granular permissions (`PermissionCategory`), regular-expression risk heuristics (`RiskAnalyzer`), and cryptographic audit trails.
4. **Modularity**: 11 decoupled Rust crates ensure unit testability, clean boundary isolation, and independent compilation caching.

---

## 2. Tokio Asynchronous Core

The backend runs on an asynchronous multi-threaded Tokio runtime:
- **PTY Subprocess Manager**: `portable-pty` runs reader loops on background Tokio green tasks, streaming stdout/stderr chunks directly to frontend listeners over Tauri events.
- **Event Bus Pipeline**: `EventBus` (`crates/aether-core/src/events.rs`) utilizes `tokio::sync::broadcast` to distribute workspace changes, agent step notifications, and permission alerts across active subscribers without blocking publishers.
- **Cancellation Tokens**: Every background agent loop receives a `tokio_util::sync::CancellationToken` ensuring immediate graceful termination when the user cancels a task.

---

## 3. Subsystem Breakdown

### 3.1 `aether-permission` (Security Engine)
- **`RiskAnalyzer`**: Analyzes terminal command strings and file path targets.
  - Matches critical destructive patterns (e.g. `rm -rf`, `format`, `taskkill /F`, `:(){ :|:& };:`) and sensitive directories (`C:\Windows`, `/etc/`, `/bin/`, `~/.ssh`).
- **`PermissionManager`**: Maintains runtime policy state (`AllowAlways`, `Ask`, `Deny`) per category.
  - When a tool call requires confirmation, an asynchronous oneshot channel is registered in `pending_requests`, pausing agent execution until the user clicks "Allow Once", "Allow Always", or "Deny".
- **`AuditLogger`**: In-memory ring buffer capturing immutable log records with timestamps, agent IDs, risk classifications, decisions, and rationale.

### 3.2 `aether-tool-runtime` (Host Tool Sandbox)
- Dynamic registry (`ToolRegistry`) indexing all available host manipulation tools.
- Built-in tools:
  - `fs_read_file` & `fs_write_file`: Workspace-bounded file operations with UTF-8 verification.
  - `terminal_execute`: Command runner with timeout guard and exit code capture.
  - `os_system_info`: Platform, CPU core count, architecture, and memory stats.
  - `os_process_list`: Native process table parsing (`tasklist` on Windows, `ps` on Unix).
  - `os_kill_process`: Targeted process termination, gated by `TerminalAdmin` permissions.
  - `os_network_check`: Asynchronous TCP stream handshake testing target host and port.
  - `os_http_request`: Restrictive HTTP probe client with timeout protection.

### 3.3 `aether-ai-core` & `aether-context-engine`
- **`ModelRouter`**: Abstracts model providers behind a unified `ModelProvider` trait.
  - Supports OpenAI-compatible REST endpoints (Claude Sonnet 3.7, DeepSeek R1, GPT-4o, Ollama local endpoints).
- **`ContextBuilder`**: Compiles active editor selections, syntax-highlighted code blocks, git diff context, and system rules into model-ready token windows with token counting.

### 3.4 `aether-agent-orchestrator`
- Implements a Directed Acyclic Graph (DAG) for collaborative multi-agent execution.
- Orchestrates the 5 specialized roles:
  1. `Architect`: System design and API schemas.
  2. `Coder`: Production implementation.
  3. `Tester`: Test suite synthesis and coverage assertion.
  4. `Reviewer`: Static analysis and architectural compliance.
  5. `Security Auditor`: Privilege escalation review and vulnerability check.

---

## 4. Desktop IPC Bridge

The communication layer between the React 19 UI and Rust backend uses Tauri 2's type-safe IPC:
- Strongly typed command signatures in `src-tauri/src/commands.rs`.
- Typed TypeScript bridge in `src/services/tauriBridge.ts`.
- Fallback mock mode enabling rapid web-browser frontend iteration without requiring native desktop compilation during UI design loops.
