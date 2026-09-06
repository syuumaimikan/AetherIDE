use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::types::{AgentId, AgentStatus, TaskId, TaskStatus};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AetherEvent {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub payload: EventPayload,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum EventPayload {
    AgentStarted {
        agent_id: AgentId,
        agent_name: String,
        role: String,
    },
    AgentStatusChanged {
        agent_id: AgentId,
        old_status: AgentStatus,
        new_status: AgentStatus,
        reason: Option<String>,
    },
    AgentStopped {
        agent_id: AgentId,
        agent_name: String,
        status: AgentStatus,
    },
    ToolCalled {
        agent_id: AgentId,
        tool_name: String,
        input: serde_json::Value,
        call_id: String,
    },
    ToolCompleted {
        agent_id: AgentId,
        tool_name: String,
        call_id: String,
        output: String,
        success: bool,
    },
    PermissionRequested {
        request_id: String,
        agent_id: AgentId,
        resource: String,
        action: String,
        details: String,
        risk_level: String,
    },
    PermissionResolved {
        request_id: String,
        allowed: bool,
        always: bool,
    },
    FileChanged {
        path: String,
        change_type: String, // "created", "modified", "deleted"
    },
    TerminalOutput {
        terminal_id: String,
        data: String,
    },
    TaskCreated {
        task_id: TaskId,
        title: String,
        assigned_to: Option<AgentId>,
    },
    TaskStatusChanged {
        task_id: TaskId,
        status: TaskStatus,
        result: Option<String>,
    },
    LogMessage {
        level: String,
        source: String,
        message: String,
    },
}

#[derive(Clone)]
pub struct EventBus {
    sender: broadcast::Sender<AetherEvent>,
}

impl EventBus {
    pub fn new(capacity: usize) -> Self {
        let (sender, _) = broadcast::channel(capacity);
        Self { sender }
    }

    pub fn publish(&self, payload: EventPayload) {
        let event = AetherEvent {
            id: Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            payload,
        };
        // It's ok if there are currently no receivers
        let _ = self.sender.send(event);
    }

    pub fn subscribe(&self) -> broadcast::Receiver<AetherEvent> {
        self.sender.subscribe()
    }
}

impl Default for EventBus {
    fn default() -> Self {
        Self::new(2048)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_event_bus_publish_subscribe() {
        let bus = EventBus::new(10);
        let mut rx = bus.subscribe();

        let agent_id = AgentId::new();
        bus.publish(EventPayload::AgentStarted {
            agent_id,
            agent_name: "Architect".to_string(),
            role: "Architecture".to_string(),
        });

        let received = rx.recv().await.expect("Failed to receive event");
        match received.payload {
            EventPayload::AgentStarted { agent_id: id, agent_name, .. } => {
                assert_eq!(id, agent_id);
                assert_eq!(agent_name, "Architect");
            }
            _ => panic!("Unexpected event payload"),
        }
    }
}
