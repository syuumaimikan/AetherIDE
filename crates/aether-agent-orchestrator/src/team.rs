use aether_agent_runtime::{Agent, AgentConfig, AgentRole};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineStage {
    pub name: String,
    pub role: AgentRole,
    pub instruction_template: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentTeam {
    pub name: String,
    pub description: String,
    pub stages: Vec<PipelineStage>,
}

impl AgentTeam {
    pub fn standard_dev_team() -> Self {
        Self {
            name: "Full-Cycle Autonomous Team".to_string(),
            description: "End-to-end development pipeline: Architecture -> Code -> Test -> Code Review -> Security Audit".to_string(),
            stages: vec![
                PipelineStage {
                    name: "Architect".to_string(),
                    role: AgentRole::Architect,
                    instruction_template: "Inspect requirements and project structure, then formulate a modular design plan.".to_string(),
                },
                PipelineStage {
                    name: "Coder".to_string(),
                    role: AgentRole::Coder,
                    instruction_template: "Implement the planned architecture with robust error handling and clean code.".to_string(),
                },
                PipelineStage {
                    name: "Tester".to_string(),
                    role: AgentRole::Tester,
                    instruction_template: "Write unit and integration tests to verify correctness and edge cases.".to_string(),
                },
                PipelineStage {
                    name: "Reviewer".to_string(),
                    role: AgentRole::Reviewer,
                    instruction_template: "Review code and diffs for regressions, style compliance, and maintainability.".to_string(),
                },
                PipelineStage {
                    name: "Security".to_string(),
                    role: AgentRole::SecurityAuditor,
                    instruction_template: "Audit code for security vulnerabilities, injection risks, and safe execution.".to_string(),
                },
            ],
        }
    }

    pub fn create_team_agents(&self) -> Vec<Agent> {
        self.stages
            .iter()
            .map(|stage| {
                let mut config = AgentConfig::default();
                config.name = format!("{} Agent", stage.name);
                config.role = stage.role;
                Agent::new(config)
            })
            .collect()
    }
}
