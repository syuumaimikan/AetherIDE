# AETHER IDE — User Guide

Welcome to **AETHER IDE**, the next-generation developer workspace designed for deep human-AI synergy. AETHER blends the editing speed of Zed, the rich tooling of JetBrains/VS Code, and an integrated **AI Agent OS** capable of running autonomous multi-agent pipelines and safely executing host-level tasks.

---

## 1. Interface Overview

AETHER provides a unified obsidian-dark interface divided into five core functional zones:

```
+-------------------------------------------------------------------------+
| [AETHER Titlebar & Window Controls]                  [3-in-1 Switcher]  |
+---------+-----------------------------------+---------------------------+
| Activity| Primary Workspace:               | Right Dock:               |
| Bar     | - Monaco Code Editor              | - Autonomous Swarm DAG    |
| (Files, | - Split Diff Review               | - AI Copilot Chat         |
|  Search,| - Agent OS Cockpit                |   (@file, @git mentions)  |
|  Git,   |                                   |                           |
|  Tasks) |                                   |                           |
+---------+-----------------------------------+---------------------------+
| Bottom Dock: Integrated Terminal (portable-pty) / Output / Problems     |
+-------------------------------------------------------------------------+
| Status Bar: Branch, Encoding, Telemetry (CPU/RAM), Active AI Model     |
+-------------------------------------------------------------------------+
```

---

## 2. The 3-in-1 Hybrid Workspace Modes

Switch seamlessly between modes using the mode buttons in the header or via keyboard shortcuts:

### 1. Normal IDE Mode (`Ctrl+Shift+1`)
- **Purpose**: Pure coding speed and high-ergonomic editing.
- **Features**:
  - Full-screen Monaco Editor with fast syntax highlighting and language server integration.
  - Interactive file tree with creation, rename, and deletion.
  - Multi-tab document management with dirty state indicators.
  - Integrated terminal panel backed by native PTY sessions.

### 2. Agent Swarm Mode (`Ctrl+Shift+2`)
- **Purpose**: Autonomous collaborative task execution by specialized AI agents.
- **Workflow**:
  1. Open the **Autonomous Swarm** panel in the right dock.
  2. Input your high-level engineering prompt (e.g., *"Implement an LRU cache with unit tests and benchmark suite"*).
  3. Click **Execute Pipeline**.
  4. Watch real-time execution across the 5-stage DAG:
     - **Architect**: Designs data structures and interface contracts.
     - **Coder**: Implements production-grade Rust/TypeScript code.
     - **Tester**: Generates and executes test suites.
     - **Reviewer**: Inspects code quality, performance, and style guidelines.
     - **Security Auditor**: Enforces risk rules and validates against host vulnerabilities.
  5. Inspect generated code diffs with the side-by-side **Diff Review Modal** before committing to disk.

### 3. Agent OS Mode (`Ctrl+Shift+3`)
- **Purpose**: Supervised host computer monitoring, process control, and network diagnostics.
- **Cockpit Sections**:
  - **Telemetry Bar**: Instant real-time readouts of Host CPU usage, Memory (RAM) utilization, and OS thread count.
  - **Host Process Manager**: Search live system processes, inspect PID and memory footprints, and safely terminate unresponsive or runaway tasks.
  - **Network & API Probe**: Ping TCP hosts/ports and send custom HTTP GET/POST requests directly from the IDE sandbox.
  - **Immutable Audit Ledger**: Chronological log of every automated tool execution with timestamp, user approval state, risk tier, and parameters.

---

## 3. AI Copilot Chat & Context Mentions

Switch to the **AI Copilot** tab in the right dock to collaborate interactively:

- **Context Mentions**:
  - `@file`: Injects the currently open file content into the prompt context.
  - `@git`: Attaches `git status` and recent diffs for quick commits and branch review.
  - `@terminal`: Sends recent terminal history to troubleshoot errors and build warnings.
  - `@workspace`: Attaches file structure and project configuration summary.
- **Model Switcher**:
  - Toggle between **Claude 3.7 Sonnet**, **GPT-4o**, **DeepSeek-R1**, and **Local Ollama (Llama 3.3)** on the fly.
- **Diff Generation**:
  - When the copilot suggests code changes, click **Review Diff** to open the unified/split diff inspector and apply changes with one click.

---

## 4. Integrated Terminal (portable-pty)

- Open or toggle the terminal panel with `Ctrl+\`` (Backtick).
- Native PTY ensures support for interactive CLI tools (`vim`, `htop`, `cargo run`, `npm test`).
- Terminal outputs are monitored by the AI Context Engine to provide immediate one-click troubleshooting when compilation errors occur.

---

## 5. Security and Guardrails

AETHER is built with zero-trust AI operations:
- Every tool execution undergoes risk analysis (`Safe` -> `Critical`).
- Dangerous operations (file overwriting, shell script execution, process termination) require explicit user authorization.
- For complete security policies, see [SECURITY_MODEL.md](file:///d:/Rust_Proj2/AetherIDE/docs/SECURITY_MODEL.md).
