import React from 'react';
import { AgentStepResult } from '../types';
import { Terminal, Bot, Wrench, CheckCircle } from 'lucide-react';

interface AgentTimelineProps {
  steps: AgentStepResult[];
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({ steps }) => {
  return (
    <div className="timeline-list">
      {steps.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
          No agent activity recorded yet. Launch a pipeline or prompt an agent to see real-time execution steps.
        </div>
      ) : (
        steps.map((step, idx) => (
          <div
            key={idx}
            className={`timeline-item ${step.tool_name ? 'tool' : 'thought'}`}
          >
            <div className="timeline-header">
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {step.tool_name ? (
                  <>
                    <Wrench size={12} color="var(--accent-cyan)" />
                    <b style={{ color: 'var(--accent-cyan)' }}>Tool: {step.tool_name}</b>
                  </>
                ) : (
                  <>
                    <Bot size={12} color="var(--accent-primary)" />
                    <b style={{ color: 'var(--text-primary)' }}>Step {step.step_index} Thought</b>
                  </>
                )}
              </span>
              {step.is_terminal && (
                <span style={{ color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={10} /> Finished
                </span>
              )}
            </div>

            {step.thought && (
              <div style={{ color: 'var(--text-primary)', marginBottom: step.tool_name ? '8px' : '0', lineHeight: 1.5 }}>
                {step.thought}
              </div>
            )}

            {step.tool_input && (
              <div style={{ background: 'var(--bg-app)', padding: '6px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                Input: {JSON.stringify(step.tool_input, null, 2)}
              </div>
            )}

            {step.tool_output && (
              <div style={{ marginTop: '4px', background: 'var(--bg-app)', padding: '6px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-emerald)' }}>
                Output: {JSON.stringify(step.tool_output, null, 2)}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
