use aether_core::{AgentId, AgentStatus};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AgentRole {
    Architect,
    Coder,
    Reviewer,
    Tester,
    SecurityAuditor,
    Researcher,
    Optimizer,
    Custom,
}

impl AgentRole {
    pub fn default_prompt(&self) -> &'static str {
        match self {
            AgentRole::Architect => {
                "You are the Lead Architect Agent in AETHER IDE. Your job is to analyze requirements, inspect codebase structure, design modular architectures, and formulate step-by-step implementation plans before any code is written."
            }
            AgentRole::Coder => {
                "You are the Expert Coder Agent in AETHER IDE. Your job is to write production-grade, bug-free, idiomatic code adhering strictly to the architecture specifications, handling errors, and using appropriate tools."
            }
            AgentRole::Reviewer => {
                "You are the Senior Code Reviewer Agent in AETHER IDE. Your job is to inspect git diffs and code modifications for regressions, performance issues, readability, and anti-patterns."
            }
            AgentRole::Tester => {
                "You are the QA and Test Automation Agent in AETHER IDE. Your job is to write and execute unit, integration, and property-based tests, inspect test failures, and verify fixes."
            }
            AgentRole::SecurityAuditor => {
                "You are the Security Auditor Agent in AETHER IDE. Your job is to inspect code for vulnerabilities, injection vectors, secret leaks, permission bypasses, and unsafe operations."
            }
            AgentRole::Researcher => {
                "You are the Tech Researcher Agent in AETHER IDE. Your job is to explore APIs, documentation, dependency ecosystems, and best practices to inform architecture and coding decisions."
            }
            AgentRole::Optimizer => {
                "You are the Performance Optimizer Agent in AETHER IDE. Your job is to analyze latency, memory usage, algorithmic complexity, and cache friendliness to make systems blazing fast."
            }
            AgentRole::Custom => "You are a specialized autonomous AI agent in AETHER IDE.",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub name: String,
    pub role: AgentRole,
    pub model: String,
    pub system_prompt: Option<String>,
    pub temperature: f32,
    pub max_steps: usize,
    pub allowed_tools: Vec<String>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            name: "Coder Agent".to_string(),
            role: AgentRole::Coder,
            model: "mock-model".to_string(),
            system_prompt: None,
            temperature: 0.2,
            max_steps: 10,
            allowed_tools: vec![
                "fs_read_file".to_string(),
                "fs_write_file".to_string(),
                "fs_list_dir".to_string(),
                "terminal_execute".to_string(),
                "os_system_info".to_string(),
            ],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: AgentId,
    pub config: AgentConfig,
    pub status: AgentStatus,
    pub current_task: Option<String>,
    pub steps_completed: usize,
    pub total_tokens_used: usize,
}

impl Agent {
    pub fn new(config: AgentConfig) -> Self {
        Self {
            id: AgentId::new(),
            config,
            status: AgentStatus::Idle,
            current_task: None,
            steps_completed: 0,
            total_tokens_used: 0,
        }
    }
}
