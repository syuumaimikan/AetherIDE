use aether_core::AetherResult;
use async_trait::async_trait;
use tokio::sync::mpsc;

use crate::types::{CompletionRequest, CompletionResponse, StreamDelta};

#[async_trait]
pub trait ModelProvider: Send + Sync {
    fn provider_id(&self) -> &str;
    fn display_name(&self) -> &str;

    async fn complete(&self, req: CompletionRequest) -> AetherResult<CompletionResponse>;

    async fn complete_stream(
        &self,
        req: CompletionRequest,
        delta_tx: mpsc::Sender<StreamDelta>,
    ) -> AetherResult<CompletionResponse>;
}
