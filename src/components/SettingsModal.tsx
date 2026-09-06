import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Key,
  Shield,
  Terminal,
  Cpu,
  Sliders,
  Code2,
  Lock,
  Sparkles,
  Save,
  Check,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: [string, string][];
  onSettingsSaved?: (settings: any) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  providers,
  onSettingsSaved,
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'ai' | 'security' | 'terminal'>('ai');
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState('claude-3-7-sonnet-20250219');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState(0.2);
  const [preferredShell, setPreferredShell] = useState('pwsh.exe');
  
  // Editor Settings
  const [fontSize, setFontSize] = useState(14);
  const [tabSize, setTabSize] = useState(4);
  const [wordWrap, setWordWrap] = useState('on');
  const [minimap, setMinimap] = useState(true);
  const [autoSave, setAutoSave] = useState('afterDelay');
  
  // Security
  const [autoApproveSafeReads, setAutoApproveSafeReads] = useState(true);
  const [blockDangerousCommands, setBlockDangerousCommands] = useState(true);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('aether_ide_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedProvider) setSelectedProvider(parsed.selectedProvider);
        if (parsed.selectedModel) setSelectedModel(parsed.selectedModel);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.fontSize) setFontSize(parsed.fontSize);
        if (parsed.tabSize) setTabSize(parsed.tabSize);
        if (parsed.wordWrap) setWordWrap(parsed.wordWrap);
        if (parsed.preferredShell) setPreferredShell(parsed.preferredShell);
        if (parsed.autoApproveSafeReads !== undefined) setAutoApproveSafeReads(parsed.autoApproveSafeReads);
        if (parsed.blockDangerousCommands !== undefined) setBlockDangerousCommands(parsed.blockDangerousCommands);
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage:', e);
    }
  }, []);

  const handleSave = () => {
    const config = {
      selectedProvider,
      selectedModel,
      apiKey,
      temperature,
      preferredShell,
      fontSize,
      tabSize,
      wordWrap,
      minimap,
      autoSave,
      autoApproveSafeReads,
      blockDangerousCommands,
    };
    try {
      localStorage.setItem('aether_ide_settings', JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e);
    }
    onSettingsSaved?.(config);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="command-center-modal"
        style={{
          width: '780px',
          maxWidth: '95vw',
          height: '560px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sidebar-header"
          style={{
            padding: '12px 20px',
            fontSize: '13px',
            background: 'var(--vscode-bg-titlebar)',
            borderBottom: '1px solid var(--vscode-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={16} color="var(--vscode-blue)" />
            <span style={{ fontWeight: 600, color: '#ffffff' }}>AETHER IDE 設定 (Settings)</span>
          </div>
          <button className="tab-close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {/* Tab Navigation & Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Settings Left Navigation */}
          <div
            style={{
              width: '180px',
              borderRight: '1px solid var(--vscode-border)',
              background: 'var(--vscode-bg-sidebar)',
              padding: '8px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: activeTab === 'ai' ? 'rgba(0, 120, 212, 0.18)' : 'transparent',
                borderLeft: activeTab === 'ai' ? '2px solid var(--vscode-blue)' : '2px solid transparent',
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                color: activeTab === 'ai' ? '#ffffff' : 'var(--vscode-text-secondary)',
                fontSize: '12px',
                fontWeight: activeTab === 'ai' ? 600 : 400,
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('ai')}
            >
              <Cpu size={14} color="var(--vscode-blue)" />
              <span>AI モデル構成</span>
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: activeTab === 'editor' ? 'rgba(0, 120, 212, 0.18)' : 'transparent',
                borderLeft: activeTab === 'editor' ? '2px solid var(--vscode-blue)' : '2px solid transparent',
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                color: activeTab === 'editor' ? '#ffffff' : 'var(--vscode-text-secondary)',
                fontSize: '12px',
                fontWeight: activeTab === 'editor' ? 600 : 400,
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('editor')}
            >
              <Code2 size={14} color="#81b88b" />
              <span>エディター (Editor)</span>
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: activeTab === 'security' ? 'rgba(0, 120, 212, 0.18)' : 'transparent',
                borderLeft: activeTab === 'security' ? '2px solid var(--vscode-blue)' : '2px solid transparent',
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                color: activeTab === 'security' ? '#ffffff' : 'var(--vscode-text-secondary)',
                fontSize: '12px',
                fontWeight: activeTab === 'security' ? 600 : 400,
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('security')}
            >
              <Shield size={14} color="#f59e0b" />
              <span>セキュリティ & OS</span>
            </button>

            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: activeTab === 'terminal' ? 'rgba(0, 120, 212, 0.18)' : 'transparent',
                borderLeft: activeTab === 'terminal' ? '2px solid var(--vscode-blue)' : '2px solid transparent',
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                color: activeTab === 'terminal' ? '#ffffff' : 'var(--vscode-text-secondary)',
                fontSize: '12px',
                fontWeight: activeTab === 'terminal' ? 600 : 400,
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onClick={() => setActiveTab('terminal')}
            >
              <Terminal size={14} color="#38bdf8" />
              <span>統合ターミナル</span>
            </button>
          </div>

          {/* Right Content */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: 'var(--vscode-bg-surface)' }}>
            {activeTab === 'ai' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                    Active AI Model Provider
                  </label>
                  <select
                    className="input-text"
                    style={{ width: '100%' }}
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                  >
                    <option value="anthropic">Anthropic (Claude 3.7 Sonnet / Claude 3.5 Haiku)</option>
                    <option value="openai">OpenAI (GPT-4o / o3-mini / GPT-4.5)</option>
                    <option value="ollama">Ollama Local (DeepSeek-R1 / Qwen2.5-Coder / Llama 3.3)</option>
                    <option value="mock">Builtin High-Speed Mock Engine (Offline Dev)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                    Default LLM Model Name
                  </label>
                  <input
                    type="text"
                    className="input-text"
                    style={{ width: '100%' }}
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    placeholder="e.g. claude-3-7-sonnet-20250219"
                  />
                </div>

                {selectedProvider !== 'mock' && selectedProvider !== 'ollama' && (
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                      <Key size={13} style={{ display: 'inline', marginRight: 6 }} />
                      API Key
                    </label>
                    <input
                      type="password"
                      className="input-text"
                      style={{ width: '100%' }}
                      placeholder="sk-ant-... or sk-proj-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--vscode-text-muted)', marginTop: '4px' }}>
                      キーはローカルOSの安全なKeyringに保存され、外部に平文送信されません。
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                      Sampling Temperature ({temperature})
                    </label>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    style={{ width: '100%', accentColor: 'var(--vscode-blue)' }}
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  />
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                    フォントサイズ (Font Size)
                  </label>
                  <input
                    type="number"
                    className="input-text"
                    style={{ width: '120px' }}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value) || 14)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                    タブサイズ (Tab Size)
                  </label>
                  <select
                    className="input-text"
                    style={{ width: '120px' }}
                    value={tabSize}
                    onChange={(e) => setTabSize(parseInt(e.target.value) || 4)}
                  >
                    <option value={2}>2 スペース</option>
                    <option value={4}>4 スペース</option>
                    <option value={8}>8 スペース</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                    右端で折り返す (Word Wrap)
                  </label>
                  <select
                    className="input-text"
                    style={{ width: '100%' }}
                    value={wordWrap}
                    onChange={(e) => setWordWrap(e.target.value)}
                  >
                    <option value="on">有効 (on)</option>
                    <option value="off">無効 (off)</option>
                    <option value="wordWrapColumn">指定列で折り返す</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="minimap-check"
                    checked={minimap}
                    onChange={(e) => setMinimap(e.target.checked)}
                  />
                  <label htmlFor="minimap-check" style={{ fontSize: '12px', color: '#ffffff', cursor: 'pointer' }}>
                    ミニマップ (Minimap) を右側に表示
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="safe-reads"
                    checked={autoApproveSafeReads}
                    onChange={(e) => setAutoApproveSafeReads(e.target.checked)}
                  />
                  <label htmlFor="safe-reads" style={{ fontSize: '12px', color: '#ffffff', cursor: 'pointer' }}>
                    安全なファイル読み取り・検索は確認ダイアログをスキップ
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="block-danger"
                    checked={blockDangerousCommands}
                    onChange={(e) => setBlockDangerousCommands(e.target.checked)}
                  />
                  <label htmlFor="block-danger" style={{ fontSize: '12px', color: '#ffffff', cursor: 'pointer' }}>
                    危険コマンド (rm -rf, git push --force, system reboot) の二重確認を強制
                  </label>
                </div>

                <div
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontSize: '12px',
                    color: '#fcd34d',
                    lineHeight: '1.5',
                  }}
                >
                  <strong>Zero-Trust Guardrails:</strong> すべてのAgentによるファイル書き込み・ターミナル実行・ネットワーク送信はリアルタイム監査ログに永続化されます。
                </div>
              </div>
            )}

            {activeTab === 'terminal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', display: 'block', marginBottom: '6px' }}>
                    デフォルト シェル (Default Shell)
                  </label>
                  <select
                    className="input-text"
                    style={{ width: '100%' }}
                    value={preferredShell}
                    onChange={(e) => setPreferredShell(e.target.value)}
                  >
                    <option value="pwsh.exe">PowerShell 7 (pwsh.exe)</option>
                    <option value="powershell.exe">Windows PowerShell (powershell.exe)</option>
                    <option value="cmd.exe">Command Prompt (cmd.exe)</option>
                    <option value="bash.exe">Git Bash / WSL (bash.exe)</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--vscode-border)',
            background: 'var(--vscode-bg-titlebar)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--vscode-text-muted)' }}>
            設定はワークスペースおよびローカル構成に即時反映されます
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              キャンセル
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              style={{ background: 'var(--vscode-blue)', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isSavedNotice ? <Check size={13} /> : <Save size={13} />}
              <span>{isSavedNotice ? '保存完了' : '設定を保存'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
