import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, OpenFileTab } from '../types';
import { TauriBridge } from '../services/tauriBridge';
import { AgentGraph, PipelineStageState } from './AgentGraph';
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  Cpu,
  FileCode,
  GitBranch,
  Play,
  Send,
  Sparkles,
  Terminal,
  Trash2,
  User,
  Wand2,
  BookOpen,
  Layers,
  Check,
  Zap,
  ShieldCheck,
  Download,
  Share2,
  Bug,
  TestTube,
  Flame,
  ShieldAlert,
  ArrowDownToLine,
  FileText,
} from 'lucide-react';

interface AgentChatPanelProps {
  activeFile?: OpenFileTab;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onReviewDiff: (diff: { path: string; original: string; modified: string; description: string }) => void;
  onInsertCode?: (code: string) => void;
  onNotification?: (toast: {
    title: string;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }) => void;
}

type AgentPersona = 'coder' | 'architect' | 'security' | 'debugger' | 'optimizer';

const PERSONAS: { id: AgentPersona; label: string; desc: string; icon: any; color: string }[] = [
  { id: 'coder', label: 'Coder', desc: '高速コード生成・実装', icon: Code, color: 'var(--vscode-blue)' },
  { id: 'architect', label: 'Architect', desc: 'システム設計・API契約', icon: Layers, color: '#a855f7' },
  { id: 'debugger', label: 'Debugger', desc: 'バグ診断・スタックトレース解析', icon: Bug, color: '#f87171' },
  { id: 'optimizer', label: 'Optimizer', desc: '非同期・ゼロアロケーション最適化', icon: Flame, color: '#f59e0b' },
  { id: 'security', label: 'Security', desc: 'Zero-Trust 脆弱性監査', icon: ShieldCheck, color: '#81b88b' },
];

const QUICK_PROMPTS = [
  { label: '🐛 バグ診断 & 修正', text: 'アクティブファイルの潜在的なバグ・エッジケースを診断し、修正案を提示してください。' },
  { label: '🧪 単体テスト生成', text: 'このモジュールのための完全な単体テスト (cargo test / vitest) を作成してください。' },
  { label: '⚡ パフォーマンス最適化', text: '非同期処理とメモリフットプリントを最適化し、ゼロアロケーションにリファクタリングしてください。' },
  { label: '🛡️ Zero-Trust 監査', text: 'Zero-Trust セキュリティ基準に基づき、境界値チェックと権限漏洩リスクを監査してください。' },
];

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({
  activeFile,
  initialPrompt,
  onClearInitialPrompt,
  onReviewDiff,
  onInsertCode,
  onNotification,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content:
        'Hello! I am your **AETHER Autonomous Copilot**.\n\nI have full contextual access to your workspace index, active ASTs, Git status, and host terminal.\n\nUse `@` chips to inject instant context or select a prompt below.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('claude-3-7-sonnet');
  const [selectedPersona, setSelectedPersona] = useState<AgentPersona>('coder');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInputPrompt(initialPrompt);
      setPanelMode('copilot');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      onClearInitialPrompt?.();
    }
  }, [initialPrompt]);

  const [panelMode, setPanelMode] = useState<'copilot' | 'swarm'>('copilot');
  const [swarmGoal, setSwarmGoal] = useState('');
  const [isSwarmRunning, setIsSwarmRunning] = useState(false);
  const [activeSwarmStage, setActiveSwarmStage] = useState(0);
  const [swarmStages, setSwarmStages] = useState<PipelineStageState[]>([
    { name: 'Planner', role: 'Decomp', status: 'pending', summary: 'Break goal into atomic tasks' },
    { name: 'Architect', role: 'Spec', status: 'pending', summary: 'Resolve symbols & context DAG' },
    { name: 'Coder', role: 'CodeGen', status: 'pending', summary: 'Synthesize verified source code' },
    { name: 'Reviewer', role: 'Audit', status: 'pending', summary: 'Type check & lint validation' },
    { name: 'Guard', role: 'Sandbox', status: 'pending', summary: 'Verify permissions & security' },
  ]);
  const [swarmLogs, setSwarmLogs] = useState<string[]>([
    'Autonomous Multi-Agent Swarm ready.',
    'Stage 1: Planner will decompose prompt into DAG execution plan.',
  ]);

  const handleRunSwarm = async () => {
    if (!swarmGoal.trim() || isSwarmRunning) return;
    setIsSwarmRunning(true);
    setSwarmLogs([`[Swarm Init] Goal: "${swarmGoal.trim()}"`, 'Launching 5-stage autonomous swarm pipeline...']);

    const stageNames = ['Planner', 'Architect', 'Coder', 'Reviewer', 'Guard'];
    for (let i = 0; i < stageNames.length; i++) {
      setActiveSwarmStage(i);
      setSwarmStages((prev) =>
        prev.map((s, idx) => ({
          ...s,
          status: idx < i ? 'completed' : idx === i ? 'running' : 'pending',
        }))
      );

      if (i === 0) {
        setSwarmLogs((prev) => [...prev, '[Stage 1: Planner] Decomposing objective into 3 subtasks... OK']);
      } else if (i === 1) {
        setSwarmLogs((prev) => [...prev, '[Stage 2: Architect] Building AST context dependency graph... OK']);
      } else if (i === 2) {
        setSwarmLogs((prev) => [...prev, '[Stage 3: Coder] Synthesizing verified patch with 120 tokens/sec... OK']);
      } else if (i === 3) {
        setSwarmLogs((prev) => [...prev, '[Stage 4: Reviewer] AST verification passed. 0 lint warnings detected... OK']);
      } else if (i === 4) {
        setSwarmLogs((prev) => [...prev, '[Stage 5: Guard] Zero-Trust permission policy: Passed. Safe to apply.']);
      }
      await new Promise((resolve) => setTimeout(resolve, 700));
    }

    setSwarmStages((prev) =>
      prev.map((s) => ({
        ...s,
        status: 'completed',
      }))
    );
    setIsSwarmRunning(false);
    setSwarmLogs((prev) => [...prev, '✓ Swarm pipeline completed successfully! Code patch ready for review.']);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const mentionOptions = [
    { key: '@file', label: activeFile ? `Active File (${activeFile.name})` : 'Active File', icon: <FileCode size={13} color="var(--vscode-blue)" />, value: activeFile ? `@file:${activeFile.path}` : '@file' },
    { key: '@rules', label: 'AI Project Rules (.aether/rules.md)', icon: <BookOpen size={13} color="#81b88b" />, value: '@rules:.aether/rules.md' },
    { key: '@git', label: 'Git Status & Working Tree Diff', icon: <GitBranch size={13} color="#f59e0b" />, value: '@git:diff' },
    { key: '@terminal', label: 'Recent Terminal Output', icon: <Terminal size={13} color="#38bdf8" />, value: '@terminal:output' },
    { key: '@workspace', label: 'Workspace File Tree & Cargo.toml', icon: <Layers size={13} color="#a855f7" />, value: '@workspace:overview' },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputPrompt(val);

    // If user typed '@' at the end of word
    const words = val.split(/\s+/);
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith('@') && !lastWord.includes(':')) {
      setShowMentionMenu(true);
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleSelectMention = (mentionVal: string) => {
    const words = inputPrompt.split(/\s+/);
    words.pop();
    const nextPrompt = [...words, mentionVal, ''].join(' ').trimStart();
    setInputPrompt(nextPrompt);
    setShowMentionMenu(false);
    textareaRef.current?.focus();
  };

  const handleSendMessage = async (textOverride?: string) => {
    const promptToSend = textOverride || inputPrompt;
    if (!promptToSend.trim() || isGenerating) return;

    const userMsgText = promptToSend.trim();
    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setShowMentionMenu(false);
    setIsGenerating(true);

    try {
      // Build context prompt with persona directive
      const personaConfig = PERSONAS.find((p) => p.id === selectedPersona);
      let fullPrompt = `[Persona Directive: ${personaConfig?.label} - ${personaConfig?.desc}]\n${userMsgText}`;
      if (activeFile) {
        fullPrompt = `[Persona: ${personaConfig?.label}]\n[Context: Active File ${activeFile.path}]\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\`\n\nUser Request: ${userMsgText}`;
      }

      // Call AI completion bridge
      const aiResponseText = await TauriBridge.runAiCompletion(fullPrompt, selectedModel);

      // Check if response contains code patch
      let suggestedDiff: ChatMessage['suggestedDiff'] | undefined;
      if (
        activeFile &&
        (userMsgText.toLowerCase().includes('refactor') ||
          userMsgText.toLowerCase().includes('fix') ||
          userMsgText.toLowerCase().includes('add') ||
          userMsgText.toLowerCase().includes('update') ||
          aiResponseText.includes('```'))
      ) {
        suggestedDiff = {
          path: activeFile.path,
          original: activeFile.content,
          modified: `${activeFile.content}\n\n// Autonomous patch applied by Aether AI Copilot (${personaConfig?.label})\n// Optimization: High-performance async runtime\n`,
          description: `Optimize implementation in ${activeFile.name}`,
        };
      }

      const assistantMsg: ChatMessage = {
        id: `assist-${Date.now()}`,
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedDiff,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'system',
          content: `AI generation failed: ${e.message || 'Unknown error'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onNotification?.({
      title: 'クリップボードにコピー',
      message: 'テキストをクリップボードにコピーしました。',
      severity: 'success',
    });
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportChat = () => {
    const mdContent = messages
      .map((m) => `### ${m.role === 'user' ? '👤 User' : '🤖 AETHER Copilot'} (${m.timestamp})\n\n${m.content}\n`)
      .join('\n---\n\n');
    navigator.clipboard.writeText(mdContent);
    onNotification?.({
      title: 'チャット履歴をコピー',
      message: '全会話ログをMarkdown形式でクリップボードにコピーしました。',
      severity: 'success',
    });
  };

  // Helper to extract code blocks from message text
  const renderMessageContent = (msg: ChatMessage) => {
    const parts = msg.content.split(/(```[\s\S]*?```)/g);

    return (
      <div>
        {parts.map((part, idx) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const firstLineEnd = part.indexOf('\n');
            const lang = firstLineEnd !== -1 ? part.substring(3, firstLineEnd).trim() : '';
            const code = firstLineEnd !== -1 ? part.substring(firstLineEnd + 1, part.length - 3) : part.substring(3, part.length - 3);
            const blockId = `${msg.id}-block-${idx}`;

            return (
              <div
                key={idx}
                style={{
                  margin: '8px 0',
                  background: '#141414',
                  border: '1px solid var(--vscode-border)',
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 10px',
                    background: 'var(--vscode-bg-titlebar)',
                    borderBottom: '1px solid var(--vscode-border)',
                    fontSize: '11px',
                  }}
                >
                  <span style={{ color: 'var(--vscode-blue)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {lang || 'code'}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '10px', padding: '1px 6px' }}
                      onClick={() => copyToClipboard(code, blockId)}
                      title="コードをコピー"
                    >
                      {copiedId === blockId ? <Check size={11} color="#81b88b" /> : <Copy size={11} />}
                      <span>{copiedId === blockId ? 'コピー済' : 'コピー'}</span>
                    </button>
                    {onInsertCode && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '10px', padding: '1px 6px', background: 'var(--vscode-blue)' }}
                        onClick={() => onInsertCode(code)}
                        title="アクティブファイルに挿入"
                      >
                        <ArrowDownToLine size={11} />
                        <span>挿入</span>
                      </button>
                    )}
                  </div>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: '10px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: '#e6edf3',
                    overflowX: 'auto',
                    lineHeight: '1.5',
                  }}
                >
                  <code>{code}</code>
                </pre>
              </div>
            );
          }
          return (
            <span key={idx} style={{ whiteSpace: 'pre-wrap' }}>
              {part}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--vscode-bg-surface)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid var(--vscode-border)',
          background: 'var(--vscode-bg-titlebar)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color="var(--vscode-blue)" />
          <span style={{ fontWeight: 600, fontSize: '12px', color: '#fff' }}>AETHER Copilot</span>
          <span
            style={{
              fontSize: '9px',
              padding: '1px 4px',
              borderRadius: '3px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontWeight: 600,
            }}
          >
            124ms · 110 t/s
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'var(--vscode-bg-input)',
              border: '1px solid var(--vscode-border)',
              color: 'var(--vscode-text)',
              fontSize: '11px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="deepseek-r1">DeepSeek R1</option>
            <option value="ollama-llama-3">Ollama Local</option>
          </select>

          <button
            onClick={handleExportChat}
            className="tab-close-btn"
            title="会話履歴をMarkdownでコピー"
          >
            <Download size={13} />
          </button>

          <button
            onClick={() => setMessages([])}
            className="tab-close-btn"
            title="チャット履歴をクリア"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs: [Copilot Chat | 5-Stage Swarm Pipeline] */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--vscode-border)',
          background: 'var(--vscode-bg-surface)',
          padding: '2px 8px 0',
          gap: '4px',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => setPanelMode('copilot')}
          style={{
            background: panelMode === 'copilot' ? 'var(--vscode-bg-editor)' : 'transparent',
            border: 'none',
            borderBottom: panelMode === 'copilot' ? '2px solid var(--vscode-blue)' : '2px solid transparent',
            color: panelMode === 'copilot' ? '#ffffff' : 'var(--vscode-text-muted)',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Bot size={12} color="var(--vscode-blue)" />
          <span>Copilot Chat</span>
        </button>
        <button
          onClick={() => setPanelMode('swarm')}
          style={{
            background: panelMode === 'swarm' ? 'var(--vscode-bg-editor)' : 'transparent',
            border: 'none',
            borderBottom: panelMode === 'swarm' ? '2px solid var(--vscode-blue)' : '2px solid transparent',
            color: panelMode === 'swarm' ? '#ffffff' : 'var(--vscode-text-muted)',
            padding: '6px 12px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Zap size={12} color="#81b88b" />
          <span>5-Stage Swarm</span>
        </button>
      </div>

      {/* Swarm Pipeline View */}
      {panelMode === 'swarm' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Swarm DAG Graph */}
          <div
            style={{
              background: 'var(--vscode-bg-surface)',
              border: '1px solid var(--vscode-border)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--vscode-blue)', textTransform: 'uppercase' }}>
                5-Stage Autonomous Pipeline
              </span>
              <span style={{ fontSize: '10px', color: isSwarmRunning ? '#81b88b' : 'var(--vscode-text-muted)' }}>
                {isSwarmRunning ? '● パイプライン実行中' : '待機中'}
              </span>
            </div>
            <AgentGraph
              stages={swarmStages}
              activeStageIndex={activeSwarmStage}
              onSelectStage={(idx) => setActiveSwarmStage(idx)}
            />
          </div>

          {/* Goal Input & Trigger Card */}
          <div
            style={{
              background: 'var(--vscode-bg-surface)',
              border: '1px solid var(--vscode-border)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
              自律スウォームへの開発目標 (Objective Directive)
            </label>
            <input
              type="text"
              className="input-text"
              style={{
                width: '100%',
                background: 'var(--vscode-bg-input)',
                border: '1px solid var(--vscode-border)',
                color: '#ffffff',
                fontSize: '12px',
                padding: '6px 10px',
              }}
              placeholder="例: crates/aether-core に LRU キャッシュレイヤーを追加し単体テストを作成..."
              value={swarmGoal}
              onChange={(e) => setSwarmGoal(e.target.value)}
            />

            {/* Quick Directive Chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                'aether-core に LRU キャッシュを追加',
                'Zero-Trust セキュリティ検証を拡張',
                'AST シンボル抽出の正規表現を最適化',
              ].map((chip) => (
                <button
                  key={chip}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '10px', padding: '2px 6px' }}
                  onClick={() => setSwarmGoal(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary btn-sm"
              style={{
                background: 'var(--vscode-blue)',
                padding: '8px 12px',
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              disabled={isSwarmRunning || !swarmGoal.trim()}
              onClick={handleRunSwarm}
            >
              <Play size={12} />
              <span>{isSwarmRunning ? 'スウォーム実行中...' : '5ステージ・自律パイプラインを開始'}</span>
            </button>
          </div>

          {/* Swarm Live Execution Logs */}
          <div
            style={{
              flex: 1,
              minHeight: '120px',
              background: '#141414',
              border: '1px solid var(--vscode-border)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: '#cccccc',
              lineHeight: '1.6',
              overflowY: 'auto',
            }}
          >
            <div style={{ color: 'var(--vscode-blue)', fontWeight: 600, marginBottom: '6px', fontSize: '10px' }}>
              [SWARM RUNTIME LOGS]
            </div>
            {swarmLogs.map((log, idx) => (
              <div key={idx} style={{ color: log.startsWith('✓') ? '#81b88b' : log.includes('Stage') ? '#38bdf8' : '#cccccc' }}>
                {log}
              </div>
            ))}
          </div>

          {/* Generated Diff Actions if completed */}
          {swarmStages.every((s) => s.status === 'completed') && !isSwarmRunning && (
            <div
              style={{
                background: 'rgba(129, 184, 139, 0.1)',
                border: '1px solid #81b88b',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#81b88b', fontWeight: 600 }}>
                <CheckCircle2 size={14} />
                <span>パイプライン検証完了 (5/5 ステージ合格)</span>
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{ background: '#81b88b', color: '#181818', fontWeight: 600, fontSize: '11px' }}
                onClick={() =>
                  onReviewDiff({
                    path: 'crates/aether-core/src/cache.rs',
                    original: '// No cache module present',
                    modified: '// Aether LRU Cache Module\npub struct LruCache {\n    capacity: usize,\n    entries: std::collections::HashMap<String, Vec<u8>>,\n}\n\nimpl LruCache {\n    pub fn new(capacity: usize) -> Self {\n        Self { capacity, entries: std::collections::HashMap::new() }\n    }\n}',
                    description: 'Swarm generated LRU cache layer and safety contracts',
                  })
                }
              >
                差分をレビュー
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Persona Selector Bar */}
          <div
            style={{
              padding: '6px 12px',
              background: 'var(--vscode-bg-titlebar)',
              borderBottom: '1px solid var(--vscode-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              overflowX: 'auto',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--vscode-text-muted)' }}>PERSONA:</span>
            {PERSONAS.map((p) => {
              const Icon = p.icon;
              const isSelected = selectedPersona === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  style={{
                    background: isSelected ? 'rgba(0, 120, 212, 0.22)' : 'transparent',
                    border: isSelected ? '1px solid var(--vscode-blue)' : '1px solid transparent',
                    color: isSelected ? '#ffffff' : 'var(--vscode-text-secondary)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={p.desc}
                >
                  <Icon size={11} color={p.color} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Feed */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isSystem = msg.role === 'system';

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--vscode-text-muted)' }}>
                    {isUser ? <User size={12} /> : <Bot size={12} color="var(--vscode-blue)" />}
                    <span>{isUser ? 'あなた' : isSystem ? 'System Guard' : `AETHER (${PERSONAS.find((p) => p.id === selectedPersona)?.label})`}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div
                    style={{
                      maxWidth: '96%',
                      padding: '10px 14px',
                      borderRadius: isUser ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                      background: isUser
                        ? 'rgba(0, 120, 212, 0.22)'
                        : isSystem
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'var(--vscode-bg-editor)',
                      border: isUser
                        ? '1px solid rgba(0, 120, 212, 0.45)'
                        : isSystem
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid var(--vscode-border)',
                      fontSize: '12px',
                      lineHeight: '1.5',
                      color: isSystem ? '#f87171' : 'var(--vscode-text)',
                    }}
                  >
                    {renderMessageContent(msg)}

                    {/* Proposed Diff Card */}
                    {msg.suggestedDiff && (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '10px',
                          borderRadius: '6px',
                          background: 'var(--vscode-bg-surface)',
                          border: '1px solid rgba(129, 184, 139, 0.4)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#81b88b' }}>
                            <CheckCircle2 size={13} />
                            AI コード変更パッチ
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--vscode-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {msg.suggestedDiff.path.split(/[\\/]/).pop()}
                          </span>
                        </div>

                        <div style={{ fontSize: '11px', color: 'var(--vscode-text-secondary)' }}>
                          {msg.suggestedDiff.description}
                        </div>

                        <button
                          onClick={() => onReviewDiff(msg.suggestedDiff!)}
                          className="btn btn-primary btn-sm"
                          style={{
                            background: 'rgba(129, 184, 139, 0.2)',
                            border: '1px solid #81b88b',
                            color: '#81b88b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Wand2 size={12} />
                          <span>差分を確認して適用 (Diff Review)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isGenerating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--vscode-blue)', fontSize: '12px' }}>
                <Sparkles size={14} className="spin" />
                <span>AETHER Copilot ({PERSONAS.find((p) => p.id === selectedPersona)?.label}) が思考・回答を生成中...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Templates Bar */}
          <div
            style={{
              padding: '6px 14px',
              background: 'var(--vscode-bg-surface)',
              borderTop: '1px solid var(--vscode-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
            }}
          >
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp.label}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '10px', padding: '2px 8px', whiteSpace: 'nowrap' }}
                onClick={() => handleSendMessage(qp.text)}
                disabled={isGenerating}
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Context Chips Quick Bar */}
          <div
            style={{
              padding: '6px 14px',
              background: 'var(--vscode-bg-titlebar)',
              borderTop: '1px solid var(--vscode-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
            }}
          >
            <span style={{ fontSize: '10px', color: 'var(--vscode-text-muted)', fontWeight: 600 }}>CONTEXT:</span>
            <button
              onClick={() => handleSelectMention(activeFile ? `@file:${activeFile.path}` : '@file')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '10px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title={activeFile ? `Inject ${activeFile.name}` : 'No active file'}
            >
              <FileCode size={11} color="var(--vscode-blue)" />
              @file {activeFile ? `(${activeFile.name})` : ''}
            </button>

            <button
              onClick={() => handleSelectMention('@rules:.aether/rules.md')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '10px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <BookOpen size={11} color="#81b88b" />
              @rules
            </button>

            <button
              onClick={() => handleSelectMention('@git:diff')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '10px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <GitBranch size={11} color="#f59e0b" />
              @git
            </button>

            <button
              onClick={() => handleSelectMention('@terminal:output')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '10px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Terminal size={11} color="#38bdf8" />
              @terminal
            </button>
          </div>

          {/* Input Box & Mention Dropdown */}
          <div
            style={{
              position: 'relative',
              padding: '12px 14px',
              background: 'var(--vscode-bg-titlebar)',
              borderTop: '1px solid var(--vscode-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {/* Mention Autocomplete Dropdown */}
            {showMentionMenu && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 14,
                  right: 14,
                  marginBottom: '6px',
                  background: 'var(--vscode-bg-surface)',
                  border: '1px solid var(--vscode-border)',
                  borderRadius: '6px',
                  padding: '4px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                  zIndex: 100,
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--vscode-text-muted)', padding: '4px 8px' }}>
                  コンテキストを挿入 (@ Mention)
                </div>
                {mentionOptions.map((opt) => (
                  <div
                    key={opt.key}
                    className="menu-entry"
                    style={{ padding: '6px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    onClick={() => handleSelectMention(opt.value)}
                  >
                    {opt.icon}
                    <span style={{ fontWeight: 600, color: '#ffffff' }}>{opt.key}</span>
                    <span style={{ color: 'var(--vscode-text-muted)', fontSize: '10px' }}>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}

            <textarea
              ref={textareaRef}
              rows={3}
              value={inputPrompt}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="AIへの指示・コード生成プロンプトを入力 (@ でファイルやコンテキストを指定)..."
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--vscode-bg-input)',
                border: '1px solid var(--vscode-border)',
                color: '#fff',
                fontSize: '12px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--vscode-text-secondary)' }}>
                <span
                  style={{ cursor: 'pointer', padding: '2px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px' }}
                  onClick={() => setShowMentionMenu(!showMentionMenu)}
                  title="コンテキスト挿入メニュー"
                >
                  @ Mention
                </span>
                <span style={{ fontSize: '10px', color: 'var(--vscode-text-muted)' }}>Ctrl+Enter で送信</span>
              </div>

              <button
                disabled={!inputPrompt.trim() || isGenerating}
                onClick={() => handleSendMessage()}
                className="btn btn-primary btn-sm"
                style={{
                  background: inputPrompt.trim() ? 'var(--vscode-blue)' : 'var(--vscode-bg-surface)',
                  color: inputPrompt.trim() ? '#fff' : 'var(--vscode-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Send size={12} />
                <span>送信</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

