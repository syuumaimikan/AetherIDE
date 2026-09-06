import React, { useState } from 'react';
import { Settings, X, Key, Shield, Terminal, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: [string, string][];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  providers,
}) => {
  const [selectedProvider, setSelectedProvider] = useState('mock');
  const [apiKey, setApiKey] = useState('');
  const [preferredShell, setPreferredShell] = useState('pwsh.exe');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="command-center-modal"
        style={{ width: '600px', maxHeight: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sidebar-header" style={{ padding: '14px 18px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={16} color="var(--accent-primary)" />
            <span>AETHER IDE Settings</span>
          </div>
          <button className="tab-close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div style={{ padding: '18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* AI Providers */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              <Cpu size={13} style={{ display: 'inline', marginRight: 6 }} />
              Active AI Provider
            </label>
            <select
              className="input-text"
              style={{ width: '100%' }}
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
            >
              {providers.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* API Key */}
          {selectedProvider !== 'mock' && selectedProvider !== 'ollama' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                <Key size={13} style={{ display: 'inline', marginRight: 6 }} />
                API Key
              </label>
              <input
                type="password"
                className="input-text"
                style={{ width: '100%' }}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          )}

          {/* Terminal Shell */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              <Terminal size={13} style={{ display: 'inline', marginRight: 6 }} />
              Preferred System Shell
            </label>
            <select
              className="input-text"
              style={{ width: '100%' }}
              value={preferredShell}
              onChange={(e) => setPreferredShell(e.target.value)}
            >
              <option value="pwsh.exe">PowerShell 7 (pwsh.exe)</option>
              <option value="cmd.exe">Command Prompt (cmd.exe)</option>
              <option value="bash">Git Bash / WSL (bash)</option>
            </select>
          </div>

          {/* Security Permissions */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              <Shield size={13} style={{ display: 'inline', marginRight: 6 }} />
              Autonomous Security Guardrails
            </label>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              • Dangerous shell commands (`rm -rf`, force push) require explicit prompt confirmation.<br />
              • Local file modifications are audited with real-time logging.<br />
              • Multi-agent pipeline is sandboxed to the active workspace directory.
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
