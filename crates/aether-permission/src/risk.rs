use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RiskLevel {
    Safe,
    Low,
    Moderate,
    High,
    Critical,
}

pub struct RiskAnalyzer {
    critical_cmd_regex: Regex,
    high_cmd_regex: Regex,
    sensitive_file_regex: Regex,
}

impl Default for RiskAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

impl RiskAnalyzer {
    pub fn new() -> Self {
        let critical_cmd_regex = Regex::new(
            r"(?i)\b(rm\s+-[rf]{1,2}|del\s+/[fq]|format\s+[a-z]:|mkfs|dd\s+if=|git\s+push\s+.*--force|git\s+reset\s+--hard|chmod\s+-R\s+777|takeown|icacls\s+.*\/grant)\b"
        ).expect("Valid critical regex");

        let high_cmd_regex = Regex::new(
            r"(?i)\b(curl\s+.*\|\s*(sh|bash|powershell|pwsh)|wget\s+.*\|\s*(sh|bash|powershell|pwsh)|Invoke-Expression|iex\b|shutdown|reboot|taskkill\s+/f|kill\s+-9|net\s+user|netsh\s+firewall)\b"
        ).expect("Valid high regex");

        let sensitive_file_regex = Regex::new(
            r"(?i)(\.env|\.ssh|id_rsa|id_ed25519|\.aws/credentials|\.git/config|id_dsa|\.gnupg|secrets?\.(json|ya?ml|toml)|passwd|shadow)$"
        ).expect("Valid sensitive file regex");

        Self {
            critical_cmd_regex,
            high_cmd_regex,
            sensitive_file_regex,
        }
    }

    pub fn evaluate_command(&self, command: &str) -> (RiskLevel, String) {
        if self.critical_cmd_regex.is_match(command) {
            return (
                RiskLevel::Critical,
                "Command contains potentially destructive or irreversible operations (e.g., force delete, disk format, force push).".to_string(),
            );
        }

        if self.high_cmd_regex.is_match(command) {
            return (
                RiskLevel::High,
                "Command executes remote script, terminates system processes, or modifies network/firewall configurations.".to_string(),
            );
        }

        if command.contains("sudo") || command.contains("runas") {
            return (
                RiskLevel::High,
                "Command requires elevated/administrator privileges.".to_string(),
            );
        }

        (RiskLevel::Low, "Standard non-destructive command.".to_string())
    }

    pub fn evaluate_file_access(&self, path: &str, is_write_or_delete: bool) -> (RiskLevel, String) {
        if self.sensitive_file_regex.is_match(path) {
            if is_write_or_delete {
                return (
                    RiskLevel::Critical,
                    format!("Attempting to modify or delete sensitive credential/configuration file: {}", path),
                );
            } else {
                return (
                    RiskLevel::High,
                    format!("Attempting to read sensitive credential/configuration file: {}", path),
                );
            }
        }

        if is_write_or_delete {
            (RiskLevel::Moderate, format!("Modifying or deleting file: {}", path))
        } else {
            (RiskLevel::Safe, format!("Reading file: {}", path))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_critical_command_detection() {
        let analyzer = RiskAnalyzer::new();
        let (risk, _) = analyzer.evaluate_command("rm -rf /");
        assert_eq!(risk, RiskLevel::Critical);

        let (risk2, _) = analyzer.evaluate_command("git push origin main --force");
        assert_eq!(risk2, RiskLevel::Critical);

        let (risk3, _) = analyzer.evaluate_command("del /f /q C:\\something");
        assert_eq!(risk3, RiskLevel::Critical);
    }

    #[test]
    fn test_sensitive_file_detection() {
        let analyzer = RiskAnalyzer::new();
        let (risk, _) = analyzer.evaluate_file_access(".env", true);
        assert_eq!(risk, RiskLevel::Critical);

        let (risk2, _) = analyzer.evaluate_file_access("src/main.rs", false);
        assert_eq!(risk2, RiskLevel::Safe);
    }
}
