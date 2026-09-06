# AETHER IDE — Security & Governance Model

As an AI Agent OS capable of controlling host files, terminals, and processes, **AETHER IDE** is engineered around strict **Zero-Trust AI Governance**. No automated agent is permitted to execute destructive or uninspected actions without passing through multi-layered safety gates.

---

## 1. Core Architecture

```
[AI Agent / Copilot / Swarm]
            |
            v
   [Risk Analyzer]
   - Heuristic AST & Command Evaluation
   - Calculates Risk Tier: Safe | Low | Moderate | High | Critical
            |
            v
   [Permission Manager]
   - Evaluates Policy: AllowAlways | AllowOnce | Ask | Deny
   - Category-based (Filesystem, Terminal, Network, HostOS)
            |
            +------------> [Ask User Modal] (Prompt user for approval)
            |                    | (Approve / Reject)
            v                    v
   [Sandboxed Tool Execution (portable-pty / safe fs / os probe)]
            |
            v
   [Immutable Audit Ledger]
   - Timestamped record of every call, arguments, risk rating, and outcome
```

---

## 2. Risk Classification Matrix

Every tool invocation is assigned a risk tier before execution:

| Risk Tier | Criteria | Example Operations | Default Policy |
| :--- | :--- | :--- | :--- |
| **Safe** | Read-only actions with no state mutation | `file_read`, `list_directory`, `git_status` | `AllowAlways` |
| **Low** | Non-destructive local modifications | Formatting code, writing temporary scratch buffers | `AllowAlways` |
| **Moderate** | Modifying tracked workspace files, running benign build commands | `cargo check`, modifying existing `.rs` / `.ts` files | `Ask` |
| **High** | Process termination, network requests to external IPs, uncommitted file deletions | `os_kill_process`, `os_http_request`, deleting folders | `Ask` (Modal confirmation) |
| **Critical** | Root/Administrator commands, recursive deletion, credential access | `rm -rf /`, formatting disk, modifying `.env` secrets | `Deny` / Hard Block |

---

## 3. Permission Categories

Policies can be configured globally, per-workspace, or per-session across four domains:

1. **`PermissionCategory::FilesystemRead`**: Inspecting files and directory structures.
2. **`PermissionCategory::FilesystemWrite`**: Creating, updating, or deleting workspace files.
3. **`PermissionCategory::TerminalExecute`**: Running commands inside the PTY shell.
4. **`PermissionCategory::HostProcessControl`**: Listing, inspecting, or terminating OS processes.
5. **`PermissionCategory::NetworkProbe`**: Opening raw TCP sockets or dispatching HTTP requests.

---

## 4. Immutable Audit Ledger

All agent operations are captured in the **Audit Ledger** (`crates/aether-security/src/audit.rs`), ensuring full transparency and post-incident investigation:

- **Record Structure**:
  - `id`: Unique UUIDv4.
  - `timestamp`: UTC ISO-8601 timestamp.
  - `agent_role`: Identifying agent (`Architect`, `Coder`, `Tester`, `HostOS`).
  - `tool_name`: Invoked tool name (`os_kill_process`, `write_file`).
  - `parameters`: JSON-serialized input parameters (sensitive values masked).
  - `risk_level`: Evaluated risk tier.
  - `approval_status`: `AutoApproved`, `UserApproved`, or `Rejected`.
  - `execution_result`: Success code or error message.

Audit records are visible in real-time in the **Agent OS Cockpit** under the **Audit Ledger** tab.
