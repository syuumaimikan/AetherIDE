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

mod num_cpus {
    pub fn get() -> usize {
        std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1)
    }
}
