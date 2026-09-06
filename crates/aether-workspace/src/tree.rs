use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
    pub children: Option<Vec<FileNode>>,
}

pub struct FileTreeBuilder {
    ignored_patterns: Vec<String>,
}

impl Default for FileTreeBuilder {
    fn default() -> Self {
        Self {
            ignored_patterns: vec![
                ".git".to_string(),
                "node_modules".to_string(),
                "target".to_string(),
                ".aether".to_string(),
                "dist".to_string(),
                ".idea".to_string(),
                ".vscode".to_string(),
            ],
        }
    }
}

impl FileTreeBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_ignored(&self, name: &str) -> bool {
        self.ignored_patterns.iter().any(|p| p == name)
    }

    pub fn build_tree(&self, root_dir: &Path, max_depth: usize) -> Result<FileNode, std::io::Error> {
        let root_name = root_dir
            .file_name()
            .map(|s| s.to_string_lossy().into_owned())
            .unwrap_or_else(|| "workspace".to_string());

        let mut root_node = FileNode {
            name: root_name,
            path: root_dir.to_string_lossy().replace('\\', "/"),
            is_dir: true,
            size: None,
            children: Some(Vec::new()),
        };

        self.populate_children(root_dir, &mut root_node, 1, max_depth)?;
        Ok(root_node)
    }

    fn populate_children(
        &self,
        current_dir: &Path,
        current_node: &mut FileNode,
        current_depth: usize,
        max_depth: usize,
    ) -> Result<(), std::io::Error> {
        if current_depth > max_depth {
            return Ok(());
        }

        let mut entries = match std::fs::read_dir(current_dir) {
            Ok(rd) => rd.filter_map(|e| e.ok()).collect::<Vec<_>>(),
            Err(_) => return Ok(()),
        };

        // Sort: directories first, then alphabetical
        entries.sort_by(|a, b| {
            let a_is_dir = a.file_type().map(|t| t.is_dir()).unwrap_or(false);
            let b_is_dir = b.file_type().map(|t| t.is_dir()).unwrap_or(false);
            if a_is_dir != b_is_dir {
                b_is_dir.cmp(&a_is_dir)
            } else {
                a.file_name().cmp(&b.file_name())
            }
        });

        let mut children = Vec::new();

        for entry in entries {
            let file_name = entry.file_name().to_string_lossy().into_owned();
            if self.is_ignored(&file_name) {
                continue;
            }

            let path = entry.path();
            let file_type = entry.file_type().ok();
            let is_dir = file_type.map(|t| t.is_dir()).unwrap_or(false);
            let size = if is_dir {
                None
            } else {
                entry.metadata().ok().map(|m| m.len())
            };

            let mut child_node = FileNode {
                name: file_name,
                path: path.to_string_lossy().replace('\\', "/"),
                is_dir,
                size,
                children: if is_dir { Some(Vec::new()) } else { None },
            };

            if is_dir && current_depth < max_depth {
                let _ = self.populate_children(&path, &mut child_node, current_depth + 1, max_depth);
            }

            children.push(child_node);
        }

        current_node.children = Some(children);
        Ok(())
    }
}
