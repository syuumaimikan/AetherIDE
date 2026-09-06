use aether_core::{AetherError, AetherResult};
use regex::RegexBuilder;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchOptions {
    pub query: String,
    pub is_regex: bool,
    pub case_sensitive: bool,
    pub match_whole_word: bool,
    pub include_pattern: Option<String>,
    pub exclude_pattern: Option<String>,
    pub max_results: usize,
}

impl Default for SearchOptions {
    fn default() -> Self {
        Self {
            query: String::new(),
            is_regex: false,
            case_sensitive: false,
            match_whole_word: false,
            include_pattern: None,
            exclude_pattern: None,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReplaceSummary {
    pub files_modified: usize,
    pub matches_replaced: usize,
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

    fn matches_pattern(rel_path: &str, pattern: &str) -> bool {
        let pattern = pattern.trim();
        if pattern.is_empty() {
            return true;
        }

        // Handle multiple patterns separated by comma or semicolon
        let parts: Vec<&str> = pattern.split([',', ';']).map(|s| s.trim()).filter(|s| !s.is_empty()).collect();
        if parts.is_empty() {
            return true;
        }

        let rel_lower = rel_path.to_lowercase().replace('\\', "/");
        parts.iter().any(|&p| {
            let p_lower = p.to_lowercase().replace('\\', "/");
            if let Some(ext) = p_lower.strip_prefix("*.") {
                rel_lower.ends_with(&format!(".{}", ext))
            } else if let Some(prefix) = p_lower.strip_suffix("/*") {
                rel_lower.starts_with(prefix) || rel_lower.contains(&format!("{}/", prefix))
            } else if let Some(prefix) = p_lower.strip_suffix("/**") {
                rel_lower.starts_with(prefix) || rel_lower.contains(&format!("{}/", prefix))
            } else if p_lower.starts_with('*') && p_lower.len() > 1 {
                rel_lower.ends_with(&p_lower[1..])
            } else {
                rel_lower.contains(&p_lower)
            }
        })
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

            let rel_path = path
                .strip_prefix(workspace_root)
                .map(|p| p.to_string_lossy().replace('\\', "/"))
                .unwrap_or_else(|_| path.to_string_lossy().replace('\\', "/"));

            // Check include pattern filter
            if let Some(ref inc) = options.include_pattern {
                if !inc.trim().is_empty() && !Self::matches_pattern(&rel_path, inc) {
                    continue;
                }
            }

            // Check exclude pattern filter
            if let Some(ref exc) = options.exclude_pattern {
                if !exc.trim().is_empty() && Self::matches_pattern(&rel_path, exc) {
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

    pub fn replace_content(
        &self,
        workspace_root: &Path,
        options: &SearchOptions,
        replacement: &str,
    ) -> AetherResult<ReplaceSummary> {
        let matches = self.search_content(workspace_root, options)?;
        if matches.is_empty() {
            return Ok(ReplaceSummary {
                files_modified: 0,
                matches_replaced: 0,
            });
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

        let mut files_modified = 0;
        let mut matches_replaced = 0;

        for file_match in matches {
            let file_path = Path::new(&file_match.path);
            if let Ok(content) = fs::read_to_string(file_path) {
                let replaced = regex.replace_all(&content, replacement);
                if replaced != content {
                    let count = regex.find_iter(&content).count();
                    if fs::write(file_path, replaced.as_bytes()).is_ok() {
                        files_modified += 1;
                        matches_replaced += count;
                    }
                }
            }
        }

        Ok(ReplaceSummary {
            files_modified,
            matches_replaced,
        })
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_search_and_pattern_filtering() {
        let dir = tempdir().unwrap();
        let dir_path = dir.path();

        let file1 = dir_path.join("main.rs");
        let file2 = dir_path.join("script.ts");
        let file3 = dir_path.join("style.css");

        fs::write(&file1, "fn main() {\n    println!(\"Hello Aether\");\n}\n").unwrap();
        fs::write(&file2, "const msg = 'Hello Aether from TS';\n").unwrap();
        fs::write(&file3, "body { color: red; }\n").unwrap();

        let engine = SearchEngine::new();

        // 1. Search without filter
        let opts = SearchOptions {
            query: "Aether".to_string(),
            ..Default::default()
        };
        let res = engine.search_content(dir_path, &opts).unwrap();
        assert_eq!(res.len(), 2);

        // 2. Search with include filter *.rs
        let opts_rs = SearchOptions {
            query: "Aether".to_string(),
            include_pattern: Some("*.rs".to_string()),
            ..Default::default()
        };
        let res_rs = engine.search_content(dir_path, &opts_rs).unwrap();
        assert_eq!(res_rs.len(), 1);
        assert!(res_rs[0].relative_path.ends_with("main.rs"));

        // 3. Search with exclude filter *.ts
        let opts_exclude = SearchOptions {
            query: "Aether".to_string(),
            exclude_pattern: Some("*.ts".to_string()),
            ..Default::default()
        };
        let res_exclude = engine.search_content(dir_path, &opts_exclude).unwrap();
        assert_eq!(res_exclude.len(), 1);
        assert!(res_exclude[0].relative_path.ends_with("main.rs"));
    }

    #[test]
    fn test_replace_content() {
        let dir = tempdir().unwrap();
        let dir_path = dir.path();

        let file1 = dir_path.join("sample.txt");
        fs::write(&file1, "foo bar foo baz\nfoo 123\n").unwrap();

        let engine = SearchEngine::new();
        let opts = SearchOptions {
            query: "foo".to_string(),
            ..Default::default()
        };

        let summary = engine.replace_content(dir_path, &opts, "qux").unwrap();
        assert_eq!(summary.files_modified, 1);
        assert_eq!(summary.matches_replaced, 3);

        let new_content = fs::read_to_string(&file1).unwrap();
        assert_eq!(new_content, "qux bar qux baz\nqux 123\n");
    }
}

