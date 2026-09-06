use thiserror::Error;

#[derive(Error, Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum AetherError {
    #[error("Workspace error: {0}")]
    Workspace(String),

    #[error("File error: {0}")]
    File(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Tool error: {0}")]
    Tool(String),

    #[error("Agent error: {0}")]
    Agent(String),

    #[error("AI Model error: {0}")]
    Model(String),

    #[error("Terminal error: {0}")]
    Terminal(String),

    #[error("Git error: {0}")]
    Git(String),

    #[error("Task cancelled: {0}")]
    Cancelled(String),

    #[error("Internal system error: {0}")]
    Internal(String),
}

pub type AetherResult<T> = Result<T, AetherError>;
