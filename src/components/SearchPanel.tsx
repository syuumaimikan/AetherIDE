import React, { useState } from 'react';
import { FileMatch, ReplaceSummary, ToastNotification } from '../types';
import {
  CaseSensitive,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileCode,
  Filter,
  RefreshCw,
  Regex,
  Replace,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

interface SearchPanelProps {
  onSearch: (
    query: string,
    isRegex: boolean,
    caseSensitive: boolean,
    matchWholeWord: boolean,
    includePattern?: string,
    excludePattern?: string
  ) => Promise<FileMatch[]>;
  onReplaceAll?: (
    query: string,
    replaceWith: string,
    isRegex: boolean,
    caseSensitive: boolean,
    matchWholeWord: boolean,
    includePattern?: string,
    excludePattern?: string
  ) => Promise<ReplaceSummary>;
  onOpenFileAtLine: (path: string, line: number) => void;
  onNotification?: (toast: Omit<ToastNotification, 'id' | 'timestamp'>) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  onSearch,
  onReplaceAll,
  onOpenFileAtLine,
  onNotification,
}) => {
  const [query, setQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [includePattern, setIncludePattern] = useState('');
  const [excludePattern, setExcludePattern] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [results, setResults] = useState<FileMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [searchDurationMs, setSearchDurationMs] = useState<number | null>(null);
  const [showReplaceConfirmModal, setShowReplaceConfirmModal] = useState(false);

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    const start = performance.now();
    try {
      const res = await onSearch(
        query,
        isRegex,
        caseSensitive,
        matchWholeWord,
        includePattern || undefined,
        excludePattern || undefined
      );
      setResults(res);
      setSearchDurationMs(Math.round(performance.now() - start));
      // Auto expand all files
      const exp: Record<string, boolean> = {};
      res.forEach((r) => {
        exp[r.path] = true;
      });
      setExpandedFiles(exp);
    } catch (err: any) {
      if (onNotification) {
        onNotification({
          title: '検索エラー',
          message: err.message || String(err),
          severity: 'error',
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleExecuteReplaceAll = async () => {
    if (!onReplaceAll || !query.trim()) return;
    setShowReplaceConfirmModal(false);
    setIsReplacing(true);
    try {
      const summary = await onReplaceAll(
        query,
        replaceQuery,
        isRegex,
        caseSensitive,
        matchWholeWord,
        includePattern || undefined,
        excludePattern || undefined
      );
      if (onNotification) {
        onNotification({
          title: '一括置換完了',
          message: `${summary.files_modified} 個のファイルで ${summary.matches_replaced} 件の一致を置換しました。`,
          severity: 'success',
        });
      }
      // Re-run search to update results
      await handleSearchSubmit();
    } catch (err: any) {
      if (onNotification) {
        onNotification({
          title: '置換エラー',
          message: err.message || String(err),
          severity: 'error',
        });
      }
    } finally {
      setIsReplacing(false);
    }
  };

  const toggleFileExpand = (path: string) => {
    setExpandedFiles((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const toggleAllExpanded = () => {
    const anyCollapsed = results.some((r) => expandedFiles[r.path] === false);
    const nextState: Record<string, boolean> = {};
    results.forEach((r) => {
      nextState[r.path] = anyCollapsed;
    });
    setExpandedFiles(nextState);
  };

  const clearResults = () => {
    setQuery('');
    setReplaceQuery('');
    setResults([]);
    setSearchDurationMs(null);
    setExpandedFiles({});
  };

  const totalMatches = results.reduce((acc, r) => acc + r.matches.length, 0);

  const quickIncludeFilters = [
    { label: '*.rs', value: '*.rs' },
    { label: '*.ts, *.tsx', value: '*.ts, *.tsx' },
    { label: '*.json', value: '*.json' },
    { label: '*.css', value: '*.css' },
  ];

  return (
    <div className="left-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* VS Code Search Header with Actions */}
      <div
        className="sidebar-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--vscode-border)',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>
          検索 : ワークスペース
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {results.length > 0 && (
            <button
              type="button"
              className="sidebar-action-btn"
              onClick={toggleAllExpanded}
              title="すべて折りたたみ / すべて展開"
              style={{ padding: '2px 4px' }}
            >
              {results.every((r) => expandedFiles[r.path] !== false) ? (
                <ChevronsDownUp size={13} />
              ) : (
                <ChevronsUpDown size={13} />
              )}
            </button>
          )}
          <button
            type="button"
            className="sidebar-action-btn"
            onClick={clearResults}
            title="検索結果をクリア"
            style={{ padding: '2px 4px' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--vscode-border)' }}>
        <form onSubmit={handleSearchSubmit}>
          {/* Search Input Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            <button
              type="button"
              className="sidebar-action-btn"
              onClick={() => setShowReplace(!showReplace)}
              title="置換の切り替え"
              style={{
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: showReplace ? 'var(--vscode-blue)' : 'var(--vscode-text-secondary)',
              }}
            >
              {showReplace ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="input-text"
                style={{
                  width: '100%',
                  paddingRight: '68px',
                  background: 'var(--vscode-bg-input)',
                  border: '1px solid var(--vscode-border)',
                  color: '#ffffff',
                  fontSize: '12px',
                  height: '26px',
                }}
                placeholder="検索 (Enterで実行)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '4px',
                  display: 'flex',
                  gap: '2px',
                }}
              >
                <button
                  type="button"
                  className={`sidebar-action-btn ${caseSensitive ? 'active' : ''}`}
                  style={{
                    padding: '2px 4px',
                    borderRadius: '2px',
                    background: caseSensitive ? 'var(--vscode-blue)' : 'transparent',
                    color: caseSensitive ? '#ffffff' : 'inherit',
                  }}
                  onClick={() => setCaseSensitive(!caseSensitive)}
                  title="大文字と小文字を区別 (Alt+C)"
                >
                  <CaseSensitive size={12} />
                </button>
                <button
                  type="button"
                  className={`sidebar-action-btn ${matchWholeWord ? 'active' : ''}`}
                  style={{
                    padding: '2px 4px',
                    borderRadius: '2px',
                    background: matchWholeWord ? 'var(--vscode-blue)' : 'transparent',
                    color: matchWholeWord ? '#ffffff' : 'inherit',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                  onClick={() => setMatchWholeWord(!matchWholeWord)}
                  title="単語全体に一致 (Alt+W)"
                >
                  Ab
                </button>
                <button
                  type="button"
                  className={`sidebar-action-btn ${isRegex ? 'active' : ''}`}
                  style={{
                    padding: '2px 4px',
                    borderRadius: '2px',
                    background: isRegex ? 'var(--vscode-blue)' : 'transparent',
                    color: isRegex ? '#ffffff' : 'inherit',
                  }}
                  onClick={() => setIsRegex(!isRegex)}
                  title="正規表現を使用 (Alt+R)"
                >
                  <Regex size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Replace Input Box & Action */}
          {showReplace && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: '22px',
                marginBottom: '6px',
              }}
            >
              <input
                type="text"
                className="input-text"
                style={{
                  flex: 1,
                  background: 'var(--vscode-bg-input)',
                  border: '1px solid var(--vscode-border)',
                  color: '#ffffff',
                  fontSize: '12px',
                  height: '26px',
                }}
                placeholder="置換..."
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid var(--accent-primary)',
                  color: '#ffffff',
                }}
                disabled={results.length === 0 || isReplacing}
                onClick={() => {
                  if (results.length > 0) {
                    setShowReplaceConfirmModal(true);
                  }
                }}
                title="すべて置換 (Ctrl+Alt+Enter)"
              >
                {isReplacing ? <RefreshCw size={11} className="spin" /> : <Replace size={11} />}
                <span>置換</span>
              </button>
            </div>
          )}

          {/* Include / Exclude Filter Toggle */}
          <div style={{ marginLeft: '22px', marginBottom: '4px' }}>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              style={{
                background: 'none',
                border: 'none',
                color: showFilters ? 'var(--vscode-blue)' : 'var(--vscode-text-secondary)',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 0',
              }}
            >
              <Filter size={11} />
              <span>{showFilters ? '詳細フィルターを閉じる' : 'ファイルを含める / 除外する'}</span>
              {showFilters ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>
          </div>

          {/* Include / Exclude Inputs */}
          {showFilters && (
            <div
              style={{
                marginLeft: '22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                marginTop: '4px',
                background: 'rgba(0, 0, 0, 0.2)',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid var(--vscode-border)',
              }}
            >
              <div>
                <label style={{ fontSize: '10px', color: 'var(--vscode-text-secondary)', display: 'block', marginBottom: '2px' }}>
                  含めるファイル (カンマ区切り):
                </label>
                <input
                  type="text"
                  className="input-text"
                  style={{
                    width: '100%',
                    background: 'var(--vscode-bg-input)',
                    border: '1px solid var(--vscode-border)',
                    color: '#ffffff',
                    fontSize: '11px',
                    height: '22px',
                    padding: '2px 6px',
                  }}
                  placeholder="例: *.rs, src/**, *.tsx"
                  value={includePattern}
                  onChange={(e) => setIncludePattern(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {quickIncludeFilters.map((q) => (
                    <button
                      key={q.value}
                      type="button"
                      onClick={() => setIncludePattern(q.value)}
                      style={{
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        background: includePattern === q.value ? 'var(--vscode-blue)' : 'rgba(255,255,255,0.08)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '10px', color: 'var(--vscode-text-secondary)', display: 'block', marginBottom: '2px' }}>
                  除外するファイル:
                </label>
                <input
                  type="text"
                  className="input-text"
                  style={{
                    width: '100%',
                    background: 'var(--vscode-bg-input)',
                    border: '1px solid var(--vscode-border)',
                    color: '#ffffff',
                    fontSize: '11px',
                    height: '22px',
                    padding: '2px 6px',
                  }}
                  placeholder="例: *.test.ts, target/**"
                  value={excludePattern}
                  onChange={(e) => setExcludePattern(e.target.value)}
                />
              </div>
            </div>
          )}
        </form>

        {/* Result summary & execution duration */}
        <div
          style={{
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--vscode-text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {isSearching ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={11} className="spin" />
              ワークスペースを検索中...
            </span>
          ) : results.length > 0 ? (
            <>
              <span style={{ fontWeight: 600, color: 'var(--vscode-text-primary)' }}>
                {results.length} ファイルで {totalMatches} 件の一致
              </span>
              {searchDurationMs !== null && (
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
                  {searchDurationMs} ms
                </span>
              )}
            </>
          ) : query ? (
            '結果は見つかりませんでした'
          ) : (
            '検索クエリを入力して Enter を押してください'
          )}
        </div>
      </div>

      {/* Results Tree */}
      <div className="sidebar-content" style={{ padding: '4px 6px', flex: 1, overflow: 'auto' }}>
        {results.map((fileRes) => {
          const isExpanded = expandedFiles[fileRes.path] !== false;
          return (
            <div key={fileRes.path} style={{ marginBottom: '4px' }}>
              {/* File Row */}
              <div
                className="tree-node"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--vscode-text-bright)',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '3px',
                }}
                onClick={() => toggleFileExpand(fileRes.path)}
              >
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <FileCode size={13} color="#e44d26" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {fileRes.relative_path || fileRes.path.split(/[\\/]/).pop()}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'var(--vscode-text-muted)',
                    marginLeft: 'auto',
                    background: 'rgba(255,255,255,0.06)',
                    padding: '1px 5px',
                    borderRadius: '10px',
                  }}
                >
                  {fileRes.matches.length}
                </span>
              </div>

              {/* Match Line Rows */}
              {isExpanded && (
                <div style={{ paddingLeft: '22px' }}>
                  {fileRes.matches.map((m, idx) => (
                    <div
                      key={idx}
                      className="tree-node"
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--vscode-text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        height: '22px',
                        cursor: 'pointer',
                        padding: '1px 4px',
                        borderRadius: '2px',
                      }}
                      onClick={() => onOpenFileAtLine(fileRes.path, m.line_number)}
                      title={`行 ${m.line_number}: ${m.line_content}`}
                    >
                      <span style={{ color: 'var(--vscode-blue)', marginRight: '6px' }}>
                        {m.line_number}:
                      </span>
                      <span>
                        {query ? (
                          m.line_content
                            .split(
                              new RegExp(
                                `(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
                                caseSensitive ? 'g' : 'gi'
                              )
                            )
                            .map((part, pIdx) =>
                              part.toLowerCase() === query.toLowerCase() ? (
                                <span
                                  key={pIdx}
                                  style={{
                                    background: 'rgba(234, 179, 8, 0.35)',
                                    color: '#fef08a',
                                    borderRadius: '2px',
                                    padding: '0 2px',
                                  }}
                                >
                                  {part}
                                </span>
                              ) : (
                                part
                              )
                            )
                        ) : (
                          m.line_content
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Replace Confirmation Modal */}
      {showReplaceConfirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowReplaceConfirmModal(false)}
        >
          <div
            style={{
              background: 'var(--vscode-bg-editor)',
              border: '1px solid var(--vscode-border)',
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14px', color: '#fff' }}>
                <Replace size={16} color="var(--vscode-blue)" />
                一括置換の確認
              </div>
              <button
                className="sidebar-action-btn"
                onClick={() => setShowReplaceConfirmModal(false)}
                style={{ padding: '2px' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--vscode-text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0' }}>
                検索条件に一致する <b>{results.length} 個のファイル</b> 内の <b>{totalMatches} 件の一致</b> をすべて次の文字列で置換します：
              </p>
              <div
                style={{
                  background: 'var(--vscode-bg-input)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--vscode-border)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: 'var(--accent-emerald)',
                }}
              >
                "{replaceQuery}"
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 14px' }}
                onClick={() => setShowReplaceConfirmModal(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  fontSize: '12px',
                  padding: '6px 14px',
                  background: 'var(--vscode-blue)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onClick={handleExecuteReplaceAll}
              >
                <Replace size={13} />
                すべて置換を実行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
