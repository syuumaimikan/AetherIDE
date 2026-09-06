use aether_core::{AetherError, AetherResult};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::tree::{FileNode, FileTreeBuilder};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceInfo {
    pub root_path: String,
    pub name: String,
}

pub struct WorkspaceManager {
    current_root: Arc<RwLock<PathBuf>>,
    tree_builder: FileTreeBuilder,
}

impl WorkspaceManager {
    pub fn new(initial_root: PathBuf) -> Self {
        Self {
            current_root: Arc::new(RwLock::new(initial_root)),
            tree_builder: FileTreeBuilder::new(),
        }
    }

    pub async fn get_root(&self) -> PathBuf {
        self.current_root.read().await.clone()
    }

    pub async fn set_root(&self, new_root: PathBuf) {
        let mut root = self.current_root.write().await;
        *root = new_root;
    }

    pub async fn get_info(&self) -> WorkspaceInfo {
        let root = self.current_root.read().await;
        let name = root
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| "Workspace".to_string());
        WorkspaceInfo {
            root_path: root.to_string_lossy().replace('\\', "/"),
            name,
        }
    }

    pub async fn get_file_tree(&self, max_depth: usize) -> AetherResult<FileNode> {
        let root = self.current_root.read().await;
        self.tree_builder
            .build_tree(&root, max_depth)
            .map_err(|e| AetherError::Workspace(format!("Failed to build file tree: {}", e)))
    }

    pub async fn read_file(&self, path: &str) -> AetherResult<String> {
        let root = self.current_root.read().await;
        let target = self.resolve_path(&root, path);
        tokio::fs::read_to_string(&target).await.map_err(|e| {
            AetherError::File(format!("Failed to read file {}: {}", target.display(), e))
        })
    }

    pub async fn write_file(&self, path: &str, content: &str) -> AetherResult<()> {
        let root = self.current_root.read().await;
        let target = self.resolve_path(&root, path);
        if let Some(parent) = target.parent() {
            let _ = tokio::fs::create_dir_all(parent).await;
        }
        tokio::fs::write(&target, content.as_bytes())
            .await
            .map_err(|e| AetherError::File(format!("Failed to write file {}: {}", target.display(), e)))
    }

    pub async fn create_file(&self, path: &str) -> AetherResult<()> {
        let root = self.current_root.read().await;
        let target = self.resolve_path(&root, path);
        if let Some(parent) = target.parent() {
            let _ = tokio::fs::create_dir_all(parent).await;
        }
        tokio::fs::write(&target, b"")
            .await
            .map_err(|e| AetherError::File(format!("Failed to create file {}: {}", target.display(), e)))
    }

    pub async fn create_folder(&self, path: &str) -> AetherResult<()> {
        let root = self.current_root.read().await;
        let target = self.resolve_path(&root, path);
        tokio::fs::create_dir_all(&target)
            .await
            .map_err(|e| AetherError::File(format!("Failed to create directory {}: {}", target.display(), e)))
    }

    pub async fn delete(&self, path: &str) -> AetherResult<()> {
        let root = self.current_root.read().await;
        let target = self.resolve_path(&root, path);
        if target.is_dir() {
            tokio::fs::remove_dir_all(&target)
                .await
                .map_err(|e| AetherError::File(format!("Failed to delete directory: {}", e)))
        } else {
            tokio::fs::remove_file(&target)
                .await
                .map_err(|e| AetherError::File(format!("Failed to delete file: {}", e)))
        }
    }

    pub async fn rename(&self, old_path: &str, new_path: &str) -> AetherResult<()> {
        let root = self.current_root.read().await;
        let from = self.resolve_path(&root, old_path);
        let to = self.resolve_path(&root, new_path);
        tokio::fs::rename(&from, &to)
            .await
            .map_err(|e| AetherError::File(format!("Failed to rename {} to {}: {}", from.display(), to.display(), e)))
    }

    fn resolve_path(&self, root: &Path, rel_or_abs: &str) -> PathBuf {
        let p = Path::new(rel_or_abs);
        if p.is_absolute() {
            p.to_path_buf()
        } else {
            root.join(p)
        }
    }
}
