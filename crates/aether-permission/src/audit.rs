use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::risk::RiskLevel;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: String,
    pub timestamp: DateTime<Utc>,
    pub agent_id: Option<String>,
    pub category: String,
    pub action: String,
    pub resource: String,
    pub risk_level: RiskLevel,
    pub decision: String, // "allowed_once", "allowed_always", "denied", "auto_allowed"
    pub reason: String,
}

#[derive(Clone)]
pub struct AuditLogger {
    entries: Arc<RwLock<VecDeque<AuditEntry>>>,
    max_entries: usize,
}

impl AuditLogger {
    pub fn new(max_entries: usize) -> Self {
        Self {
            entries: Arc::new(RwLock::new(VecDeque::with_capacity(max_entries))),
            max_entries,
        }
    }

    pub async fn log(
        &self,
        agent_id: Option<String>,
        category: impl Into<String>,
        action: impl Into<String>,
        resource: impl Into<String>,
        risk_level: RiskLevel,
        decision: impl Into<String>,
        reason: impl Into<String>,
    ) {
        let entry = AuditEntry {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            agent_id,
            category: category.into(),
            action: action.into(),
            resource: resource.into(),
            risk_level,
            decision: decision.into(),
            reason: reason.into(),
        };

        let mut lock = self.entries.write().await;
        if lock.len() >= self.max_entries {
            lock.pop_front();
        }
        lock.push_back(entry);
    }

    pub async fn get_recent_entries(&self, count: usize) -> Vec<AuditEntry> {
        let lock = self.entries.read().await;
        lock.iter().rev().take(count).cloned().collect()
    }

    pub async fn clear(&self) {
        let mut lock = self.entries.write().await;
        lock.clear();
    }
}

impl Default for AuditLogger {
    fn default() -> Self {
        Self::new(5000)
    }
}
