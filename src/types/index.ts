export type AppMode = 'normal' | 'agent' | 'os';

export type ActivityTab = 'explorer' | 'search' | 'git' | 'agents' | 'terminal' | 'settings';

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  children?: FileNode[];
}

export interface WorkspaceInfo {
  root_path: string;
  name: string;
}

export interface OpenFileTab {
  path: string;
  name: string;
  content: string;
  isModified: boolean;
  language: string;
}

export interface TerminalSessionInfo {
  id: string;
  title: string;
  shell: string;
  cwd: string;
}

export type GitFileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'ignored';

export interface GitChange {
  path: string;
  status: GitFileStatus;
  is_staged: boolean;
}

export interface GitRepoStatus {
  current_branch: string;
  changes: GitChange[];
  ahead: number;
  behind: number;
}

export interface GitCommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface SearchMatch {
  line_number: number;
  col_start: number;
  col_end: number;
  line_content: string;
}

export interface FileMatch {
  path: string;
  relative_path: string;
  matches: SearchMatch[];
}

export type AgentRole =
  | 'architect'
  | 'coder'
  | 'reviewer'
  | 'tester'
  | 'security_auditor'
  | 'researcher'
  | 'optimizer'
  | 'custom';

export type AgentStatus =
  | 'idle'
  | 'planning'
  | 'running'
  | 'waiting'
  | 'needs_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentConfig {
  name: string;
  role: AgentRole;
  model: string;
  system_prompt?: string;
  temperature: number;
  max_steps: number;
  allowed_tools: string[];
}

export interface Agent {
  id: { '0': string } | string;
  config: AgentConfig;
  status: AgentStatus;
  current_task?: string;
  steps_completed: number;
  total_tokens_used: number;
}

export interface AgentStepResult {
  step_index: number;
  thought?: string;
  tool_name?: string;
  tool_input?: any;
  tool_output?: any;
  is_terminal: boolean;
}

export interface OrchestratorTask {
  id: { '0': string } | string;
  title: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'queued' | 'running' | 'waiting_for_approval' | 'completed' | 'failed' | 'cancelled';
  assigned_agent?: string;
  depends_on: string[];
  created_at: string;
  completed_at?: string;
  result?: string;
}

export interface AgentDashboardMetrics {
  running_agents: number;
  queued_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  total_tokens_used: number;
  total_tool_calls: number;
}

export interface PermissionRequest {
  request_id: string;
  agent_id?: string;
  category: string;
  action: string;
  resource: string;
  risk_level: 'safe' | 'low' | 'moderate' | 'high' | 'critical';
  explanation: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  agent_id?: string;
  category: string;
  action: string;
  resource: string;
  risk_level: 'safe' | 'low' | 'moderate' | 'high' | 'critical';
  decision: string;
  reason: string;
}

export interface HostProcess {
  name: string;
  pid: number;
  session?: string;
  memory: string;
}

export interface NetworkCheckResult {
  host: string;
  port: number;
  reachable: boolean;
  latency_ms: number;
  status: string;
  error?: string;
}

export interface HttpRequestResult {
  url: string;
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  content_length: number;
}

export interface SystemStatsResult {
  os: string;
  arch: string;
  family: string;
  workspace: string;
  num_cpus: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tags?: string[];
  suggestedDiff?: {
    path: string;
    original: string;
    modified: string;
    description: string;
  };
}
