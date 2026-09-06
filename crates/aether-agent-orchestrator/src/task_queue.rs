use aether_core::{AgentId, TaskId, TaskPriority, TaskStatus};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrchestratorTask {
    pub id: TaskId,
    pub title: String,
    pub description: String,
    pub priority: TaskPriority,
    pub status: TaskStatus,
    pub assigned_agent: Option<AgentId>,
    pub depends_on: Vec<TaskId>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub result: Option<String>,
}

impl OrchestratorTask {
    pub fn new(title: impl Into<String>, description: impl Into<String>, priority: TaskPriority) -> Self {
        Self {
            id: TaskId::new(),
            title: title.into(),
            description: description.into(),
            priority,
            status: TaskStatus::Queued,
            assigned_agent: None,
            depends_on: Vec::new(),
            created_at: Utc::now(),
            completed_at: None,
            result: None,
        }
    }
}

pub struct TaskQueue {
    tasks: HashMap<TaskId, OrchestratorTask>,
}

impl Default for TaskQueue {
    fn default() -> Self {
        Self::new()
    }
}

impl TaskQueue {
    pub fn new() -> Self {
        Self {
            tasks: HashMap::new(),
        }
    }

    pub fn enqueue(&mut self, task: OrchestratorTask) -> TaskId {
        let id = task.id;
        self.tasks.insert(id, task);
        id
    }

    pub fn get_task(&self, id: &TaskId) -> Option<&OrchestratorTask> {
        self.tasks.get(id)
    }

    pub fn list_tasks(&self) -> Vec<OrchestratorTask> {
        let mut list: Vec<_> = self.tasks.values().cloned().collect();
        list.sort_by(|a, b| b.priority.cmp(&a.priority).then(a.created_at.cmp(&b.created_at)));
        list
    }

    pub fn pop_next_ready_task(&mut self) -> Option<TaskId> {
        let mut ready_tasks: Vec<_> = self
            .tasks
            .values()
            .filter(|t| t.status == TaskStatus::Queued)
            .filter(|t| {
                // Check if all dependencies are completed
                t.depends_on.iter().all(|dep_id| {
                    self.tasks
                        .get(dep_id)
                        .map(|dep| dep.status == TaskStatus::Completed)
                        .unwrap_or(false)
                })
            })
            .cloned()
            .collect();

        ready_tasks.sort_by(|a, b| b.priority.cmp(&a.priority).then(a.created_at.cmp(&b.created_at)));

        if let Some(task) = ready_tasks.first() {
            let id = task.id;
            if let Some(t) = self.tasks.get_mut(&id) {
                t.status = TaskStatus::Running;
            }
            Some(id)
        } else {
            None
        }
    }

    pub fn update_task_status(
        &mut self,
        id: &TaskId,
        status: TaskStatus,
        result: Option<String>,
    ) {
        if let Some(task) = self.tasks.get_mut(id) {
            task.status = status;
            task.result = result;
            if status == TaskStatus::Completed || status == TaskStatus::Failed || status == TaskStatus::Cancelled {
                task.completed_at = Some(Utc::now());
            }
        }
    }
}
