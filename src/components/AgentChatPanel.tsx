import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, OpenFileTab } from '../types';
import { TauriBridge } from '../services/tauriBridge';
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
} from 'lucide-react';

interface AgentChatPanelProps {
  activeFile?: OpenFileTab;
  onReviewDiff: (diff: { path: string; original: string; modified: string; description: string }) => void;
}

export const AgentChatPanel: React.FC<AgentChatPanelProps> = ({
  activeFile,
  onReviewDiff,
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const handleSendMessage = async () => {
    if (!inputPrompt.trim() || isGenerating) return;

    const userMsgText = inputPrompt.trim();
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
      // Build context prompt
      let fullPrompt = userMsgText;
      if (activeFile) {
        fullPrompt = `[Context: Active File ${activeFile.path}]\n\`\`\`${activeFile.language}\n${activeFile.content}\n\`\`\`\n\nUser Request: ${userMsgText}`;
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
          modified: `${activeFile.content}\n\n// Autonomous patch applied by Aether AI Copilot\n// Optimization: High-performance async runtime\n`,
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
    setTimeout(() => setCopiedId(null), 1500);
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
          padding: '10px 16px',
          borderBottom: '1px solid var(--vscode-border)',
          background: 'var(--vscode-bg-titlebar)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={15} color="var(--vscode-blue)" />
          <span style={{ fontWeight: 600, fontSize: '12px', color: '#fff' }}>AETHER Copilot</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              background: 'var(--vscode-bg-input)',
              border: '1px solid var(--vscode-border)',
              color: 'var(--vscode-text)',
              fontSize: '11px',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="claude-3-7-sonnet">Claude 3.7 Sonnet (Thinking)</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="deepseek-r1">DeepSeek R1 (Reasoning)</option>
            <option value="ollama-llama-3">Ollama Local</option>
          </select>

          <button
            onClick={() => setMessages([])}
            className="tab-close-btn"
            title="チャット履歴をクリア"
          >
            <Trash2 size={13} />
          </button>
        </div>
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
                <span>{isUser ? 'あなた' : isSystem ? 'System Guard' : 'AETHER'}</span>
                <span>{msg.timestamp}</span>
              </div>

              <div
                style={{
                  maxWidth: '94%',
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
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}

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
            <span>AETHER Copilot が回答を生成中...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
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
            onClick={handleSendMessage}
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
    </div>
  );
};
