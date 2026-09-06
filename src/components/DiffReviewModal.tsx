import React, { useState } from 'react';
import { Check, Copy, FileCode, GitCompare, X } from 'lucide-react';

interface DiffReviewModalProps {
  isOpen: boolean;
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  description?: string;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export const DiffReviewModal: React.FC<DiffReviewModalProps> = ({
  isOpen,
  filePath,
  originalContent,
  modifiedContent,
  description,
  onAccept,
  onReject,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const originalLines = originalContent.split('\n');
  const modifiedLines = modifiedContent.split('\n');

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(modifiedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '90vw',
          maxWidth: '1100px',
          height: '85vh',
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-sidebar)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }}
            >
              <GitCompare size={18} color="var(--accent-primary)" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                  AI Proposed Code Modification
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: 'var(--bg-surface)',
                    color: 'var(--accent-cyan)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {filePath}
                </span>
              </div>
              {description && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {description}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-surface)',
                borderRadius: '6px',
                padding: '2px',
                border: '1px solid var(--border-muted)',
              }}
            >
              <button
                onClick={() => setViewMode('unified')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: viewMode === 'unified' ? 'var(--bg-surface-active)' : 'transparent',
                  border: 'none',
                  color: viewMode === 'unified' ? '#fff' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Unified
              </button>
              <button
                onClick={() => setViewMode('split')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: viewMode === 'split' ? 'var(--bg-surface-active)' : 'transparent',
                  border: 'none',
                  color: viewMode === 'split' ? '#fff' : 'var(--text-secondary)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Split
              </button>
            </div>

            <button
              onClick={handleCopyDiff}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {copied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Diff View Area */}
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-app)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
          {viewMode === 'unified' ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {modifiedLines.map((line, idx) => {
                const origLine = originalLines[idx];
                const isDifferent = origLine !== line;
                const isAddition = origLine === undefined;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      padding: '2px 12px',
                      background: isDifferent
                        ? isAddition
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(99, 102, 241, 0.15)'
                        : 'transparent',
                      borderLeft: isDifferent ? '3px solid var(--accent-emerald)' : '3px solid transparent',
                    }}
                  >
                    <span style={{ width: 40, color: 'var(--text-muted)', userSelect: 'none', flexShrink: 0 }}>
                      {idx + 1}
                    </span>
                    <span style={{ width: 20, color: isDifferent ? 'var(--accent-emerald)' : 'var(--text-muted)', userSelect: 'none', flexShrink: 0 }}>
                      {isDifferent ? '+' : ' '}
                    </span>
                    <span style={{ whiteSpace: 'pre-wrap', color: isDifferent ? '#fff' : 'var(--text-primary)' }}>
                      {line}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%' }}>
              {/* Original Left */}
              <div style={{ borderRight: '1px solid var(--border-subtle)', overflow: 'auto', padding: '8px 0' }}>
                <div style={{ padding: '4px 12px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>
                  ORIGINAL
                </div>
                {originalLines.map((line, idx) => (
                  <div key={idx} style={{ display: 'flex', padding: '2px 12px' }}>
                    <span style={{ width: 35, color: 'var(--text-muted)', userSelect: 'none', flexShrink: 0 }}>{idx + 1}</span>
                    <span style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>{line}</span>
                  </div>
                ))}
              </div>

              {/* Modified Right */}
              <div style={{ overflow: 'auto', padding: '8px 0' }}>
                <div style={{ padding: '4px 12px', color: 'var(--accent-emerald)', fontSize: '11px', fontWeight: 600, borderBottom: '1px solid var(--border-subtle)' }}>
                  PROPOSED BY AI AGENT
                </div>
                {modifiedLines.map((line, idx) => {
                  const isDiff = originalLines[idx] !== line;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        padding: '2px 12px',
                        background: isDiff ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                      }}
                    >
                      <span style={{ width: 35, color: 'var(--text-muted)', userSelect: 'none', flexShrink: 0 }}>{idx + 1}</span>
                      <span style={{ whiteSpace: 'pre-wrap', color: isDiff ? '#fff' : 'var(--text-primary)' }}>{line}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-sidebar)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <FileCode size={15} color="var(--accent-primary)" />
            <span>Target disk path: <b>{filePath}</b></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onReject}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reject Changes
            </button>
            <button
              onClick={onAccept}
              style={{
                padding: '8px 20px',
                borderRadius: '6px',
                background: 'linear-gradient(135deg, var(--accent-emerald) 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Check size={14} />
              Accept & Apply to Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
