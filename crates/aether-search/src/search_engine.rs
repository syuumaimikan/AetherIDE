use aether_core::{AetherError, AetherResult};
use regex::RegexBuilder;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchOptions {
    pub query: String,
    pub is_regex: bool,
    pub case_sensitive: bool,
    pub match_whole_word: bool,
    pub max_results: usize,
}

impl Default for SearchOptions {
    fn default() -> Self {
        Self {
            query: String::new(),
            is_regex: false,
            case_sensitive: false,
            match_whole_word: false,
            max_results: 500,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMatch {
    pub line_number: usize,
    pub col_start: usize,
    pub col_end: usize,
    pub line_content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMatch {
    pub path: String,
    pub relative_path: String,
    pub matches: Vec<SearchMatch>,
}

pub struct SearchEngine {
    ignored_dirs: Vec<String>,
}

impl Default for SearchEngine {
    fn default() -> Self {
        Self {
            ignored_dirs: vec![
                ".git".to_string(),
                "node_modules".to_string(),
                "target".to_string(),
                ".aether".to_string(),
                "dist".to_string(),
            ],
        }
    }
}

impl SearchEngine {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn search_content(
        &self,
        workspace_root: &Path,
        options: &SearchOptions,
    ) -> AetherResult<Vec<FileMatch>> {
        if options.query.is_empty() {
            return Ok(Vec::new());
        }

        let pattern = if options.is_regex {
            if options.match_whole_word {
                format!(r"\b{}\b", options.query)
            } else {
                options.query.clone()
            }
        } else {
            let escaped = regex::escape(&options.query);
            if options.match_whole_word {
                format!(r"\b{}\b", escaped)
            } else {
                escaped
            }
        };

        let regex = RegexBuilder::new(&pattern)
            .case_insensitive(!options.case_sensitive)
            .build()
            .map_err(|e| AetherError::Internal(format!("Invalid search regex: {}", e)))?;

        let mut results = Vec::new();
        let mut total_matches = 0;

        for entry in WalkDir::new(workspace_root)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                !self.ignored_dirs.iter().any(|d| d == &name)
            })
            .filter_map(|e| e.ok())
        {
            if total_matches >= options.max_results {
                break;
            }

            if !entry.file_type().is_file() {
                continue;
            }

            let path = entry.path();
            // Skip binary or huge files (> 10MB)
            if let Ok(metadata) = path.metadata() {
                if metadata.len() > 10 * 1024 * 1024 {
                    continue;
                }
            }

            if let Ok(file) = File::open(path) {
                let reader = BufReader::new(file);
                let mut file_matches = Vec::new();

                for (idx, line_res) in reader.lines().enumerate() {
                    if let Ok(line) = line_res {
                        for m in regex.find_iter(&line) {
                            file_matches.push(SearchMatch {
                                line_number: idx + 1,
                                col_start: m.start(),
                                col_end: m.end(),
                                line_content: line.clone(),
                            });
                            total_matches += 1;
                            if total_matches >= options.max_results {
                                break;
                            }
                        }
                    }
                    if total_matches >= options.max_results {
                        break;
                    }
                }

                if !file_matches.is_empty() {
                    let rel_path = path
                        .strip_prefix(workspace_root)
                        .map(|p| p.to_string_lossy().replace('\\', "/"))
                        .unwrap_or_else(|_| path.to_string_lossy().replace('\\', "/"));

                    results.push(FileMatch {
                        path: path.to_string_lossy().replace('\\', "/"),
                        relative_path: rel_path,
                        matches: file_matches,
                    });
                }
            }
        }

        Ok(results)
    }

    pub fn search_files(&self, workspace_root: &Path, query: &str, limit: usize) -> Vec<String> {
        let q_lower = query.to_lowercase();
        let mut matching_paths = Vec::new();

        for entry in WalkDir::new(workspace_root)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                !self.ignored_dirs.iter().any(|d| d == &name)
            })
            .filter_map(|e| e.ok())
        {
            if matching_paths.len() >= limit {
                break;
            }
            if !entry.file_type().is_file() {
                continue;
            }

            let path = entry.path();
            let rel = path
                .strip_prefix(workspace_root)
                .map(|p| p.to_string_lossy().replace('\\', "/"))
                .unwrap_or_else(|_| path.to_string_lossy().replace('\\', "/"));

            if query.is_empty() || rel.to_lowercase().contains(&q_lower) {
                matching_paths.push(rel);
            }
        }

        matching_paths
    }
}
