use aether_core::{AetherError, AetherResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GitFileStatus {
    Modified,
    Added,
    Deleted,
    Renamed,
    Untracked,
    Ignored,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitChange {
    pub path: String,
    pub status: GitFileStatus,
    pub is_staged: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitRepoStatus {
    pub current_branch: String,
    pub changes: Vec<GitChange>,
    pub ahead: usize,
    pub behind: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitCommitInfo {
    pub hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
}

pub struct GitManager {
    workspace_root: PathBuf,
}

impl GitManager {
    pub fn new(workspace_root: PathBuf) -> Self {
        Self { workspace_root }
    }

    async fn run_git(&self, args: &[&str]) -> AetherResult<String> {
        let output = Command::new("git")
            .args(args)
            .current_dir(&self.workspace_root)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| AetherError::Git(format!("Failed to run git command: {}", e)))?;

        if !output.status.success() {
            let err_msg = String::from_utf8_lossy(&output.stderr);
            return Err(AetherError::Git(format!("Git error: {}", err_msg.trim())));
        }

        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }

    pub async fn get_status(&self) -> AetherResult<GitRepoStatus> {
        let branch = match self.run_git(&["branch", "--show-current"]).await {
            Ok(b) if !b.is_empty() => b,
            _ => "HEAD (detached)".to_string(),
        };

        let status_output = match self.run_git(&["status", "--porcelain"]).await {
            Ok(out) => out,
            Err(_) => return Ok(GitRepoStatus {
                current_branch: branch,
                changes: Vec::new(),
                ahead: 0,
                behind: 0,
            }),
        };

        let mut changes = Vec::new();
        for line in status_output.lines() {
            if line.len() < 3 {
                continue;
            }
            let index_status = &line[0..1];
            let worktree_status = &line[1..2];
            let path = line[3..].trim().to_string();

            // Staged change
            if index_status != " " && index_status != "?" {
                let status = match index_status {
                    "M" => GitFileStatus::Modified,
                    "A" => GitFileStatus::Added,
                    "D" => GitFileStatus::Deleted,
                    "R" => GitFileStatus::Renamed,
                    _ => GitFileStatus::Modified,
                };
                changes.push(GitChange {
                    path: path.clone(),
                    status,
                    is_staged: true,
                });
            }

            // Unstaged or untracked
            if worktree_status != " " {
                let status = match worktree_status {
                    "M" => GitFileStatus::Modified,
                    "D" => GitFileStatus::Deleted,
                    "?" => GitFileStatus::Untracked,
                    _ => GitFileStatus::Modified,
                };
                changes.push(GitChange {
                    path,
                    status,
                    is_staged: false,
                });
            }
        }

        Ok(GitRepoStatus {
            current_branch: branch,
            changes,
            ahead: 0,
            behind: 0,
        })
    }

    pub async fn stage_file(&self, path: &str) -> AetherResult<()> {
        self.run_git(&["add", path]).await?;
        Ok(())
    }

    pub async fn stage_all(&self) -> AetherResult<()> {
        self.run_git(&["add", "-A"]).await?;
        Ok(())
    }

    pub async fn unstage_file(&self, path: &str) -> AetherResult<()> {
        self.run_git(&["reset", "HEAD", path]).await?;
        Ok(())
    }

    pub async fn unstage_all(&self) -> AetherResult<()> {
        self.run_git(&["reset", "HEAD"]).await?;
        Ok(())
    }

    pub async fn discard_changes(&self, path: &str) -> AetherResult<()> {
        // Try checkout first (for tracked modified files)
        if self.run_git(&["checkout", "--", path]).await.is_err() {
            // If it failed, it might be an untracked file, try clean
            let _ = self.run_git(&["clean", "-f", path]).await;
        }
        Ok(())
    }

    pub async fn commit(&self, message: &str) -> AetherResult<String> {
        self.run_git(&["commit", "-m", message]).await
    }

    pub async fn get_diff(&self, staged: bool) -> AetherResult<String> {
        if staged {
            self.run_git(&["diff", "--cached"]).await
        } else {
            self.run_git(&["diff"]).await
        }
    }

    pub async fn get_file_diff(&self, path: &str, staged: bool) -> AetherResult<String> {
        if staged {
            self.run_git(&["diff", "--cached", "--", path]).await
        } else {
            self.run_git(&["diff", "--", path]).await
        }
    }

    pub async fn get_log(&self, max_count: usize) -> AetherResult<Vec<GitCommitInfo>> {
        let max_str = max_count.to_string();
        let log_out = match self.run_git(&[
            "log",
            &format!("-n{}", max_str),
            "--pretty=format:%H|%an|%ad|%s",
            "--date=short",
        ]).await {
            Ok(out) => out,
            Err(_) => return Ok(Vec::new()),
        };

        let mut commits = Vec::new();
        for line in log_out.lines() {
            let parts: Vec<&str> = line.split('|').collect();
            if parts.len() >= 4 {
                commits.push(GitCommitInfo {
                    hash: parts[0].to_string(),
                    author: parts[1].to_string(),
                    date: parts[2].to_string(),
                    message: parts[3..].join("|"),
                });
            }
        }
        Ok(commits)
    }

    pub async fn list_branches(&self) -> AetherResult<Vec<String>> {
        let output = self.run_git(&["branch", "--list"]).await?;
        let branches = output
            .lines()
            .map(|l| l.trim_start_matches('*').trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        Ok(branches)
    }

    pub async fn checkout_branch(&self, branch_name: &str) -> AetherResult<()> {
        self.run_git(&["checkout", branch_name]).await?;
        Ok(())
    }

    pub async fn create_branch(&self, branch_name: &str) -> AetherResult<()> {
        self.run_git(&["checkout", "-b", branch_name]).await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_git_repo_lifecycle() {
        let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
        let temp_dir = std::env::temp_dir().join(format!("aether_git_test_{}", now));
        tokio::fs::create_dir_all(&temp_dir).await.unwrap();

        let init_out = tokio::process::Command::new("git")
            .args(["init"])
            .current_dir(&temp_dir)
            .output()
            .await;

        if let Ok(out) = init_out {
            if out.status.success() {
                let _ = tokio::process::Command::new("git")
                    .args(["config", "user.name", "Aether Tester"])
                    .current_dir(&temp_dir)
                    .output()
                    .await;
                let _ = tokio::process::Command::new("git")
                    .args(["config", "user.email", "tester@aetheride.internal"])
                    .current_dir(&temp_dir)
                    .output()
                    .await;

                let gm = GitManager::new(temp_dir.clone());
                tokio::fs::write(temp_dir.join("test.txt"), b"initial content").await.unwrap();

                let status = gm.get_status().await.unwrap();
                assert!(!status.changes.is_empty());

                gm.stage_all().await.unwrap();
                let commit_res = gm.commit("feat: initial test commit").await;
                assert!(commit_res.is_ok());

                let log = gm.get_log(5).await.unwrap();
                assert!(!log.is_empty());
                assert!(log[0].message.contains("initial test commit"));
            }
        }

        let _ = tokio::fs::remove_dir_all(&temp_dir).await;
    }
}
