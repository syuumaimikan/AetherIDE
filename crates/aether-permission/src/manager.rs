use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{oneshot, Mutex, RwLock};
use uuid::Uuid;

use crate::audit::AuditLogger;
use crate::risk::{RiskAnalyzer, RiskLevel};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PermissionCategory {
    FilesystemRead,
    FilesystemWrite,
    FilesystemDelete,
    TerminalExecute,
    TerminalAdmin,
    GitRead,
    GitCommit,
    GitPush,
    GitForcePush,
    OsApplication,
    Network,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PermissionPolicy {
    Ask,
    AllowAlways,
    Deny,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionRequest {
    pub request_id: String,
    pub agent_id: Option<String>,
    pub category: PermissionCategory,
    pub action: String,
    pub resource: String,
    pub risk_level: RiskLevel,
    pub explanation: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PermissionDecision {
    AllowOnce,
    AllowAlways,
    Deny,
}

pub struct PermissionManager {
    policies: Arc<RwLock<HashMap<PermissionCategory, PermissionPolicy>>>,
    allowed_resources: Arc<RwLock<HashMap<(PermissionCategory, String), bool>>>,
    pending_requests: Arc<Mutex<HashMap<String, oneshot::Sender<PermissionDecision>>>>,
    risk_analyzer: RiskAnalyzer,
    audit_logger: AuditLogger,
}

impl Default for PermissionManager {
    fn default() -> Self {
        Self::new(AuditLogger::default())
    }
}

impl PermissionManager {
    pub fn new(audit_logger: AuditLogger) -> Self {
        let mut default_policies = HashMap::new();
        // Safe operations default to AllowAlways
        default_policies.insert(PermissionCategory::FilesystemRead, PermissionPolicy::AllowAlways);
        default_policies.insert(PermissionCategory::GitRead, PermissionPolicy::AllowAlways);
        // Moderate operations default to Ask
        default_policies.insert(PermissionCategory::FilesystemWrite, PermissionPolicy::Ask);
        default_policies.insert(PermissionCategory::FilesystemDelete, PermissionPolicy::Ask);
        default_policies.insert(PermissionCategory::TerminalExecute, PermissionPolicy::Ask);
        default_policies.insert(PermissionCategory::GitCommit, PermissionPolicy::Ask);
        // Dangerous operations default to Ask or Deny
        default_policies.insert(PermissionCategory::TerminalAdmin, PermissionPolicy::Ask);
        default_policies.insert(PermissionCategory::GitPush, PermissionPolicy::Ask);
        default_policies.insert(PermissionCategory::GitForcePush, PermissionPolicy::Ask);
        default_policies.insert(PermissionCategory::OsApplication, PermissionPolicy::Ask);
        default_policies.insert(PermissionCategory::Network, PermissionPolicy::Ask);

        Self {
            policies: Arc::new(RwLock::new(default_policies)),
            allowed_resources: Arc::new(RwLock::new(HashMap::new())),
            pending_requests: Arc::new(Mutex::new(HashMap::new())),
            risk_analyzer: RiskAnalyzer::new(),
            audit_logger,
        }
    }

    pub fn audit_logger(&self) -> &AuditLogger {
        &self.audit_logger
    }

    pub fn risk_analyzer(&self) -> &RiskAnalyzer {
        &self.risk_analyzer
    }

    pub async fn set_category_policy(&self, category: PermissionCategory, policy: PermissionPolicy) {
        let mut policies = self.policies.write().await;
        policies.insert(category, policy);
    }

    pub async fn check_permission(
        &self,
        agent_id: Option<String>,
        category: PermissionCategory,
        action: &str,
        resource: &str,
        ask_callback: Option<tokio::sync::mpsc::Sender<PermissionRequest>>,
    ) -> Result<bool, aether_core::AetherError> {
        // 1. Evaluate risk
        let (risk_level, risk_desc) = match category {
            PermissionCategory::TerminalExecute | PermissionCategory::TerminalAdmin => {
                self.risk_analyzer.evaluate_command(resource)
            }
            PermissionCategory::FilesystemRead => {
                self.risk_analyzer.evaluate_file_access(resource, false)
            }
            PermissionCategory::FilesystemWrite | PermissionCategory::FilesystemDelete => {
                self.risk_analyzer.evaluate_file_access(resource, true)
            }
            PermissionCategory::GitForcePush => {
                (RiskLevel::Critical, "Git force push can overwrite remote history!".to_string())
            }
            _ => (RiskLevel::Low, "Standard operation".to_string()),
        };

        // 2. Check specific resource whitelist
        {
            let whitelist = self.allowed_resources.read().await;
            if let Some(&allowed) = whitelist.get(&(category, resource.to_string())) {
                if allowed && risk_level < RiskLevel::Critical {
                    self.audit_logger
                        .log(
                            agent_id,
                            format!("{:?}", category),
                            action,
                            resource,
                            risk_level,
                            "auto_allowed_whitelist",
                            "Resource previously granted AllowAlways",
                        )
                        .await;
                    return Ok(true);
                }
            }
        }

        // 3. Check general category policy (unless Critical)
        let policy = {
            let policies = self.policies.read().await;
            policies.get(&category).copied().unwrap_or(PermissionPolicy::Ask)
        };

        if policy == PermissionPolicy::Deny {
            self.audit_logger
                .log(
                    agent_id,
                    format!("{:?}", category),
                    action,
                    resource,
                    risk_level,
                    "denied",
                    "Category policy set to Deny",
                )
                .await;
            return Ok(false);
        }

        if policy == PermissionPolicy::AllowAlways && risk_level < RiskLevel::High {
            self.audit_logger
                .log(
                    agent_id,
                    format!("{:?}", category),
                    action,
                    resource,
                    risk_level,
                    "auto_allowed_policy",
                    "Category policy set to AllowAlways",
                )
                .await;
            return Ok(true);
        }

        // 4. Need user approval!
        let request_id = Uuid::new_v4().to_string();
        let request = PermissionRequest {
            request_id: request_id.clone(),
            agent_id: agent_id.clone(),
            category,
            action: action.to_string(),
            resource: resource.to_string(),
            risk_level,
            explanation: risk_desc,
        };

        let (tx, rx) = oneshot::channel();
        {
            let mut pending = self.pending_requests.lock().await;
            pending.insert(request_id.clone(), tx);
        }

        if let Some(cb) = ask_callback {
            let _ = cb.send(request).await;
        } else {
            // If no callback is wired, but safe or low, we can permit in headless/simulation if not critical
            if risk_level <= RiskLevel::Low {
                return Ok(true);
            }
            return Err(aether_core::AetherError::PermissionDenied(format!(
                "Permission confirmation required for {} on {} ({:?})",
                action, resource, risk_level
            )));
        }

        // Wait for user response
        match rx.await {
            Ok(decision) => match decision {
                PermissionDecision::AllowOnce => {
                    self.audit_logger
                        .log(agent_id, format!("{:?}", category), action, resource, risk_level, "allowed_once", "Approved by user")
                        .await;
                    Ok(true)
                }
                PermissionDecision::AllowAlways => {
                    {
                        let mut whitelist = self.allowed_resources.write().await;
                        whitelist.insert((category, resource.to_string()), true);
                    }
                    self.audit_logger
                        .log(agent_id, format!("{:?}", category), action, resource, risk_level, "allowed_always", "Approved by user (always)")
                        .await;
                    Ok(true)
                }
                PermissionDecision::Deny => {
                    self.audit_logger
                        .log(agent_id, format!("{:?}", category), action, resource, risk_level, "denied", "Denied by user")
                        .await;
                    Ok(false)
                }
            },
            Err(_) => {
                self.audit_logger
                    .log(agent_id, format!("{:?}", category), action, resource, risk_level, "denied_cancelled", "Permission request cancelled or timed out")
                    .await;
                Ok(false)
            }
        }
    }

    pub async fn resolve_request(&self, request_id: &str, decision: PermissionDecision) -> bool {
        let mut pending = self.pending_requests.lock().await;
        if let Some(sender) = pending.remove(request_id) {
            sender.send(decision).is_ok()
        } else {
            false
        }
    }
}
