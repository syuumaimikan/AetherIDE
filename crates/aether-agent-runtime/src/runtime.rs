use aether_ai_core::{
    ChatMessage, CompletionRequest, ModelRouter, TaskType, ToolDefinition, ToolFunctionDefinition,
};
use aether_core::{AetherError, AetherResult, AgentStatus, CancellationToken, EventBus, EventPayload};
use aether_permission::PermissionManager;
use aether_tool_runtime::{ToolContext, ToolRegistry};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;

use crate::agent::Agent;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentStepResult {
    pub step_index: usize,
    pub thought: Option<String>,
    pub tool_name: Option<String>,
    pub tool_input: Option<serde_json::Value>,
    pub tool_output: Option<serde_json::Value>,
    pub is_terminal: bool,
}

#[derive(Clone)]
pub struct AgentRuntime {
    tool_registry: ToolRegistry,
    permission_manager: Arc<PermissionManager>,
    model_router: ModelRouter,
    event_bus: EventBus,
    workspace_root: PathBuf,
}

impl AgentRuntime {
    pub fn new(
        tool_registry: ToolRegistry,
        permission_manager: Arc<PermissionManager>,
        model_router: ModelRouter,
        event_bus: EventBus,
        workspace_root: PathBuf,
    ) -> Self {
        Self {
            tool_registry,
            permission_manager,
            model_router,
            event_bus,
            workspace_root,
        }
    }

    pub async fn run_agent(
        &self,
        agent: &mut Agent,
        task_prompt: &str,
        cancellation_token: CancellationToken,
    ) -> AetherResult<Vec<AgentStepResult>> {
        agent.status = AgentStatus::Running;
        agent.current_task = Some(task_prompt.to_string());

        self.event_bus.publish(EventPayload::AgentStarted {
            agent_id: agent.id,
            agent_name: agent.config.name.clone(),
            role: format!("{:?}", agent.config.role),
        });

        let system_prompt = agent
            .config
            .system_prompt
            .clone()
            .unwrap_or_else(|| agent.config.role.default_prompt().to_string());

        let mut messages = vec![
            ChatMessage::system(system_prompt),
            ChatMessage::user(task_prompt),
        ];

        // Prepare tool definitions allowed for this agent
        let available_tools = self.tool_registry.list_tools_metadata();
        let tool_definitions: Vec<ToolDefinition> = available_tools
            .into_iter()
            .filter(|t| agent.config.allowed_tools.iter().any(|allowed| allowed == &t.name))
            .map(|t| ToolDefinition {
                tool_type: "function".to_string(),
                function: ToolFunctionDefinition {
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters_schema,
                },
            })
            .collect();

        let tool_context = ToolContext {
            workspace_root: self.workspace_root.clone(),
            agent_id: Some(agent.id.to_string()),
            permission_manager: self.permission_manager.clone(),
            event_bus: self.event_bus.clone(),
            ask_permission_channel: None,
        };

        let mut step_results = Vec::new();
        let max_steps = agent.config.max_steps;

        for step in 1..=max_steps {
            if cancellation_token.is_cancelled() {
                agent.status = AgentStatus::Cancelled;
                self.event_bus.publish(EventPayload::AgentStatusChanged {
                    agent_id: agent.id,
                    old_status: AgentStatus::Running,
                    new_status: AgentStatus::Cancelled,
                    reason: Some("Task cancelled by user".to_string()),
                });
                return Err(AetherError::Cancelled("Agent execution cancelled".to_string()));
            }

            let req = CompletionRequest {
                model: agent.config.model.clone(),
                messages: messages.clone(),
                tools: if tool_definitions.is_empty() {
                    None
                } else {
                    Some(tool_definitions.clone())
                },
                temperature: Some(agent.config.temperature),
                max_tokens: Some(2048),
                stream: false,
            };

            let response = self
                .model_router
                .route_and_complete(TaskType::Coding, req)
                .await
                .map_err(|e| {
                    agent.status = AgentStatus::Failed;
                    self.event_bus.publish(EventPayload::AgentStatusChanged {
                        agent_id: agent.id,
                        old_status: AgentStatus::Running,
                        new_status: AgentStatus::Failed,
                        reason: Some(e.to_string()),
                    });
                    e
                })?;

            agent.total_tokens_used += response.usage.total_tokens;
            agent.steps_completed = step;

            let msg = response.message;

            // Check for tool calls
            if let Some(ref calls) = msg.tool_calls {
                if !calls.is_empty() {
                    // Record thought if any
                    let thought = msg.content.clone();
                    messages.push(msg.clone());

                    for call in calls {
                        let parsed_input: serde_json::Value =
                            serde_json::from_str(&call.function.arguments).unwrap_or(serde_json::json!({}));

                        let tool_result = self
                            .tool_registry
                            .execute_tool(&call.function.name, parsed_input.clone(), &tool_context)
                            .await;

                        let output_val = match tool_result {
                            Ok(val) => val,
                            Err(e) => serde_json::json!({ "error": e.to_string() }),
                        };

                        messages.push(ChatMessage::tool_response(
                            &call.id,
                            output_val.to_string(),
                        ));

                        step_results.push(AgentStepResult {
                            step_index: step,
                            thought: thought.clone(),
                            tool_name: Some(call.function.name.clone()),
                            tool_input: Some(parsed_input),
                            tool_output: Some(output_val),
                            is_terminal: false,
                        });
                    }
                    continue;
                }
            }

            // Normal text response (terminal)
            step_results.push(AgentStepResult {
                step_index: step,
                thought: msg.content.clone(),
                tool_name: None,
                tool_input: None,
                tool_output: None,
                is_terminal: true,
            });

            break;
        }

        agent.status = AgentStatus::Completed;
        self.event_bus.publish(EventPayload::AgentStopped {
            agent_id: agent.id,
            agent_name: agent.config.name.clone(),
            status: AgentStatus::Completed,
        });

        Ok(step_results)
    }
}
