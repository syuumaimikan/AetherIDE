use crate::state::AppState;
use aether_agent_orchestrator::{AgentDashboardMetrics, AgentTeam, OrchestratorTask};
use aether_agent_runtime::{Agent, AgentConfig, AgentRole, AgentStepResult};
use aether_ai_core::{ChatMessage, CompletionRequest, TaskType};
use aether_core::{AgentId, TaskPriority};
use aether_git::{GitCommitInfo, GitRepoStatus};
use aether_permission::{AuditEntry, PermissionCategory, PermissionDecision, PermissionPolicy};
use aether_search::{FileMatch, SearchOptions};
use aether_terminal::TerminalSessionInfo;
use aether_workspace::{FileNode, WorkspaceInfo};
use std::path::PathBuf;
use tauri::State;

// 1. Workspace Commands
#[tauri::command]
pub async fn get_workspace_info(state: State<'_, AppState>) -> Result<WorkspaceInfo, String> {
    Ok(state.workspace.get_info().await)
}

#[tauri::command]
pub async fn get_file_tree(state: State<'_, AppState>, max_depth: Option<usize>) -> Result<FileNode, String> {
    state.workspace.get_file_tree(max_depth.unwrap_or(6)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_file(state: State<'_, AppState>, path: String) -> Result<String, String> {
    state.workspace.read_file(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_file(state: State<'_, AppState>, path: String, content: String) -> Result<(), String> {
    state.workspace.write_file(&path, &content).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_file(state: State<'_, AppState>, path: String) -> Result<(), String> {
    state.workspace.create_file(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_folder(state: State<'_, AppState>, path: String) -> Result<(), String> {
    state.workspace.create_folder(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_path(state: State<'_, AppState>, path: String) -> Result<(), String> {
    state.workspace.delete(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_path(state: State<'_, AppState>, old_path: String, new_path: String) -> Result<(), String> {
    state.workspace.rename(&old_path, &new_path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_workspace_root(state: State<'_, AppState>, new_root: String) -> Result<WorkspaceInfo, String> {
    let p = PathBuf::from(&new_root);
    state.workspace.set_root(p.clone()).await;
    {
        let mut gm = state.git_manager.write().await;
        *gm = aether_git::GitManager::new(p);
    }
    Ok(state.workspace.get_info().await)
}

#[tauri::command]
pub async fn open_folder_dialog(state: State<'_, AppState>) -> Result<Option<WorkspaceInfo>, String> {
    #[cfg(target_os = "windows")]
    let output = tokio::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-Command",
            "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select Workspace Root Folder'; if($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){ $f.SelectedPath }",
        ])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    #[cfg(not(target_os = "windows"))]
    let output = tokio::process::Command::new("zenity")
        .args(["--file-selection", "--directory", "--title=Select Workspace Root Folder"])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path_str.is_empty() {
        return Ok(None);
    }

    let p = PathBuf::from(&path_str);
    if p.exists() && p.is_dir() {
        state.workspace.set_root(p.clone()).await;
        {
            let mut gm = state.git_manager.write().await;
            *gm = aether_git::GitManager::new(p);
        }
        let info = state.workspace.get_info().await;
        Ok(Some(info))
    } else {
        Ok(None)
    }
}

// 2. Terminal Commands
#[tauri::command]
pub async fn create_terminal_session(
    state: State<'_, AppState>,
    shell: Option<String>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<TerminalSessionInfo, String> {
    let root = state.workspace.get_root().await;
    state
        .pty_manager
        .create_session(shell, Some(root), cols.unwrap_or(80), rows.unwrap_or(24), None)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_terminal_input(
    state: State<'_, AppState>,
    session_id: String,
    data: String,
) -> Result<(), String> {
    state
        .pty_manager
        .write_input(&session_id, data.as_bytes())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn resize_terminal(
    state: State<'_, AppState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    state
        .pty_manager
        .resize(&session_id, cols, rows)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn close_terminal_session(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    state
        .pty_manager
        .close_session(&session_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_terminal_sessions(state: State<'_, AppState>) -> Result<Vec<TerminalSessionInfo>, String> {
    Ok(state.pty_manager.list_sessions().await)
}

// 3. Git Commands
#[tauri::command]
pub async fn get_git_status(state: State<'_, AppState>) -> Result<GitRepoStatus, String> {
    let gm = state.git_manager.read().await;
    gm.get_status().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stage_file(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let gm = state.git_manager.read().await;
    gm.stage_file(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stage_all(state: State<'_, AppState>) -> Result<(), String> {
    let gm = state.git_manager.read().await;
    gm.stage_all().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn unstage_file(state: State<'_, AppState>, path: String) -> Result<(), String> {
    let gm = state.git_manager.read().await;
    gm.unstage_file(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn git_commit(state: State<'_, AppState>, message: String) -> Result<String, String> {
    let gm = state.git_manager.read().await;
    gm.commit(&message).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_git_diff(state: State<'_, AppState>, staged: bool) -> Result<String, String> {
    let gm = state.git_manager.read().await;
    gm.get_diff(staged).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_git_log(state: State<'_, AppState>, count: Option<usize>) -> Result<Vec<GitCommitInfo>, String> {
    let gm = state.git_manager.read().await;
    gm.get_log(count.unwrap_or(20)).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_branches(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    let gm = state.git_manager.read().await;
    gm.list_branches().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn checkout_branch(state: State<'_, AppState>, branch_name: String) -> Result<(), String> {
    let gm = state.git_manager.read().await;
    gm.checkout_branch(&branch_name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_branch(state: State<'_, AppState>, branch_name: String) -> Result<(), String> {
    let gm = state.git_manager.read().await;
    gm.create_branch(&branch_name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_file_diff(
    state: State<'_, AppState>,
    path: String,
    staged: Option<bool>,
) -> Result<String, String> {
    let gm = state.git_manager.read().await;
    gm.get_file_diff(&path, staged.unwrap_or(false)).await.map_err(|e| e.to_string())
}

// 4. Search Commands
#[tauri::command]
pub async fn search_content(
    state: State<'_, AppState>,
    query: String,
    is_regex: Option<bool>,
    case_sensitive: Option<bool>,
) -> Result<Vec<FileMatch>, String> {
    let root = state.workspace.get_root().await;
    let opts = SearchOptions {
        query,
        is_regex: is_regex.unwrap_or(false),
        case_sensitive: case_sensitive.unwrap_or(false),
        match_whole_word: false,
        max_results: 300,
    };
    state.search_engine.search_content(&root, &opts).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_files(
    state: State<'_, AppState>,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<String>, String> {
    let root = state.workspace.get_root().await;
    Ok(state.search_engine.search_files(&root, &query, limit.unwrap_or(50)))
}

// 5. AI & Models
#[tauri::command]
pub async fn list_providers(state: State<'_, AppState>) -> Result<Vec<(String, String)>, String> {
    Ok(state.model_router.list_providers().await)
}

#[tauri::command]
pub async fn run_ai_completion(
    state: State<'_, AppState>,
    prompt: String,
    model: Option<String>,
) -> Result<String, String> {
    let req = CompletionRequest {
        model: model.unwrap_or_else(|| "mock-model".to_string()),
        messages: vec![ChatMessage::user(prompt)],
        tools: None,
        temperature: Some(0.2),
        max_tokens: Some(1024),
        stream: false,
    };

    let resp = state
        .model_router
        .route_and_complete(TaskType::Coding, req)
        .await
        .map_err(|e| e.to_string())?;

    Ok(resp.message.content.unwrap_or_default())
}

// 6. Agents & Orchestration
#[tauri::command]
pub async fn list_agents(state: State<'_, AppState>) -> Result<Vec<Agent>, String> {
    Ok(state.orchestrator.list_agents().await)
}

#[tauri::command]
pub async fn create_agent(
    state: State<'_, AppState>,
    name: String,
    role: String,
    model: Option<String>,
) -> Result<Agent, String> {
    let agent_role = match role.to_lowercase().as_str() {
        "architect" => AgentRole::Architect,
        "coder" => AgentRole::Coder,
        "reviewer" => AgentRole::Reviewer,
        "tester" => AgentRole::Tester,
        "security" | "security_auditor" => AgentRole::SecurityAuditor,
        "researcher" => AgentRole::Researcher,
        "optimizer" => AgentRole::Optimizer,
        _ => AgentRole::Custom,
    };

    let config = AgentConfig {
        name,
        role: agent_role,
        model: model.unwrap_or_else(|| "mock-model".to_string()),
        system_prompt: None,
        temperature: 0.2,
        max_steps: 10,
        allowed_tools: vec![
            "fs_read_file".to_string(),
            "fs_write_file".to_string(),
            "fs_list_dir".to_string(),
            "terminal_execute".to_string(),
            "os_system_info".to_string(),
        ],
    };

    let agent = Agent::new(config);
    let _id = state.orchestrator.register_agent(agent.clone()).await;
    Ok(agent)
}

#[tauri::command]
pub async fn run_agent_task(
    state: State<'_, AppState>,
    agent_id: String,
    task_prompt: String,
) -> Result<Vec<AgentStepResult>, String> {
    let uuid = uuid::Uuid::parse_str(&agent_id).map_err(|e| e.to_string())?;
    state
        .orchestrator
        .run_agent_task(&AgentId(uuid), &task_prompt)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_tasks(state: State<'_, AppState>) -> Result<Vec<OrchestratorTask>, String> {
    Ok(state.orchestrator.list_tasks().await)
}

#[tauri::command]
pub async fn submit_task(
    state: State<'_, AppState>,
    title: String,
    description: String,
    priority: Option<String>,
) -> Result<String, String> {
    let prio = match priority.as_deref().unwrap_or("normal") {
        "critical" => TaskPriority::Critical,
        "high" => TaskPriority::High,
        "low" => TaskPriority::Low,
        _ => TaskPriority::Normal,
    };
    let id = state.orchestrator.submit_task(&title, &description, prio).await;
    Ok(id.to_string())
}

#[tauri::command]
pub async fn get_dashboard_metrics(state: State<'_, AppState>) -> Result<AgentDashboardMetrics, String> {
    Ok(state.orchestrator.get_metrics().await)
}

#[tauri::command]
pub async fn run_team_pipeline(
    state: State<'_, AppState>,
    goal: String,
) -> Result<Vec<(String, Vec<AgentStepResult>)>, String> {
    let team = AgentTeam::standard_dev_team();
    state.orchestrator.run_team_pipeline(&team, &goal).await.map_err(|e| e.to_string())
}

// 7. Permissions & Audit
#[tauri::command]
pub async fn list_audit_entries(
    state: State<'_, AppState>,
    count: Option<usize>,
) -> Result<Vec<AuditEntry>, String> {
    Ok(state
        .permission_manager
        .audit_logger()
        .get_recent_entries(count.unwrap_or(100))
        .await)
}

#[tauri::command]
pub async fn resolve_permission_request(
    state: State<'_, AppState>,
    request_id: String,
    decision: String,
) -> Result<bool, String> {
    let dec = match decision.to_lowercase().as_str() {
        "allow_once" => PermissionDecision::AllowOnce,
        "allow_always" => PermissionDecision::AllowAlways,
        _ => PermissionDecision::Deny,
    };
    Ok(state.permission_manager.resolve_request(&request_id, dec).await)
}

#[tauri::command]
pub async fn set_category_policy(
    state: State<'_, AppState>,
    category: String,
    policy: String,
) -> Result<(), String> {
    let cat = match category.to_lowercase().as_str() {
        "filesystem_read" => PermissionCategory::FilesystemRead,
        "filesystem_write" => PermissionCategory::FilesystemWrite,
        "filesystem_delete" => PermissionCategory::FilesystemDelete,
        "terminal_execute" => PermissionCategory::TerminalExecute,
        "terminal_admin" => PermissionCategory::TerminalAdmin,
        "git_read" => PermissionCategory::GitRead,
        "git_commit" => PermissionCategory::GitCommit,
        "git_push" => PermissionCategory::GitPush,
        "git_force_push" => PermissionCategory::GitForcePush,
        "os_application" => PermissionCategory::OsApplication,
        _ => PermissionCategory::Network,
    };

    let pol = match policy.to_lowercase().as_str() {
        "allow_always" => PermissionPolicy::AllowAlways,
        "deny" => PermissionPolicy::Deny,
        _ => PermissionPolicy::Ask,
    };

    state.permission_manager.set_category_policy(cat, pol).await;
    Ok(())
}

// 10. OS & System Sandboxed Control Commands
#[tauri::command]
pub async fn os_list_processes(
    state: State<'_, AppState>,
    filter: Option<String>,
) -> Result<serde_json::Value, String> {
    let tool = state.tool_registry.get_tool("os_process_list")
        .ok_or_else(|| "Tool 'os_process_list' not registered".to_string())?;

    let ctx = aether_tool_runtime::ToolContext {
        agent_id: None,
        workspace_root: state.workspace.get_root().await,
        permission_manager: state.permission_manager.clone(),
        event_bus: state.event_bus.clone(),
        ask_permission_channel: None,
    };

    tool.execute(serde_json::json!({ "filter": filter }), &ctx).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn os_kill_process(
    state: State<'_, AppState>,
    pid: u32,
    force: Option<bool>,
) -> Result<serde_json::Value, String> {
    let tool = state.tool_registry.get_tool("os_kill_process")
        .ok_or_else(|| "Tool 'os_kill_process' not registered".to_string())?;

    let ctx = aether_tool_runtime::ToolContext {
        agent_id: None,
        workspace_root: state.workspace.get_root().await,
        permission_manager: state.permission_manager.clone(),
        event_bus: state.event_bus.clone(),
        ask_permission_channel: None,
    };

    tool.execute(serde_json::json!({ "pid": pid, "force": force.unwrap_or(false) }), &ctx).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn os_network_check(
    state: State<'_, AppState>,
    host: String,
    port: u16,
    timeout_ms: Option<u64>,
) -> Result<serde_json::Value, String> {
    let tool = state.tool_registry.get_tool("os_network_check")
        .ok_or_else(|| "Tool 'os_network_check' not registered".to_string())?;

    let ctx = aether_tool_runtime::ToolContext {
        agent_id: None,
        workspace_root: state.workspace.get_root().await,
        permission_manager: state.permission_manager.clone(),
        event_bus: state.event_bus.clone(),
        ask_permission_channel: None,
    };

    tool.execute(serde_json::json!({ "host": host, "port": port, "timeout_ms": timeout_ms.unwrap_or(3000) }), &ctx).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn os_http_request(
    state: State<'_, AppState>,
    url: String,
    method: Option<String>,
    body: Option<String>,
    headers: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let tool = state.tool_registry.get_tool("os_http_request")
        .ok_or_else(|| "Tool 'os_http_request' not registered".to_string())?;

    let ctx = aether_tool_runtime::ToolContext {
        agent_id: None,
        workspace_root: state.workspace.get_root().await,
        permission_manager: state.permission_manager.clone(),
        event_bus: state.event_bus.clone(),
        ask_permission_channel: None,
    };

    tool.execute(serde_json::json!({
        "url": url,
        "method": method.unwrap_or_else(|| "GET".to_string()),
        "body": body,
        "headers": headers,
    }), &ctx).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn os_get_system_stats(
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let tool = state.tool_registry.get_tool("os_system_info")
        .ok_or_else(|| "Tool 'os_system_info' not registered".to_string())?;

    let ctx = aether_tool_runtime::ToolContext {
        agent_id: None,
        workspace_root: state.workspace.get_root().await,
        permission_manager: state.permission_manager.clone(),
        event_bus: state.event_bus.clone(),
        ask_permission_channel: None,
    };

    tool.execute(serde_json::json!({}), &ctx).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn os_get_audit_logs(
    state: State<'_, AppState>,
    limit: Option<usize>,
) -> Result<Vec<AuditEntry>, String> {
    Ok(state.permission_manager.audit_logger().get_recent_entries(limit.unwrap_or(100)).await)
}
