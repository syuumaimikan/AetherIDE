use aether_core::{AetherError, AetherResult};
use aether_permission::PermissionCategory;
use async_trait::async_trait;
use serde_json::json;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::io::AsyncReadExt;
use tokio::process::Command;

use crate::traits::{Tool, ToolContext, ToolMetadata};

fn resolve_path(workspace: &Path, rel_or_abs: &str) -> PathBuf {
    let p = Path::new(rel_or_abs);
    if p.is_absolute() {
        p.to_path_buf()
    } else {
        workspace.join(p)
    }
}

// 1. File Read Tool
pub struct FsReadFileTool;

#[async_trait]
impl Tool for FsReadFileTool {
    fn metadata(&self) -> ToolMetadata {
        ToolMetadata {
            name: "fs_read_file".to_string(),
            description: "Read the UTF-8 content of a file in the workspace".to_string(),
            category: PermissionCategory::FilesystemRead,
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Relative or absolute path of file" },
                    "start_line": { "type": "integer", "description": "Optional 1-indexed starting line" },
                    "end_line": { "type": "integer", "description": "Optional 1-indexed ending line" }
                },
                "required": ["path"]
            }),
        }
    }

    async fn execute(&self, input: serde_json::Value, ctx: &ToolContext) -> AetherResult<serde_json::Value> {
        let path_str = input["path"].as_str().ok_or_else(|| AetherError::Tool("Missing 'path' parameter".to_string()))?;
        let full_path = resolve_path(&ctx.workspace_root, path_str);

        let allowed = ctx.permission_manager.check_permission(
            ctx.agent_id.clone(),
            PermissionCategory::FilesystemRead,
            "read_file",
            path_str,
            ctx.ask_permission_channel.clone(),
        ).await?;

        if !allowed {
            return Err(AetherError::PermissionDenied(format!("Read access denied for {}", path_str)));
        }

        let content = tokio::fs::read_to_string(&full_path).await.map_err(|e| {
            AetherError::File(format!("Failed to read file {}: {}", full_path.display(), e))
        })?;

        let lines: Vec<&str> = content.lines().collect();
        let total_lines = lines.len();

        let start = input["start_line"].as_u64().map(|v| (v.max(1) - 1) as usize).unwrap_or(0);
        let end = input["end_line"].as_u64().map(|v| v as usize).unwrap_or(total_lines).min(total_lines);

        let sliced = if start < lines.len() {
            lines[start..end].join("\n")
        } else {
            String::new()
        };

        Ok(json!({
            "path": path_str,
            "total_lines": total_lines,
            "start_line": start + 1,
            "end_line": end,
            "content": sliced
        }))
    }
}

// 2. File Write Tool
pub struct FsWriteFileTool;

#[async_trait]
impl Tool for FsWriteFileTool {
    fn metadata(&self) -> ToolMetadata {
        ToolMetadata {
            name: "fs_write_file".to_string(),
            description: "Write content to a file, creating parent directories if necessary".to_string(),
            category: PermissionCategory::FilesystemWrite,
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Relative or absolute path of file" },
                    "content": { "type": "string", "description": "Full UTF-8 content to write" }
                },
                "required": ["path", "content"]
            }),
        }
    }

    async fn execute(&self, input: serde_json::Value, ctx: &ToolContext) -> AetherResult<serde_json::Value> {
        let path_str = input["path"].as_str().ok_or_else(|| AetherError::Tool("Missing 'path' parameter".to_string()))?;
        let content = input["content"].as_str().ok_or_else(|| AetherError::Tool("Missing 'content' parameter".to_string()))?;
        let full_path = resolve_path(&ctx.workspace_root, path_str);

        let allowed = ctx.permission_manager.check_permission(
            ctx.agent_id.clone(),
            PermissionCategory::FilesystemWrite,
            "write_file",
            path_str,
            ctx.ask_permission_channel.clone(),
        ).await?;

        if !allowed {
            return Err(AetherError::PermissionDenied(format!("Write access denied for {}", path_str)));
        }

        if let Some(parent) = full_path.parent() {
            tokio::fs::create_dir_all(parent).await.map_err(|e| {
                AetherError::File(format!("Failed to create parent directory: {}", e))
            })?;
        }

        tokio::fs::write(&full_path, content.as_bytes()).await.map_err(|e| {
            AetherError::File(format!("Failed to write file {}: {}", full_path.display(), e))
        })?;

        Ok(json!({
            "success": true,
            "path": path_str,
            "bytes_written": content.len()
        }))
    }
}

// 3. File Delete Tool
pub struct FsDeleteFileTool;

#[async_trait]
impl Tool for FsDeleteFileTool {
    fn metadata(&self) -> ToolMetadata {
        ToolMetadata {
            name: "fs_delete_file".to_string(),
            description: "Delete a file from the workspace".to_string(),
            category: PermissionCategory::FilesystemDelete,
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "File path to delete" }
                },
                "required": ["path"]
            }),
        }
    }

    async fn execute(&self, input: serde_json::Value, ctx: &ToolContext) -> AetherResult<serde_json::Value> {
        let path_str = input["path"].as_str().ok_or_else(|| AetherError::Tool("Missing 'path' parameter".to_string()))?;
        let full_path = resolve_path(&ctx.workspace_root, path_str);

        let allowed = ctx.permission_manager.check_permission(
            ctx.agent_id.clone(),
            PermissionCategory::FilesystemDelete,
            "delete_file",
            path_str,
            ctx.ask_permission_channel.clone(),
        ).await?;

        if !allowed {
            return Err(AetherError::PermissionDenied(format!("Delete access denied for {}", path_str)));
        }

        if full_path.is_file() {
            tokio::fs::remove_file(&full_path).await.map_err(|e| {
                AetherError::File(format!("Failed to delete file: {}", e))
            })?;
        } else if full_path.is_dir() {
            tokio::fs::remove_dir_all(&full_path).await.map_err(|e| {
                AetherError::File(format!("Failed to delete directory: {}", e))
            })?;
        } else {
            return Err(AetherError::File(format!("File does not exist: {}", path_str)));
        }

        Ok(json!({
            "success": true,
            "deleted": path_str
        }))
    }
}

// 4. List Directory Tool
pub struct FsListDirTool;

#[async_trait]
impl Tool for FsListDirTool {
    fn metadata(&self) -> ToolMetadata {
        ToolMetadata {
            name: "fs_list_dir".to_string(),
            description: "List directory contents including files and subdirectories".to_string(),
            category: PermissionCategory::FilesystemRead,
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "path": { "type": "string", "description": "Directory path (defaults to workspace root if empty)" }
                }
            }),
        }
    }

    async fn execute(&self, input: serde_json::Value, ctx: &ToolContext) -> AetherResult<serde_json::Value> {
        let path_str = input["path"].as_str().unwrap_or(".");
        let full_path = resolve_path(&ctx.workspace_root, path_str);

        let mut read_dir = tokio::fs::read_dir(&full_path).await.map_err(|e| {
            AetherError::File(format!("Failed to read directory {}: {}", full_path.display(), e))
        })?;

        let mut items = Vec::new();
        while let Some(entry) = read_dir.next_entry().await.map_err(|e| AetherError::File(e.to_string()))? {
            let file_type = entry.file_type().await.map_err(|e| AetherError::File(e.to_string()))?;
            items.push(json!({
                "name": entry.file_name().to_string_lossy(),
                "is_dir": file_type.is_dir(),
                "is_file": file_type.is_file(),
            }));
        }

        Ok(json!({
            "path": path_str,
            "entries": items
        }))
    }
}

// 5. Terminal Execute Tool
pub struct TerminalExecuteTool;

#[async_trait]
impl Tool for TerminalExecuteTool {
    fn metadata(&self) -> ToolMetadata {
        ToolMetadata {
            name: "terminal_execute".to_string(),
            description: "Execute a command in the shell environment and retrieve exit code, stdout, and stderr".to_string(),
            category: PermissionCategory::TerminalExecute,
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "command": { "type": "string", "description": "Shell command line to execute" },
                    "cwd": { "type": "string", "description": "Optional working directory" }
                },
                "required": ["command"]
            }),
        }
    }

    async fn execute(&self, input: serde_json::Value, ctx: &ToolContext) -> AetherResult<serde_json::Value> {
        let command_str = input["command"].as_str().ok_or_else(|| AetherError::Tool("Missing 'command' parameter".to_string()))?;
        let cwd_str = input["cwd"].as_str().unwrap_or(".");
        let cwd_path = resolve_path(&ctx.workspace_root, cwd_str);

        let allowed = ctx.permission_manager.check_permission(
            ctx.agent_id.clone(),
            PermissionCategory::TerminalExecute,
            "execute_command",
            command_str,
            ctx.ask_permission_channel.clone(),
        ).await?;

        if !allowed {
            return Err(AetherError::PermissionDenied(format!("Command execution denied: {}", command_str)));
        }

        #[cfg(target_os = "windows")]
        let mut cmd = {
            let mut c = Command::new("powershell.exe");
            c.args(["-NoProfile", "-NonInteractive", "-Command", command_str]);
            c
        };

        #[cfg(not(target_os = "windows"))]
        let mut cmd = {
            let mut c = Command::new("sh");
            c.args(["-c", command_str]);
            c
        };

        cmd.current_dir(cwd_path);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = cmd.spawn().map_err(|e| AetherError::Terminal(format!("Failed to spawn process: {}", e)))?;

        let mut stdout_str = String::new();
        let mut stderr_str = String::new();

        if let Some(mut stdout) = child.stdout.take() {
            let _ = stdout.read_to_string(&mut stdout_str).await;
        }
        if let Some(mut stderr) = child.stderr.take() {
            let _ = stderr.read_to_string(&mut stderr_str).await;
        }

        let status = child.wait().await.map_err(|e| AetherError::Terminal(format!("Process error: {}", e)))?;

        Ok(json!({
            "command": command_str,
            "exit_code": status.code().unwrap_or(-1),
            "success": status.success(),
            "stdout": stdout_str,
            "stderr": stderr_str
        }))
    }
}

// 6. OS System Info Tool
pub struct OsSystemInfoTool;

#[async_trait]
impl Tool for OsSystemInfoTool {
    fn metadata(&self) -> ToolMetadata {
        ToolMetadata {
            name: "os_system_info".to_string(),
            description: "Get OS, system architecture, CPU count, and workspace path details".to_string(),
            category: PermissionCategory::FilesystemRead,
            parameters_schema: json!({
                "type": "object",
                "properties": {}
            }),
        }
    }

    async fn execute(&self, _input: serde_json::Value, ctx: &ToolContext) -> AetherResult<serde_json::Value> {
        Ok(json!({
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "family": std::env::consts::FAMILY,
            "workspace": ctx.workspace_root.display().to_string(),
            "num_cpus": num_cpus::get(),
        }))
    }
}

// 7. OS Process List Tool
pub struct OsProcessListTool;

#[async_trait]
impl Tool for OsProcessListTool {
    fn metadata(&self) -> ToolMetadata {
        ToolMetadata {
            name: "os_process_list".to_string(),
            description: "List running host operating system processes with PID, Name, and Memory footprint".to_string(),
            category: PermissionCategory::FilesystemRead,
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "filter": { "type": "string", "description": "Optional substring to filter process names" }
                }
            }),
        }
    }

    async fn execute(&self, input: serde_json::Value, _ctx: &ToolContext) -> AetherResult<serde_json::Value> {
        let filter = input["filter"].as_str().map(|s| s.to_lowercase());

        #[cfg(target_os = "windows")]
        let output = {
            let mut cmd = Command::new("tasklist.exe");
            cmd.args(["/FO", "CSV", "/NH"]);
            cmd.output().await.map_err(|e| AetherError::Tool(format!("Failed to run tasklist: {}", e)))?
        };

        #[cfg(not(target_os = "windows"))]
        let output = {
            let mut cmd = Command::new("ps");
            cmd.args(["-eo", "pid,comm,rss"]);
            cmd.output().await.map_err(|e| AetherError::Tool(format!("Failed to run ps: {}", e)))?
        };

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut processes = Vec::new();

        #[cfg(target_os = "windows")]
        {
            for line in stdout.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                let parts: Vec<&str> = trimmed.split(',').map(|s| s.trim_matches('"')).collect();
                if parts.len() >= 5 {
                    let name = parts[0];
                    let pid: u32 = parts[1].parse().unwrap_or(0);
                    let session = parts[2];
                    let mem = parts[4];
                    if let Some(ref f) = filter {
                        if !name.to_lowercase().contains(f) {
                            continue;
                        }
                    }
                    processes.push(json!({
                        "name": name,
                        "pid": pid,
                        "session": session,
                        "memory": mem,
                    }));
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            for line in stdout.lines().skip(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 3 {
                    let pid: u32 = parts[0].parse().unwrap_or(0);
                    let name = parts[1];
                    let mem_kb = parts[2];
                    if let Some(ref f) = filter {
                        if !name.to_lowercase().contains(f) {
                            continue;
                        }
                    }
                    processes.push(json!({
                        "name": name,
                        "pid": pid,
                        "session": "user",
                        "memory": format!("{} KB", mem_kb),
                    }));
                }
            }
        }

        Ok(json!({
            "total_processes": processes.len(),
            "processes": processes
        }))
    }
}

// 8. OS Kill Process Tool
pub struct OsKillProcessTool;

#[async_trait]
impl Tool for OsKillProcessTool {
    fn metadata(&self) -> ToolMetadata {
        ToolMetadata {
            name: "os_kill_process".to_string(),
            description: "Terminate a running host process by its PID (guarded by terminal administration policy)".to_string(),
            category: PermissionCategory::TerminalAdmin,
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "pid": { "type": "integer", "description": "Numeric PID of process to terminate" },
                    "force": { "type": "boolean", "description": "Whether to force terminate" }
                },
                "required": ["pid"]
            }),
        }
    }

    async fn execute(&self, input: serde_json::Value, ctx: &ToolContext) -> AetherResult<serde_json::Value> {
        let pid = input["pid"].as_u64().ok_or_else(|| AetherError::Tool("Missing 'pid'".to_string()))? as u32;
        let force = input["force"].as_bool().unwrap_or(false);

        let allowed = ctx.permission_manager.check_permission(
            ctx.agent_id.clone(),
            PermissionCategory::TerminalAdmin,
            "kill_process",
            &format!("pid:{}", pid),
            ctx.ask_permission_channel.clone(),
        ).await?;

        if !allowed {
            return Err(AetherError::PermissionDenied(format!("Process termination denied for PID {}", pid)));
        }

        #[cfg(target_os = "windows")]
        let mut cmd = {
            let mut c = Command::new("taskkill.exe");
            c.args(["/PID", &pid.to_string()]);
            if force {
                c.arg("/F");
            }
            c
        };

        #[cfg(not(target_os = "windows"))]
        let mut cmd = {
            let mut c = Command::new("kill");
            if force {
                c.arg("-9");
            }
            c.arg(&pid.to_string());
            c
        };

        let output = cmd.output().await.map_err(|e| AetherError::Terminal(format!("Failed to execute process termination: {}", e)))?;
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        Ok(json!({
            "pid": pid,
            "success": output.status.success(),
            "stdout": stdout.trim(),
            "stderr": stderr.trim(),
        }))
    }
}

// 9. OS Network Connectivity Tool
pub struct OsNetworkCheckTool;

#[async_trait]
impl Tool for OsNetworkCheckTool {
    fn metadata(&self) -> ToolMetadata {
        ToolMetadata {
            name: "os_network_check".to_string(),
            description: "Check TCP network reachability and latency to a host and port".to_string(),
            category: PermissionCategory::TerminalExecute,
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "host": { "type": "string", "description": "Target hostname or IP address" },
                    "port": { "type": "integer", "description": "Target port (e.g. 80, 443, 8080)" },
                    "timeout_ms": { "type": "integer", "description": "Timeout in milliseconds (default: 3000)" }
                },
                "required": ["host", "port"]
            }),
        }
    }

    async fn execute(&self, input: serde_json::Value, ctx: &ToolContext) -> AetherResult<serde_json::Value> {
        let host = input["host"].as_str().ok_or_else(|| AetherError::Tool("Missing 'host'".to_string()))?;
        let port = input["port"].as_u64().ok_or_else(|| AetherError::Tool("Missing 'port'".to_string()))? as u16;
        let timeout_ms = input["timeout_ms"].as_u64().unwrap_or(3000);

        let allowed = ctx.permission_manager.check_permission(
            ctx.agent_id.clone(),
            PermissionCategory::TerminalExecute,
            "network_probe",
            &format!("{}:{}", host, port),
            ctx.ask_permission_channel.clone(),
        ).await?;

        if !allowed {
            return Err(AetherError::PermissionDenied(format!("Network probe denied for {}:{}", host, port)));
        }

        let addr = format!("{}:{}", host, port);
        let start = std::time::Instant::now();

        let reach_result = tokio::time::timeout(
            std::time::Duration::from_millis(timeout_ms),
            tokio::net::TcpStream::connect(&addr),
        ).await;

        let elapsed = start.elapsed().as_millis() as u64;

        match reach_result {
            Ok(Ok(_stream)) => Ok(json!({
                "host": host,
                "port": port,
                "reachable": true,
                "latency_ms": elapsed,
                "status": "connected"
            })),
            Ok(Err(e)) => Ok(json!({
                "host": host,
                "port": port,
                "reachable": false,
                "latency_ms": elapsed,
                "error": e.to_string(),
                "status": "connection_refused"
            })),
            Err(_) => Ok(json!({
                "host": host,
                "port": port,
                "reachable": false,
                "latency_ms": timeout_ms,
                "error": "timed out",
                "status": "timeout"
            })),
        }
    }
}

// 10. OS HTTP Request Tool
pub struct OsHttpRequestTool;

#[async_trait]
impl Tool for OsHttpRequestTool {
    fn metadata(&self) -> ToolMetadata {
        ToolMetadata {
            name: "os_http_request".to_string(),
            description: "Execute a sandboxed HTTP request (GET, POST, HEAD) to inspect external APIs, docs, or web services".to_string(),
            category: PermissionCategory::TerminalExecute,
            parameters_schema: json!({
                "type": "object",
                "properties": {
                    "url": { "type": "string", "description": "Target URL (http:// or https://)" },
                    "method": { "type": "string", "description": "HTTP Method: GET, POST, HEAD, PUT, DELETE (default GET)" },
                    "body": { "type": "string", "description": "Optional request body string" },
                    "headers": { "type": "object", "description": "Optional key-value headers map" }
                },
                "required": ["url"]
            }),
        }
    }

    async fn execute(&self, input: serde_json::Value, ctx: &ToolContext) -> AetherResult<serde_json::Value> {
        let url = input["url"].as_str().ok_or_else(|| AetherError::Tool("Missing 'url'".to_string()))?;
        let method_str = input["method"].as_str().unwrap_or("GET").to_uppercase();

        let allowed = ctx.permission_manager.check_permission(
            ctx.agent_id.clone(),
            PermissionCategory::TerminalExecute,
            "http_request",
            url,
            ctx.ask_permission_channel.clone(),
        ).await?;

        if !allowed {
            return Err(AetherError::PermissionDenied(format!("HTTP request denied for {}", url)));
        }

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(|e| AetherError::Tool(format!("Failed to build HTTP client: {}", e)))?;

        let mut req = match method_str.as_str() {
            "POST" => client.post(url),
            "HEAD" => client.head(url),
            "PUT" => client.put(url),
            "DELETE" => client.delete(url),
            _ => client.get(url),
        };

        if let Some(headers_obj) = input["headers"].as_object() {
            for (k, v) in headers_obj {
                if let Some(val_str) = v.as_str() {
                    req = req.header(k, val_str);
                }
            }
        }

        if let Some(body_str) = input["body"].as_str() {
            req = req.body(body_str.to_string());
        }

        let res = req.send().await.map_err(|e| AetherError::Tool(format!("HTTP request failed: {}", e)))?;
        let status = res.status().as_u16();
        let status_text = res.status().canonical_reason().unwrap_or("Unknown").to_string();

        let mut res_headers = serde_json::Map::new();
        for (k, v) in res.headers() {
            res_headers.insert(k.as_str().to_string(), json!(v.to_str().unwrap_or("")));
        }

        let text = res.text().await.map_err(|e| AetherError::Tool(format!("Failed to read response body: {}", e)))?;
        let preview = if text.len() > 10_000 {
            format!("{}... [truncated]", &text[..10_000])
        } else {
            text.clone()
        };

        Ok(json!({
            "url": url,
            "status": status,
            "status_text": status_text,
            "headers": res_headers,
            "body": preview,
            "content_length": text.len()
        }))
    }
}

mod num_cpus {
    pub fn get() -> usize {
        std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use aether_permission::PermissionManager;
    use std::sync::Arc;

    #[tokio::test]
    async fn test_system_info_tool() {
        let tool = OsSystemInfoTool;
        let perm = Arc::new(PermissionManager::default());
        let ctx = ToolContext {
            agent_id: None,
            workspace_root: PathBuf::from("."),
            permission_manager: perm,
            event_bus: aether_core::EventBus::default(),
            ask_permission_channel: None,
        };
        let res = tool.execute(json!({}), &ctx).await.unwrap();
        assert!(res.get("os").is_some());
        assert!(res.get("num_cpus").is_some());
    }

    #[tokio::test]
    async fn test_fs_read_write_tool() {
        let dir = std::env::temp_dir().join(format!("aether_test_{}", uuid::Uuid::new_v4()));
        tokio::fs::create_dir_all(&dir).await.unwrap();

        let perm = Arc::new(PermissionManager::default());
        perm.set_category_policy(
            aether_permission::PermissionCategory::FilesystemWrite,
            aether_permission::PermissionPolicy::AllowAlways,
        )
        .await;
        let ctx = ToolContext {
            agent_id: None,
            workspace_root: dir.clone(),
            permission_manager: perm,
            event_bus: aether_core::EventBus::default(),
            ask_permission_channel: None,
        };

        let write_tool = FsWriteFileTool;
        let write_res = write_tool.execute(json!({
            "path": "hello.txt",
            "content": "Hello Aether IDE!"
        }), &ctx).await.unwrap();
        assert_eq!(write_res["success"], true);

        let read_tool = FsReadFileTool;
        let read_res = read_tool.execute(json!({
            "path": "hello.txt"
        }), &ctx).await.unwrap();
        assert_eq!(read_res["content"], "Hello Aether IDE!");

        let _ = tokio::fs::remove_dir_all(&dir).await;
    }

    #[tokio::test]
    async fn test_network_check_tool() {
        let tool = OsNetworkCheckTool;
        let perm = Arc::new(PermissionManager::default());
        let ctx = ToolContext {
            agent_id: None,
            workspace_root: PathBuf::from("."),
            permission_manager: perm,
            event_bus: aether_core::EventBus::default(),
            ask_permission_channel: None,
        };
        let res = tool.execute(json!({
            "host": "127.0.0.1",
            "port": 64999,
            "timeout_ms": 100
        }), &ctx).await.unwrap();
        assert_eq!(res["host"], "127.0.0.1");
        assert_eq!(res["port"], 64999);
    }
}
