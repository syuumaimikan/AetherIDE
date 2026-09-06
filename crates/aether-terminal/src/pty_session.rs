use aether_core::{AetherError, AetherResult, EventBus, EventPayload};
use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::{mpsc, Mutex};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalSessionInfo {
    pub id: String,
    pub title: String,
    pub shell: String,
    pub cwd: String,
}

struct ActiveSession {
    pub info: TerminalSessionInfo,
    pub writer: Box<dyn Write + Send>,
    pub master: Box<dyn MasterPty + Send>,
}

#[derive(Clone)]
pub struct PtyManager {
    sessions: Arc<Mutex<HashMap<String, ActiveSession>>>,
    event_bus: EventBus,
}

impl PtyManager {
    pub fn new(event_bus: EventBus) -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            event_bus,
        }
    }

    pub async fn create_session(
        &self,
        custom_shell: Option<String>,
        cwd: Option<PathBuf>,
        cols: u16,
        rows: u16,
        output_tx: Option<mpsc::Sender<(String, String)>>,
    ) -> AetherResult<TerminalSessionInfo> {
        let pty_system = native_pty_system();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AetherError::Terminal(format!("Failed to open PTY: {}", e)))?;

        let shell_cmd = custom_shell.unwrap_or_else(|| {
            #[cfg(target_os = "windows")]
            {
                if which_pwsh() {
                    "powershell.exe".to_string()
                } else {
                    "cmd.exe".to_string()
                }
            }
            #[cfg(not(target_os = "windows"))]
            {
                std::env::var("SHELL").unwrap_or_else(|_| "sh".to_string())
            }
        });

        let mut cmd = CommandBuilder::new(&shell_cmd);
        if let Some(ref dir) = cwd {
            cmd.cwd(dir);
        }

        let _child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| AetherError::Terminal(format!("Failed to spawn shell '{}': {}", shell_cmd, e)))?;

        drop(pair.slave);

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| AetherError::Terminal(format!("Failed to clone PTY reader: {}", e)))?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| AetherError::Terminal(format!("Failed to get PTY writer: {}", e)))?;

        let session_id = Uuid::new_v4().to_string();
        let cwd_str = cwd
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_else(|| ".".to_string());

        let title = format!(
            "Terminal ({})",
            shell_cmd.rsplit(['/', '\\']).next().unwrap_or(&shell_cmd)
        );

        let session_info = TerminalSessionInfo {
            id: session_id.clone(),
            title,
            shell: shell_cmd,
            cwd: cwd_str,
        };

        // Spawn background reader thread
        let event_bus = self.event_bus.clone();
        let sid = session_id.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        let text = String::from_utf8_lossy(&buf[..n]).to_string();
                        event_bus.publish(EventPayload::TerminalOutput {
                            terminal_id: sid.clone(),
                            data: text.clone(),
                        });
                        if let Some(ref tx) = output_tx {
                            let _ = tx.blocking_send((sid.clone(), text));
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        let mut sessions = self.sessions.lock().await;
        sessions.insert(
            session_id,
            ActiveSession {
                info: session_info.clone(),
                writer,
                master: pair.master,
            },
        );

        Ok(session_info)
    }

    pub async fn write_input(&self, session_id: &str, data: &[u8]) -> AetherResult<()> {
        let mut sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get_mut(session_id) {
            session
                .writer
                .write_all(data)
                .map_err(|e| AetherError::Terminal(format!("Failed to write to PTY: {}", e)))?;
            session
                .writer
                .flush()
                .map_err(|e| AetherError::Terminal(format!("Failed to flush PTY: {}", e)))?;
            Ok(())
        } else {
            Err(AetherError::Terminal(format!("Session {} not found", session_id)))
        }
    }

    pub async fn resize(&self, session_id: &str, cols: u16, rows: u16) -> AetherResult<()> {
        let sessions = self.sessions.lock().await;
        if let Some(session) = sessions.get(session_id) {
            session
                .master
                .resize(PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                })
                .map_err(|e| AetherError::Terminal(format!("Failed to resize PTY: {}", e)))?;
            Ok(())
        } else {
            Err(AetherError::Terminal(format!("Session {} not found", session_id)))
        }
    }

    pub async fn close_session(&self, session_id: &str) -> AetherResult<()> {
        let mut sessions = self.sessions.lock().await;
        if sessions.remove(session_id).is_some() {
            Ok(())
        } else {
            Err(AetherError::Terminal(format!("Session {} not found", session_id)))
        }
    }

    pub async fn list_sessions(&self) -> Vec<TerminalSessionInfo> {
        let sessions = self.sessions.lock().await;
        sessions.values().map(|s| s.info.clone()).collect()
    }
}

fn which_pwsh() -> bool {
    true
}
