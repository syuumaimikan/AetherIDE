use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveFileContext {
    pub path: String,
    pub content: String,
    pub cursor_line: Option<usize>,
    pub selected_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectContext {
    pub workspace_name: String,
    pub active_file: Option<ActiveFileContext>,
    pub git_diff: Option<String>,
    pub git_branch: Option<String>,
    pub project_rules: Option<String>,
    pub recent_files: Vec<String>,
}

pub struct ContextBuilder {
    workspace_root: PathBuf,
}

impl ContextBuilder {
    pub fn new(workspace_root: PathBuf) -> Self {
        Self { workspace_root }
    }

    pub async fn read_project_rules(&self) -> Option<String> {
        let rules_path = self.workspace_root.join(".aether").join("rules.md");
        if rules_path.is_file() {
            tokio::fs::read_to_string(rules_path).await.ok()
        } else {
            let cursorrules = self.workspace_root.join(".cursorrules");
            if cursorrules.is_file() {
                tokio::fs::read_to_string(cursorrules).await.ok()
            } else {
                None
            }
        }
    }

    pub async fn assemble_context(
        &self,
        active_file: Option<ActiveFileContext>,
        git_diff: Option<String>,
        git_branch: Option<String>,
        recent_files: Vec<String>,
    ) -> ProjectContext {
        let workspace_name = self
            .workspace_root
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "Project".to_string());

        let project_rules = self.read_project_rules().await;

        ProjectContext {
            workspace_name,
            active_file,
            git_diff,
            git_branch,
            project_rules,
            recent_files,
        }
    }

    pub fn format_prompt_header(&self, ctx: &ProjectContext) -> String {
        let mut header = format!("### Workspace Context: {}\n", ctx.workspace_name);

        if let Some(ref branch) = ctx.git_branch {
            header.push_str(&format!("Git Branch: {}\n", branch));
        }

        if let Some(ref rules) = ctx.project_rules {
            header.push_str(&format!("\n#### Project Rules:\n{}\n", rules));
        }

        if let Some(ref af) = ctx.active_file {
            header.push_str(&format!("\n#### Active File: {}\n", af.path));
            if let Some(ref sel) = af.selected_text {
                header.push_str(&format!("Selected Code:\n```\n{}\n```\n", sel));
            }
        }

        if let Some(ref diff) = ctx.git_diff {
            if !diff.is_empty() {
                header.push_str(&format!("\n#### Uncommitted Git Changes:\n```diff\n{}\n```\n", diff));
            }
        }

        header
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_context_builder_header_formatting() {
        let builder = ContextBuilder::new(PathBuf::from("/mock/workspace"));
        let ctx = ProjectContext {
            workspace_name: "MyProject".to_string(),
            active_file: Some(ActiveFileContext {
                path: "src/main.rs".to_string(),
                content: "fn main() {}".to_string(),
                cursor_line: Some(1),
                selected_text: Some("fn main()".to_string()),
            }),
            git_diff: Some("+ added line".to_string()),
            git_branch: Some("feature/ai-agent".to_string()),
            project_rules: Some("- Strict typing\n- No unwrap()".to_string()),
            recent_files: vec!["src/main.rs".to_string()],
        };

        let header = builder.format_prompt_header(&ctx);
        assert!(header.contains("### Workspace Context: MyProject"));
        assert!(header.contains("Git Branch: feature/ai-agent"));
        assert!(header.contains("#### Project Rules:"));
        assert!(header.contains("Active File: src/main.rs"));
        assert!(header.contains("Selected Code:"));
        assert!(header.contains("Uncommitted Git Changes:"));
    }
}
