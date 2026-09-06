use aether_agent_orchestrator::AgentOrchestrator;
use aether_agent_runtime::AgentRuntime;
use aether_ai_core::ModelRouter;
use aether_core::EventBus;
use aether_git::GitManager;
use aether_permission::PermissionManager;
use aether_search::SearchEngine;
use aether_terminal::PtyManager;
use aether_tool_runtime::ToolRegistry;
use aether_workspace::WorkspaceManager;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct AppState {
    pub workspace: Arc<WorkspaceManager>,
    pub event_bus: EventBus,
    pub pty_manager: PtyManager,
    pub git_manager: Arc<RwLock<GitManager>>,
    pub search_engine: Arc<SearchEngine>,
    pub tool_registry: ToolRegistry,
    pub permission_manager: Arc<PermissionManager>,
    pub model_router: ModelRouter,
    pub orchestrator: Arc<AgentOrchestrator>,
}

impl AppState {
    pub fn new(initial_workspace: PathBuf) -> Self {
        let event_bus = EventBus::default();
        let permission_manager = Arc::new(PermissionManager::default());
        let tool_registry = ToolRegistry::default();
        let model_router = ModelRouter::default();
        let workspace = Arc::new(WorkspaceManager::new(initial_workspace.clone()));
        let pty_manager = PtyManager::new(event_bus.clone());
        let git_manager = Arc::new(RwLock::new(GitManager::new(initial_workspace.clone())));
        let search_engine = Arc::new(SearchEngine::default());

        let runtime = AgentRuntime::new(
            tool_registry.clone(),
            permission_manager.clone(),
            model_router.clone(),
            event_bus.clone(),
            initial_workspace,
        );

        let orchestrator = Arc::new(AgentOrchestrator::new(runtime, event_bus.clone()));

        Self {
            workspace,
            event_bus,
            pty_manager,
            git_manager,
            search_engine,
            tool_registry,
            permission_manager,
            model_router,
            orchestrator,
        }
    }
}
