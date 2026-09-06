pub mod commands;
pub mod state;

use commands::*;
use state::AppState;
use std::env;
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let current_dir = env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
    let app_state = AppState::new(current_dir);
    let event_bus = app_state.event_bus.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .setup(move |app| {
            // Forward event bus messages to the frontend via tauri event
            let handle = app.handle().clone();
            let mut rx = event_bus.subscribe();
            tokio::spawn(async move {
                while let Ok(event) = rx.recv().await {
                    let _ = handle.emit("aether://event", event);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Workspace
            get_workspace_info,
            get_file_tree,
            read_file,
            write_file,
            create_file,
            create_folder,
            delete_path,
            rename_path,
            set_workspace_root,
            // Terminal
            create_terminal_session,
            write_terminal_input,
            resize_terminal,
            close_terminal_session,
            list_terminal_sessions,
            // Git
            get_git_status,
            stage_file,
            stage_all,
            unstage_file,
            git_commit,
            get_git_diff,
            get_git_log,
            list_branches,
            // Search
            search_content,
            search_files,
            // AI & Models
            list_providers,
            run_ai_completion,
            // Agents
            list_agents,
            create_agent,
            run_agent_task,
            list_tasks,
            submit_task,
            get_dashboard_metrics,
            run_team_pipeline,
            // Permissions & Audit
            list_audit_entries,
            resolve_permission_request,
            set_category_policy,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Aether IDE application");
}
