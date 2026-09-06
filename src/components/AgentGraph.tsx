import React from 'react';
import { Bot, Check, Clock, Cpu, ShieldCheck } from 'lucide-react';

export interface PipelineStageState {
  name: string;
  role: string;
  status: 'pending' | 'running' | 'completed';
  summary?: string;
}

interface AgentGraphProps {
  stages: PipelineStageState[];
  activeStageIndex: number;
  onSelectStage?: (index: number) => void;
}

export const AgentGraph: React.FC<AgentGraphProps> = ({
  stages,
  activeStageIndex,
  onSelectStage,
}) => {
  return (
    <div className="agent-graph-container" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          Autonomous Pipeline Graph
        </span>
        <span style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>
          DAG Orchestrator Active
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flex: 1,
          position: 'relative',
          padding: '0 20px',
        }}
      >
        {/* Connecting line */}
        <div
          style={{
            position: 'absolute',
            left: '40px',
            right: '40px',
            top: '50%',
            height: '2px',
            background: 'linear-gradient(90deg, #6366f1, #06b6d4, #10b981)',
            zIndex: 1,
            transform: 'translateY(-50%)',
          }}
        />

        {stages.map((stage, idx) => {
          const isCompleted = stage.status === 'completed';
          const isRunning = stage.status === 'running' || idx === activeStageIndex;

          return (
            <div
              key={stage.name}
              className="graph-node"
              onClick={() => onSelectStage && onSelectStage(idx)}
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: isRunning
                    ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-cyan))'
                    : isCompleted
                    ? 'var(--bg-surface-active)'
                    : 'var(--bg-surface)',
                  border: isRunning
                    ? '2px solid #ffffff'
                    : isCompleted
                    ? '2px solid var(--accent-emerald)'
                    : '2px solid var(--border-muted)',
                  boxShadow: isRunning ? 'var(--shadow-cyan-glow)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isCompleted ? 'var(--accent-emerald)' : '#ffffff',
                }}
              >
                {isCompleted ? <Check size={18} /> : <Bot size={18} />}
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isRunning ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}
              >
                {stage.name}
              </span>

              <span
                style={{
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-surface)',
                  padding: '1px 6px',
                  borderRadius: 3,
                }}
              >
                {stage.role}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
