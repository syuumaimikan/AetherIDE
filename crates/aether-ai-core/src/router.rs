use aether_core::{AetherError, AetherResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::mock_provider::MockModelProvider;
use crate::provider::ModelProvider;
use crate::types::{CompletionRequest, CompletionResponse};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskType {
    Coding,
    Fast,
    Reasoning,
    Offline,
    General,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelRouteRule {
    pub task_type: TaskType,
    pub provider_id: String,
    pub model_name: String,
}

#[derive(Clone)]
pub struct ModelRouter {
    providers: Arc<RwLock<HashMap<String, Arc<dyn ModelProvider>>>>,
    routes: Arc<RwLock<HashMap<TaskType, ModelRouteRule>>>,
    default_route: Arc<RwLock<ModelRouteRule>>,
}

impl Default for ModelRouter {
    fn default() -> Self {
        Self::new()
    }
}

impl ModelRouter {
    pub fn new() -> Self {
        let mut router = Self {
            providers: Arc::new(RwLock::new(HashMap::new())),
            routes: Arc::new(RwLock::new(HashMap::new())),
            default_route: Arc::new(RwLock::new(ModelRouteRule {
                task_type: TaskType::General,
                provider_id: "mock".to_string(),
                model_name: "mock-model".to_string(),
            })),
        };

        // Always register mock provider
        router.register_provider_sync(Arc::new(MockModelProvider::new()));
        router
    }

    fn register_provider_sync(&mut self, provider: Arc<dyn ModelProvider>) {
        if let Some(map) = Arc::get_mut(&mut self.providers) {
            map.get_mut().insert(provider.provider_id().to_string(), provider);
        }
    }

    pub async fn register_provider(&self, provider: Arc<dyn ModelProvider>) {
        let mut providers = self.providers.write().await;
        providers.insert(provider.provider_id().to_string(), provider);
    }

    pub async fn set_route(&self, task_type: TaskType, provider_id: &str, model_name: &str) {
        let mut routes = self.routes.write().await;
        routes.insert(
            task_type,
            ModelRouteRule {
                task_type,
                provider_id: provider_id.to_string(),
                model_name: model_name.to_string(),
            },
        );
    }

    pub async fn set_default_route(&self, provider_id: &str, model_name: &str) {
        let mut def = self.default_route.write().await;
        def.provider_id = provider_id.to_string();
        def.model_name = model_name.to_string();
    }

    pub async fn route_and_complete(
        &self,
        task_type: TaskType,
        mut req: CompletionRequest,
    ) -> AetherResult<CompletionResponse> {
        let rule = {
            let routes = self.routes.read().await;
            routes
                .get(&task_type)
                .cloned()
                .unwrap_or_else(|| {
                    futures::executor::block_on(async { self.default_route.read().await.clone() })
                })
        };

        if req.model.is_empty() {
            req.model = rule.model_name;
        }

        let provider = {
            let providers = self.providers.read().await;
            providers
                .get(&rule.provider_id)
                .cloned()
                .ok_or_else(|| AetherError::Model(format!("Provider '{}' not found", rule.provider_id)))?
        };

        provider.complete(req).await
    }

    pub async fn list_providers(&self) -> Vec<(String, String)> {
        let providers = self.providers.read().await;
        providers
            .values()
            .map(|p| (p.provider_id().to_string(), p.display_name().to_string()))
            .collect()
    }
}
