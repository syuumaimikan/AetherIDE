use aether_core::AetherResult;
use async_trait::async_trait;
use tokio::sync::mpsc;

use crate::provider::ModelProvider;
use crate::types::{
    ChatMessage, ChatRole, CompletionRequest, CompletionResponse, FunctionCall, StreamDelta,
    ToolCall, UsageInfo,
};

pub struct MockModelProvider {
    provider_id: String,
    display_name: String,
}

impl Default for MockModelProvider {
    fn default() -> Self {
        Self::new()
    }
}

impl MockModelProvider {
    pub fn new() -> Self {
        Self {
            provider_id: "mock".to_string(),
            display_name: "Mock AI (Simulation & Tests)".to_string(),
        }
    }
}

#[async_trait]
impl ModelProvider for MockModelProvider {
    fn provider_id(&self) -> &str {
        &self.provider_id
    }

    fn display_name(&self) -> &str {
        &self.display_name
    }

    async fn complete(&self, req: CompletionRequest) -> AetherResult<CompletionResponse> {
        let last_msg = req.messages.last();
        let last_role = last_msg.map(|m| m.role);

        // Check if previous message was a tool result
        if last_role == Some(ChatRole::Tool) {
            let tool_content = last_msg.and_then(|m| m.content.as_deref()).unwrap_or("");
            return Ok(CompletionResponse {
                message: ChatMessage::assistant(format!(
                    "Tool execution completed successfully. Summary of output:\n{}\n\nTask finished with zero errors.",
                    tool_content
                )),
                finish_reason: Some("stop".to_string()),
                usage: UsageInfo {
                    prompt_tokens: 150,
                    completion_tokens: 45,
                    total_tokens: 195,
                },
            });
        }

        // Check user prompt
        let prompt_text = last_msg
            .and_then(|m| m.content.as_deref())
            .unwrap_or("")
            .to_lowercase();

        // If tools are available, simulate tool calls based on user request
        if let Some(ref tools) = req.tools {
            if !tools.is_empty() {
                if prompt_text.contains("list") || prompt_text.contains("files") || prompt_text.contains("explorer") {
                    return Ok(CompletionResponse {
                        message: ChatMessage::assistant_tool_calls(vec![ToolCall {
                            id: "call_mock_1".to_string(),
                            call_type: "function".to_string(),
                            function: FunctionCall {
                                name: "fs_list_dir".to_string(),
                                arguments: "{\"path\": \".\"}".to_string(),
                            },
                        }]),
                        finish_reason: Some("tool_calls".to_string()),
                        usage: UsageInfo {
                            prompt_tokens: 120,
                            completion_tokens: 25,
                            total_tokens: 145,
                        },
                    });
                } else if prompt_text.contains("run") || prompt_text.contains("test") || prompt_text.contains("command") {
                    return Ok(CompletionResponse {
                        message: ChatMessage::assistant_tool_calls(vec![ToolCall {
                            id: "call_mock_2".to_string(),
                            call_type: "function".to_string(),
                            function: FunctionCall {
                                name: "terminal_execute".to_string(),
                                arguments: "{\"command\": \"cargo --version\"}".to_string(),
                            },
                        }]),
                        finish_reason: Some("tool_calls".to_string()),
                        usage: UsageInfo {
                            prompt_tokens: 130,
                            completion_tokens: 30,
                            total_tokens: 160,
                        },
                    });
                }
            }
        }

        // Standard completion response
        let text_reply = if prompt_text.contains("explain") {
            "### Code Explanation\n\nThis component implements an asynchronous event-driven architecture with clean separation of concerns, strict type safety, and non-blocking I/O.".to_string()
        } else if prompt_text.contains("refactor") {
            "### Suggested Refactoring\n\n1. Extract common logic into helper traits.\n2. Ensure zero unwraps on critical boundaries.\n3. Add comprehensive unit testing.".to_string()
        } else {
            format!(
                "AETHER Agent responded to prompt:\n\"{}\"\n\nSystem state is normal. All pipelines operational.",
                last_msg.and_then(|m| m.content.as_deref()).unwrap_or("")
            )
        };

        Ok(CompletionResponse {
            message: ChatMessage::assistant(text_reply),
            finish_reason: Some("stop".to_string()),
            usage: UsageInfo {
                prompt_tokens: 100,
                completion_tokens: 60,
                total_tokens: 160,
            },
        })
    }

    async fn complete_stream(
        &self,
        req: CompletionRequest,
        delta_tx: mpsc::Sender<StreamDelta>,
    ) -> AetherResult<CompletionResponse> {
        let full_resp = self.complete(req).await?;
        if let Some(ref text) = full_resp.message.content {
            for word in text.split_whitespace() {
                let _ = delta_tx
                    .send(StreamDelta {
                        content: Some(format!("{} ", word)),
                        tool_calls: None,
                        is_finished: false,
                    })
                    .await;
                tokio::time::sleep(tokio::time::Duration::from_millis(15)).await;
            }
        }

        let _ = delta_tx
            .send(StreamDelta {
                content: None,
                tool_calls: full_resp.message.tool_calls.clone(),
                is_finished: true,
            })
            .await;

        Ok(full_resp)
    }
}
