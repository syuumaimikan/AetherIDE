use aether_core::{AetherError, AetherResult};
use async_trait::async_trait;
use futures::StreamExt;
use reqwest::Client;
use serde_json::json;
use tokio::sync::mpsc;

use crate::provider::ModelProvider;
use crate::types::{
    ChatMessage, CompletionRequest, CompletionResponse, FunctionCall, StreamDelta, ToolCall,
    UsageInfo,
};

pub struct OpenAiCompatibleProvider {
    provider_id: String,
    display_name: String,
    base_url: String,
    api_key: Option<String>,
    client: Client,
}

impl OpenAiCompatibleProvider {
    pub fn new(
        provider_id: impl Into<String>,
        display_name: impl Into<String>,
        base_url: impl Into<String>,
        api_key: Option<String>,
    ) -> Self {
        Self {
            provider_id: provider_id.into(),
            display_name: display_name.into(),
            base_url: base_url.into(),
            api_key,
            client: Client::new(),
        }
    }

    pub fn ollama(base_url: Option<String>) -> Self {
        Self::new(
            "ollama",
            "Ollama Local",
            base_url.unwrap_or_else(|| "http://localhost:11434/v1".to_string()),
            None,
        )
    }

    pub fn openai(api_key: String) -> Self {
        Self::new(
            "openai",
            "OpenAI Cloud",
            "https://api.openai.com/v1",
            Some(api_key),
        )
    }
}

#[async_trait]
impl ModelProvider for OpenAiCompatibleProvider {
    fn provider_id(&self) -> &str {
        &self.provider_id
    }

    fn display_name(&self) -> &str {
        &self.display_name
    }

    async fn complete(&self, req: CompletionRequest) -> AetherResult<CompletionResponse> {
        let endpoint = format!("{}/chat/completions", self.base_url.trim_end_matches('/'));

        let mut request_builder = self.client.post(&endpoint);
        if let Some(ref key) = self.api_key {
            request_builder = request_builder.bearer_auth(key);
        }

        let body = json!({
            "model": req.model,
            "messages": req.messages,
            "tools": req.tools,
            "temperature": req.temperature,
            "max_tokens": req.max_tokens,
            "stream": false
        });

        let response = request_builder
            .json(&body)
            .send()
            .await
            .map_err(|e| AetherError::Model(format!("Request failed to {}: {}", endpoint, e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let err_body = response.text().await.unwrap_or_default();
            return Err(AetherError::Model(format!(
                "Model API returned error {}: {}",
                status, err_body
            )));
        }

        let resp_json: serde_json::Value = response
            .json()
            .await
            .map_err(|e| AetherError::Model(format!("Invalid JSON response: {}", e)))?;

        let choice = resp_json["choices"]
            .as_array()
            .and_then(|arr| arr.first())
            .ok_or_else(|| AetherError::Model("Empty choices in response".to_string()))?;

        let msg_val = &choice["message"];
        let content = msg_val["content"].as_str().map(|s| s.to_string());

        let mut tool_calls = None;
        if let Some(tc_array) = msg_val["tool_calls"].as_array() {
            let mut calls = Vec::new();
            for tc in tc_array {
                let id = tc["id"].as_str().unwrap_or("").to_string();
                let call_type = tc["type"].as_str().unwrap_or("function").to_string();
                let fn_obj = &tc["function"];
                let name = fn_obj["name"].as_str().unwrap_or("").to_string();
                let arguments = fn_obj["arguments"].as_str().unwrap_or("{}").to_string();

                calls.push(ToolCall {
                    id,
                    call_type,
                    function: FunctionCall { name, arguments },
                });
            }
            if !calls.is_empty() {
                tool_calls = Some(calls);
            }
        }

        let finish_reason = choice["finish_reason"].as_str().map(|s| s.to_string());

        let prompt_tokens = resp_json["usage"]["prompt_tokens"].as_u64().unwrap_or(0) as usize;
        let completion_tokens = resp_json["usage"]["completion_tokens"].as_u64().unwrap_or(0) as usize;
        let total_tokens = resp_json["usage"]["total_tokens"].as_u64().unwrap_or(0) as usize;

        Ok(CompletionResponse {
            message: ChatMessage {
                role: crate::types::ChatRole::Assistant,
                content,
                tool_calls,
                tool_call_id: None,
                name: None,
            },
            finish_reason,
            usage: UsageInfo {
                prompt_tokens,
                completion_tokens,
                total_tokens,
            },
        })
    }

    async fn complete_stream(
        &self,
        req: CompletionRequest,
        delta_tx: mpsc::Sender<StreamDelta>,
    ) -> AetherResult<CompletionResponse> {
        let endpoint = format!("{}/chat/completions", self.base_url.trim_end_matches('/'));

        let mut request_builder = self.client.post(&endpoint);
        if let Some(ref key) = self.api_key {
            request_builder = request_builder.bearer_auth(key);
        }

        let body = json!({
            "model": req.model,
            "messages": req.messages,
            "tools": req.tools,
            "temperature": req.temperature,
            "max_tokens": req.max_tokens,
            "stream": true
        });

        let response = request_builder
            .json(&body)
            .send()
            .await
            .map_err(|e| AetherError::Model(format!("Request failed: {}", e)))?;

        if !response.status().is_success() {
            let status = response.status();
            let err_body = response.text().await.unwrap_or_default();
            return Err(AetherError::Model(format!("API error {}: {}", status, err_body)));
        }

        let mut stream = response.bytes_stream();
        let mut full_content = String::new();
        let mut buffer = String::new();

        while let Some(chunk_res) = stream.next().await {
            let chunk = chunk_res.map_err(|e| AetherError::Model(format!("Stream error: {}", e)))?;
            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(newline_pos) = buffer.find('\n') {
                let line = buffer[..newline_pos].trim().to_string();
                buffer.drain(..=newline_pos);

                if line.is_empty() || !line.starts_with("data: ") {
                    continue;
                }

                let payload = &line["data: ".len()..];
                if payload == "[DONE]" {
                    let _ = delta_tx
                        .send(StreamDelta {
                            content: None,
                            tool_calls: None,
                            is_finished: true,
                        })
                        .await;
                    break;
                }

                if let Ok(chunk_json) = serde_json::from_str::<serde_json::Value>(payload) {
                    if let Some(delta) = chunk_json["choices"]
                        .as_array()
                        .and_then(|a| a.first())
                        .and_then(|c| c.get("delta"))
                    {
                        if let Some(text) = delta["content"].as_str() {
                            full_content.push_str(text);
                            let _ = delta_tx
                                .send(StreamDelta {
                                    content: Some(text.to_string()),
                                    tool_calls: None,
                                    is_finished: false,
                                })
                                .await;
                        }
                    }
                }
            }
        }

        Ok(CompletionResponse {
            message: ChatMessage::assistant(full_content),
            finish_reason: Some("stop".to_string()),
            usage: UsageInfo::default(),
        })
    }
}
