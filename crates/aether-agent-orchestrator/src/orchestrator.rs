use aether_agent_runtime::{Agent, AgentRuntime, AgentStepResult};
use aether_core::{AetherResult, AgentId, AgentStatus, CancellationToken, EventBus, TaskPriority, TaskStatus};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};

use crate::task_queue::{OrchestratorTask, TaskQueue};
use crate::team::AgentTeam;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AgentDashboardMetrics {
    pub running_agents: usize,
    pub queued_tasks: usize,
    pub completed_tasks: usize,
    pub failed_tasks: usize,
    pub total_tokens_used: usize,
    pub total_tool_calls: usize,
}

#[derive(Clone)]
pub struct AgentOrchestrator {
    agents: Arc<RwLock<HashMap<AgentId, Agent>>>,
    task_queue: Arc<Mutex<TaskQueue>>,
    runtime: AgentRuntime,
    _event_bus: EventBus,
    total_tool_calls: Arc<RwLock<usize>>,
}

impl AgentOrchestrator {
    pub fn new(runtime: AgentRuntime, event_bus: EventBus) -> Self {
        Self {
            agents: Arc::new(RwLock::new(HashMap::new())),
            task_queue: Arc::new(Mutex::new(TaskQueue::new())),
            runtime,
            _event_bus: event_bus,
            total_tool_calls: Arc::new(RwLock::new(0)),
        }
    }

    pub async fn register_agent(&self, agent: Agent) -> AgentId {
        let id = agent.id;
        let mut agents = self.agents.write().await;
        agents.insert(id, agent);
        id
    }

    pub async fn list_agents(&self) -> Vec<Agent> {
        let agents = self.agents.read().await;
        agents.values().cloned().collect()
    }

    pub async fn get_agent(&self, id: &AgentId) -> Option<Agent> {
        let agents = self.agents.read().await;
        agents.get(id).cloned()
    }

    pub async fn submit_task(
        &self,
        title: &str,
        description: &str,
        priority: TaskPriority,
    ) -> aether_core::TaskId {
        let task = OrchestratorTask::new(title, description, priority);
        let mut q = self.task_queue.lock().await;
        q.enqueue(task)
    }

    pub async fn list_tasks(&self) -> Vec<OrchestratorTask> {
        let q = self.task_queue.lock().await;
        q.list_tasks()
    }

    pub async fn get_metrics(&self) -> AgentDashboardMetrics {
        let agents = self.agents.read().await;
        let running_agents = agents
            .values()
            .filter(|a| a.status == AgentStatus::Running)
            .count();
        let total_tokens_used: usize = agents.values().map(|a| a.total_tokens_used).sum();

        let q = self.task_queue.lock().await;
        let tasks = q.list_tasks();
        let queued_tasks = tasks.iter().filter(|t| t.status == TaskStatus::Queued).count();
        let completed_tasks = tasks
            .iter()
            .filter(|t| t.status == TaskStatus::Completed)
            .count();
        let failed_tasks = tasks.iter().filter(|t| t.status == TaskStatus::Failed).count();

        let tool_calls = *self.total_tool_calls.read().await;

        AgentDashboardMetrics {
            running_agents,
            queued_tasks,
            completed_tasks,
            failed_tasks,
            total_tokens_used,
            total_tool_calls: tool_calls,
        }
    }

    pub async fn run_agent_task(
        &self,
        agent_id: &AgentId,
        task_prompt: &str,
    ) -> AetherResult<Vec<AgentStepResult>> {
        let mut agent = {
            let agents = self.agents.read().await;
            agents
                .get(agent_id)
                .cloned()
                .ok_or_else(|| aether_core::AetherError::Agent(format!("Agent {} not found", agent_id)))?
        };

        let token = CancellationToken::new();
        let results = self.runtime.run_agent(&mut agent, task_prompt, token).await;

        // Update stored agent state
        {
            let mut agents = self.agents.write().await;
            agents.insert(*agent_id, agent);
        }

        if let Ok(ref steps) = results {
            let tool_count = steps.iter().filter(|s| s.tool_name.is_some()).count();
            let mut tc = self.total_tool_calls.write().await;
            *tc += tool_count;
        }

        results
    }

    pub async fn run_team_pipeline(
        &self,
        team: &AgentTeam,
        goal: &str,
    ) -> AetherResult<Vec<(String, Vec<AgentStepResult>)>> {
        let agents = team.create_team_agents();
        let mut pipeline_outputs = Vec::new();
        let mut previous_stage_output = format!("Goal: {}", goal);

        for (stage, agent) in team.stages.iter().zip(agents.into_iter()) {
            let agent_id = self.register_agent(agent.clone()).await;

            let stage_prompt = format!(
                "Stage: {}\nInstruction: {}\nInput Context:\n{}\n\nPlease produce your deliverables for this stage.",
                stage.name, stage.instruction_template, previous_stage_output
            );

            let steps = self.run_agent_task(&agent_id, &stage_prompt).await?;

            // Extract last thought or output as context for next stage
            let last_output = steps
                .iter()
                .rev()
                .find_map(|s| s.thought.clone())
                .unwrap_or_else(|| "Stage completed".to_string());

            previous_stage_output = last_output;
            pipeline_outputs.push((stage.name.clone(), steps));
        }

        Ok(pipeline_outputs)
    }
}
