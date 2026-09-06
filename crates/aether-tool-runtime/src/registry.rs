use aether_core::{AetherError, AetherResult, EventPayload};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use uuid::Uuid;

use crate::builtin_tools::{
    FsDeleteFileTool, FsListDirTool, FsReadFileTool, FsWriteFileTool, OsHttpRequestTool,
    OsKillProcessTool, OsNetworkCheckTool, OsProcessListTool, OsSystemInfoTool,
    TerminalExecuteTool,
};
use crate::traits::{Tool, ToolContext, ToolMetadata};

#[derive(Clone)]
pub struct ToolRegistry {
    tools: Arc<HashMap<String, Arc<dyn Tool>>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            tools: Arc::new(HashMap::new()),
        };
        registry.register_builtin_tools();
        registry
    }

    pub fn register_tool(&mut self, tool: Arc<dyn Tool>) {
        let name = tool.metadata().name;
        if let Some(map) = Arc::get_mut(&mut self.tools) {
            map.insert(name, tool);
        } else {
            let mut new_map = (*self.tools).clone();
            new_map.insert(name, tool);
            self.tools = Arc::new(new_map);
        }
    }

    pub fn register_builtin_tools(&mut self) {
        self.register_tool(Arc::new(FsReadFileTool));
        self.register_tool(Arc::new(FsWriteFileTool));
        self.register_tool(Arc::new(FsDeleteFileTool));
        self.register_tool(Arc::new(FsListDirTool));
        self.register_tool(Arc::new(TerminalExecuteTool));
        self.register_tool(Arc::new(OsSystemInfoTool));
        self.register_tool(Arc::new(OsProcessListTool));
        self.register_tool(Arc::new(OsKillProcessTool));
        self.register_tool(Arc::new(OsNetworkCheckTool));
        self.register_tool(Arc::new(OsHttpRequestTool));
    }

    pub fn get_tool(&self, name: &str) -> Option<Arc<dyn Tool>> {
        self.tools.get(name).cloned()
    }

    pub fn list_tools_metadata(&self) -> Vec<ToolMetadata> {
        self.tools.values().map(|t| t.metadata()).collect()
    }

    pub async fn execute_tool(
        &self,
        name: &str,
        input: Value,
        context: &ToolContext,
    ) -> AetherResult<Value> {
        let tool = self.get_tool(name).ok_or_else(|| {
            AetherError::Tool(format!("Tool not found: {}", name))
        })?;

        let call_id = Uuid::new_v4().to_string();
        let agent_uuid = context.agent_id.as_deref().and_then(|s| uuid::Uuid::parse_str(s).ok()).map(aether_core::AgentId).unwrap_or_default();

        context.event_bus.publish(EventPayload::ToolCalled {
            agent_id: agent_uuid,
            tool_name: name.to_string(),
            input: input.clone(),
            call_id: call_id.clone(),
        });

        match tool.execute(input, context).await {
            Ok(result) => {
                context.event_bus.publish(EventPayload::ToolCompleted {
                    agent_id: agent_uuid,
                    tool_name: name.to_string(),
                    call_id,
                    output: result.to_string(),
                    success: true,
                });
                Ok(result)
            }
            Err(e) => {
                context.event_bus.publish(EventPayload::ToolCompleted {
                    agent_id: agent_uuid,
                    tool_name: name.to_string(),
                    call_id,
                    output: e.to_string(),
                    success: false,
                });
                Err(e)
            }
        }
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}
