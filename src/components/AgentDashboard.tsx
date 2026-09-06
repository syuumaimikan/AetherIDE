import React, { useState } from 'react';
import {
  Agent,
  AgentDashboardMetrics,
  OrchestratorTask,
} from '../types';
import {
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Play,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AgentDashboardProps {
  metrics: AgentDashboardMetrics;
  agents: Agent[];
  tasks: OrchestratorTask[];
  onRunTeamPipeline: (goal: string) => void;
  onSubmitTask: (title: string, description: string, priority: string) => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  metrics,
  agents,
  tasks,
  onRunTeamPipeline,
  onSubmitTask,
}) => {
  const [pipelineGoal, setPipelineGoal] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);

  const handlePipelineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pipelineGoal.trim()) return;
    setIsDispatching(true);
    onRunTeamPipeline(pipelineGoal.trim());
    setPipelineGoal('');
    setTimeout(() => setIsDispatching(false), 800);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'architect':
        return 'var(--accent-secondary)';
      case 'coder':
        return 'var(--accent-primary)';
      case 'tester':
        return 'var(--accent-cyan)';
      case 'reviewer':
        return 'var(--accent-emerald)';
      case 'security_auditor':
        return 'var(--accent-rose)';
      default:
        return 'var(--accent-amber)';
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: 'var(--bg-app)' }}>
      {/* Live Metrics Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '16px' }}>
        <div className="metric-card">
          <div className="metric-label">
            <Bot size={12} style={{ display: 'inline', marginRight: 4 }} />
            Active Swarm
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-cyan)' }}>
            {agents.length} Agents
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
            Tasks Completed
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-emerald)' }}>
            {metrics.completed_tasks}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            <Zap size={12} style={{ display: 'inline', marginRight: 4 }} />
            Tool Executions
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-primary)' }}>
            {metrics.total_tool_calls}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">
            <Cpu size={12} style={{ display: 'inline', marginRight: 4 }} />
            Tokens Consumed
          </div>
          <div className="metric-value" style={{ color: 'var(--accent-amber)' }}>
            {metrics.total_tokens_used.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Autonomous Multi-Agent Team Dispatcher */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-muted)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Sparkles size={16} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '14px', fontWeight: 600 }}>
            Dispatch 5-Stage Autonomous Agent Pipeline
          </h3>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          Assign an end-to-end engineering goal. The system will coordinate <b>Architect</b> (design & planning) → <b>Coder</b> (implementation) → <b>Tester</b> (verification) → <b>Reviewer</b> (diff audit) → <b>Security</b> (vulnerability check).
        </p>

        <form onSubmit={handlePipelineSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="input-text"
            style={{ flex: 1 }}
            placeholder="e.g. Build an asynchronous rate limiter with sliding window counter in Rust..."
            value={pipelineGoal}
            onChange={(e) => setPipelineGoal(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={isDispatching}>
            <Play size={13} />
            <span>{isDispatching ? 'Orchestrating...' : 'Launch Pipeline'}</span>
          </button>
        </form>
      </div>

      {/* Active Agent Swarm Cards */}
      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
        Registered Autonomous Agents
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {agents.map((agent) => {
          const idStr = typeof agent.id === 'string' ? agent.id : agent.id['0'];
          return (
            <div
              key={idStr}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '13px' }}>{agent.config.name}</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: getRoleBadgeColor(agent.config.role),
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  {agent.config.role}
                </span>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Model: <span style={{ color: 'var(--text-secondary)' }}>{agent.config.model}</span> | Steps: {agent.steps_completed}
              </div>

              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {agent.config.allowed_tools.map((tool) => (
                  <span
                    key={tool}
                    style={{
                      fontSize: '10px',
                      background: 'var(--bg-app)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 3,
                      padding: '1px 5px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Queue Timeline */}
      <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
        Orchestration Task Queue
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tasks.map((task) => {
          const idStr = typeof task.id === 'string' ? task.id : task.id['0'];
          return (
            <div
              key={idStr}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontWeight: 500, fontSize: '12px' }}>{task.title}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{task.description}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    padding: '2px 6px',
                    borderRadius: 4,
                    background:
                      task.status === 'completed'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(99, 102, 241, 0.15)',
                    color:
                      task.status === 'completed'
                        ? 'var(--accent-emerald)'
                        : 'var(--accent-primary)',
                  }}
                >
                  {task.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
