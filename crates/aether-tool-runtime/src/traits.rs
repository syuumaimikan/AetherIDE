use aether_core::{AetherResult, EventBus};
use aether_permission::{PermissionCategory, PermissionManager, PermissionRequest};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::mpsc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolMetadata {
    pub name: String,
    pub description: String,
    pub parameters_schema: serde_json::Value,
    pub category: PermissionCategory,
}

#[derive(Clone)]
pub struct ToolContext {
    pub workspace_root: PathBuf,
    pub agent_id: Option<String>,
    pub permission_manager: Arc<PermissionManager>,
    pub event_bus: EventBus,
    pub ask_permission_channel: Option<mpsc::Sender<PermissionRequest>>,
}

#[async_trait]
pub trait Tool: Send + Sync {
    fn metadata(&self) -> ToolMetadata;

    async fn execute(
        &self,
        input: serde_json::Value,
        context: &ToolContext,
    ) -> AetherResult<serde_json::Value>;
}
