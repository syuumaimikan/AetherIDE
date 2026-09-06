import React, { useEffect, useState } from 'react';
import {
  ActivityTab,
  Agent,
  AgentDashboardMetrics,
  AgentStepResult,
  AppMode,
  FileNode,
  GitRepoStatus,
  OpenFileTab,
  OrchestratorTask,
  PermissionRequest,
  TerminalSessionInfo,
  WorkspaceInfo,
} from './types';
import { TauriBridge } from './services/tauriBridge';
import { TitleBar } from './components/TitleBar';
import { ActivityBar } from './components/ActivityBar';
import { FileExplorer } from './components/FileExplorer';
import { EditorArea } from './components/EditorArea';
import { TerminalPanel } from './components/TerminalPanel';
import { GitPanel } from './components/GitPanel';
import { SearchPanel } from './components/SearchPanel';
import { CommandCenter } from './components/CommandCenter';
import { AgentDashboard } from './components/AgentDashboard';
import { AgentGraph, PipelineStageState } from './components/AgentGraph';
import { AgentTimeline } from './components/AgentTimeline';
import { PermissionDialog } from './components/PermissionDialog';
import { SettingsModal } from './components/SettingsModal';
import { Bot, GitBranch, Shield, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  // Navigation & Mode
  const [appMode, setAppMode] = useState<AppMode>('agent');
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab>('explorer');
  const [isTerminalOpen, setIsTerminalOpen] = useState(true);
  const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Workspace & Files
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [openTabs, setOpenTabs] = useState<OpenFileTab[]>([]);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(-1);

  // Terminal
  const [terminalSessions, setTerminalSessions] = useState<TerminalSessionInfo[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  // Git
  const [gitStatus, setGitStatus] = useState<GitRepoStatus | null>(null);

  // Agents & Orchestration
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<OrchestratorTask[]>([]);
  const [metrics, setMetrics] = useState<AgentDashboardMetrics>({
    running_agents: 0,
    queued_tasks: 0,
    completed_tasks: 2,
    failed_tasks: 0,
    total_tokens_used: 9260,
    total_tool_calls: 42,
  });
  const [timelineSteps, setTimelineSteps] = useState<AgentStepResult[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStageState[]>([
    { name: 'Architect', role: 'Design', status: 'completed' },
    { name: 'Coder', role: 'Synthesis', status: 'completed' },
    { name: 'Tester', role: 'QA', status: 'completed' },
    { name: 'Reviewer', role: 'Audit', status: 'completed' },
    { name: 'Security', role: 'Hardening', status: 'completed' },
  ]);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(-1);

  // Permissions & Security
  const [pendingPermissionRequest, setPendingPermissionRequest] = useState<PermissionRequest | null>(null);
  const [providers, setProviders] = useState<[string, string][]>([]);

  // Load initial workspace state
  useEffect(() => {
    async function init() {
      try {
        const info = await TauriBridge.getWorkspaceInfo();
        setWorkspaceInfo(info);

        const tree = await TauriBridge.getFileTree();
        setFileTree(tree);

        const terms = await TauriBridge.listTerminalSessions();
        if (terms.length > 0) {
          setTerminalSessions(terms);
          setActiveSessionId(terms[0].id);
        }

        const git = await TauriBridge.getGitStatus();
        setGitStatus(git);

        const agentList = await TauriBridge.listAgents();
        setAgents(agentList);

        const taskList = await TauriBridge.listTasks();
        setTasks(taskList);

        const prov = await TauriBridge.listProviders();
        setProviders(prov);

        // Open default sample file
        handleOpenFile('/src/main.rs');
      } catch (e) {
        console.error('Initialization error:', e);
      }
    }
    init();
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandCenterOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setIsTerminalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openTabs, activeTabIndex]);

  // File Operations
  const handleOpenFile = async (path: string) => {
    const existingIndex = openTabs.findIndex((t) => t.path === path);
    if (existingIndex !== -1) {
      setActiveTabIndex(existingIndex);
      return;
    }

    try {
      const content = await TauriBridge.readFile(path);
      const name = path.split(/[\\/]/).pop() || path;
      const newTab: OpenFileTab = {
        path,
        name,
        content,
        isModified: false,
        language: path.endsWith('.rs') ? 'rust' : 'typescript',
      };
      setOpenTabs((prev) => [...prev, newTab]);
      setActiveTabIndex(openTabs.length);
    } catch (e) {
      console.error('Failed to read file:', e);
    }
  };

  const handleCloseTab = (index: number) => {
    const nextTabs = openTabs.filter((_, i) => i !== index);
    setOpenTabs(nextTabs);
    if (activeTabIndex >= nextTabs.length) {
      setActiveTabIndex(nextTabs.length - 1);
    }
  };

  const handleContentChange = (newContent: string) => {
    if (activeTabIndex < 0 || activeTabIndex >= openTabs.length) return;
    setOpenTabs((prev) => {
      const copy = [...prev];
      copy[activeTabIndex] = {
        ...copy[activeTabIndex],
        content: newContent,
        isModified: true,
      };
      return copy;
    });
  };

  const handleSaveFile = async () => {
    const tab = openTabs[activeTabIndex];
    if (!tab) return;
    try {
      await TauriBridge.writeFile(tab.path, tab.content);
      setOpenTabs((prev) => {
        const copy = [...prev];
        copy[activeTabIndex] = { ...copy[activeTabIndex], isModified: false };
        return copy;
      });
    } catch (e) {
      console.error('Failed to save file:', e);
    }
  };

  const handleAiInlineEdit = async (instruction: string) => {
    const tab = openTabs[activeTabIndex];
    if (!tab) return;
    try {
      const prompt = `Target file: ${tab.path}\nCurrent Code:\n${tab.content}\n\nInstruction: ${instruction}\nProvide clean updated code without explanations.`;
      const completion = await TauriBridge.runAiCompletion(prompt);
      handleContentChange(completion);
    } catch (e) {
      console.error('AI Edit failed:', e);
    }
  };

  // Autonomous Multi-Agent Pipeline Execution
  const handleRunAutonomousTeam = async (customGoal?: string) => {
    const goal =
      customGoal ||
      'Construct a high-performance, asynchronous multi-agent coordination pipeline in Rust with strict security audit.';

    // Reset stage status
    setPipelineStages([
      { name: 'Architect', role: 'Design', status: 'running' },
      { name: 'Coder', role: 'Synthesis', status: 'pending' },
      { name: 'Tester', role: 'QA', status: 'pending' },
      { name: 'Reviewer', role: 'Audit', status: 'pending' },
      { name: 'Security', role: 'Hardening', status: 'pending' },
    ]);
    setActiveStageIndex(0);

    try {
      const results = await TauriBridge.runTeamPipeline(goal);
      const allSteps: AgentStepResult[] = [];

      for (let i = 0; i < results.length; i++) {
        const [stageName, steps] = results[i];
        allSteps.push(...steps);

        setPipelineStages((prev) =>
          prev.map((s, idx) => {
            if (idx === i) return { ...s, status: 'completed' };
            if (idx === i + 1) return { ...s, status: 'running' };
            return s;
          })
        );
        setActiveStageIndex(i);
        setTimelineSteps([...allSteps]);
      }

      // Update metrics
      setMetrics((prev) => ({
        ...prev,
        completed_tasks: prev.completed_tasks + 1,
        total_tokens_used: prev.total_tokens_used + 1840,
        total_tool_calls: prev.total_tool_calls + 5,
      }));
    } catch (e) {
      console.error('Pipeline error:', e);
    }
  };

  // Permission Decision Handler
  const handlePermissionDecision = async (
    requestId: string,
    decision: 'allow_once' | 'allow_always' | 'deny'
  ) => {
    await TauriBridge.resolvePermissionRequest(requestId, decision);
    setPendingPermissionRequest(null);
  };

  return (
    <div className="app-container">
      {/* Title Bar */}
      <TitleBar
        appMode={appMode}
        setAppMode={setAppMode}
        openCommandCenter={() => setIsCommandCenterOpen(true)}
        toggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
        onRunAutonomousTeam={() => handleRunAutonomousTeam()}
      />

      {/* Main Workspace Layout */}
      <div className="main-layout">
        {/* Activity Bar */}
        <ActivityBar
          activeTab={activeActivityTab}
          setActiveTab={setActiveActivityTab}
          openSettings={() => setIsSettingsOpen(true)}
        />

        {/* Left Sidebars */}
        {activeActivityTab === 'explorer' && (
          <FileExplorer
            rootNode={fileTree}
            activeFilePath={openTabs[activeTabIndex]?.path}
            onSelectFile={handleOpenFile}
            onCreateFile={async (parent, name) => {
              const full = `${parent}/${name}`.replace('//', '/');
              await TauriBridge.createFile(full);
              const tree = await TauriBridge.getFileTree();
              setFileTree(tree);
              handleOpenFile(full);
            }}
            onCreateFolder={async (parent, name) => {
              const full = `${parent}/${name}`.replace('//', '/');
              await TauriBridge.createFolder(full);
              const tree = await TauriBridge.getFileTree();
              setFileTree(tree);
            }}
            onDeletePath={async (path) => {
              await TauriBridge.deletePath(path);
              const tree = await TauriBridge.getFileTree();
              setFileTree(tree);
            }}
            onRefresh={async () => {
              const tree = await TauriBridge.getFileTree();
              setFileTree(tree);
            }}
          />
        )}

        {activeActivityTab === 'git' && (
          <GitPanel
            status={gitStatus}
            onStageFile={async (path) => {
              await TauriBridge.stageFile(path);
              const s = await TauriBridge.getGitStatus();
              setGitStatus(s);
            }}
            onStageAll={async () => {
              await TauriBridge.stageAll();
              const s = await TauriBridge.getGitStatus();
              setGitStatus(s);
            }}
            onUnstageFile={async (path) => {
              await TauriBridge.unstageFile(path);
              const s = await TauriBridge.getGitStatus();
              setGitStatus(s);
            }}
            onCommit={async (msg) => {
              await TauriBridge.gitCommit(msg);
              const s = await TauriBridge.getGitStatus();
              setGitStatus(s);
            }}
            onRefresh={async () => {
              const s = await TauriBridge.getGitStatus();
              setGitStatus(s);
            }}
          />
        )}

        {activeActivityTab === 'search' && (
          <SearchPanel
            onSearch={(query, isRegex, caseSensitive) =>
              TauriBridge.searchContent(query, isRegex, caseSensitive)
            }
            onOpenFileAtLine={(path, line) => {
              handleOpenFile(path);
            }}
          />
        )}

        {/* Center Editor Area + Bottom Dock */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {appMode === 'agent' && (
            <AgentGraph
              stages={pipelineStages}
              activeStageIndex={activeStageIndex}
            />
          )}

          <EditorArea
            openTabs={openTabs}
            activeTabIndex={activeTabIndex}
            onSelectTab={setActiveTabIndex}
            onCloseTab={handleCloseTab}
            onContentChange={handleContentChange}
            onSave={handleSaveFile}
            onAiInlineEdit={handleAiInlineEdit}
          />

          {isTerminalOpen && (
            <TerminalPanel
              sessions={terminalSessions}
              activeSessionId={activeSessionId}
              onSelectSession={setActiveSessionId}
              onCreateSession={async () => {
                const session = await TauriBridge.createTerminalSession();
                setTerminalSessions((prev) => [...prev, session]);
                setActiveSessionId(session.id);
              }}
              onCloseSession={async (id) => {
                await TauriBridge.closeTerminalSession(id);
                setTerminalSessions((prev) => prev.filter((s) => s.id !== id));
              }}
              onInput={(id, data) => TauriBridge.writeTerminalInput(id, data)}
            />
          )}
        </div>

        {/* Right Panel: AI Multi-Agent Orchestrator / Timeline */}
        {(appMode === 'agent' || activeActivityTab === 'agents' || appMode === 'os') && (
          <aside className="right-panel">
            <div className="right-panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bot size={15} color="var(--accent-primary)" />
                <span>Autonomous Multi-Agent Swarm</span>
              </div>
              <span
                style={{
                  fontSize: '10px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: 'var(--accent-primary)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                5-Stage Team
              </span>
            </div>

            {appMode === 'os' ? (
              <div style={{ padding: '14px', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Shield size={16} color="var(--accent-emerald)" />
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>AI Agent OS Sandboxing</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  AI Agent OS controls the host computer safely:
                  <ul style={{ paddingLeft: '16px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li><b>Process PTY:</b> Pseudo-terminal isolation for execution.</li>
                    <li><b>Filesystem Barrier:</b> Sandboxed to workspace directory.</li>
                    <li><b>Risk Analyzer:</b> Real-time regex inspection of dangerous commands.</li>
                    <li><b>Immutable Audit:</b> In-memory & disk audit logs with cryptographic timestamps.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <>
                <AgentDashboard
                  metrics={metrics}
                  agents={agents}
                  tasks={tasks}
                  onRunTeamPipeline={(goal) => handleRunAutonomousTeam(goal)}
                  onSubmitTask={async (title, desc, prio) => {
                    await TauriBridge.submitTask(title, desc, prio);
                    const taskList = await TauriBridge.listTasks();
                    setTasks(taskList);
                  }}
                />
                <div style={{ borderTop: '1px solid var(--border-subtle)', height: '220px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Live Agent Execution Log
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    <AgentTimeline steps={timelineSteps} />
                  </div>
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      {/* Status Bar */}
      <footer className="statusbar">
        <div className="statusbar-left">
          <div className="statusbar-item">
            <span className={`status-dot ${activeStageIndex >= 0 ? 'running' : ''}`} />
            <span>{activeStageIndex >= 0 ? 'Multi-Agent Team Orchestrating' : 'Swarm Idle'}</span>
          </div>
          <div className="statusbar-item">
            <GitBranch size={11} />
            <span>{gitStatus?.current_branch || 'main'}</span>
          </div>
        </div>

        <div className="statusbar-right">
          <div className="statusbar-item">
            <span>Tokens: {metrics.total_tokens_used.toLocaleString()}</span>
          </div>
          <div className="statusbar-item">
            <span>UTF-8</span>
          </div>
          <div className="statusbar-item">
            <span>Rust / TypeScript</span>
          </div>
          <div className="statusbar-item" style={{ color: 'var(--accent-cyan)' }}>
            <span>AETHER v0.1.0</span>
          </div>
        </div>
      </footer>

      {/* Command Center Modal */}
      <CommandCenter
        isOpen={isCommandCenterOpen}
        onClose={() => setIsCommandCenterOpen(false)}
        availableFiles={['/src/main.rs', '/src/agent.rs', '/Cargo.toml', '/README.md']}
        onOpenFile={handleOpenFile}
        onRunTeamPipeline={() => handleRunAutonomousTeam()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        providers={providers}
      />

      {/* Permission Confirmation Modal */}
      <PermissionDialog
        request={pendingPermissionRequest}
        onDecision={handlePermissionDecision}
      />
    </div>
  );
};
