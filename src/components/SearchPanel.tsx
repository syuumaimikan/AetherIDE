import React, { useState } from 'react';
import { FileMatch } from '../types';
import {
  CaseSensitive,
  ChevronDown,
  ChevronRight,
  FileCode,
  FileText,
  Regex,
  Search,
  Replace,
  Sparkles,
} from 'lucide-react';

interface SearchPanelProps {
  onSearch: (query: string, isRegex: boolean, caseSensitive: boolean) => Promise<FileMatch[]>;
  onOpenFileAtLine: (path: string, line: number) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onSearch, onOpenFileAtLine }) => {
  const [query, setQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [results, setResults] = useState<FileMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await onSearch(query, isRegex, caseSensitive);
      setResults(res);
      // Auto expand all files
      const exp: Record<string, boolean> = {};
      res.forEach((r) => {
        exp[r.path] = true;
      });
      setExpandedFiles(exp);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFileExpand = (path: string) => {
    setExpandedFiles((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const totalMatches = results.reduce((acc, r) => acc + r.matches.length, 0);

  return (
    <div className="left-sidebar">
      {/* VS Code Search Header */}
      <div className="sidebar-header">
        <span style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>
          検索 : ワークスペース
        </span>
      </div>

      <div style={{ padding: '8px 12px' }}>
        <form onSubmit={handleSearchSubmit}>
          {/* Search Input Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <button
              type="button"
              className="sidebar-action-btn"
              onClick={() => setShowReplace(!showReplace)}
              title="置換の切り替え"
            >
              {showReplace ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                className="input-text"
                style={{
                  width: '100%',
                  paddingRight: '60px',
                  background: 'var(--vscode-bg-input)',
                  border: '1px solid var(--vscode-border)',
                  color: '#ffffff',
                  fontSize: '12px',
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
                    padding: '2px',
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
                    padding: '2px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '17px', marginBottom: '4px' }}>
              <input
                type="text"
                className="input-text"
                style={{
                  flex: 1,
                  background: 'var(--vscode-bg-input)',
                  border: '1px solid var(--vscode-border)',
                  color: '#ffffff',
                  fontSize: '12px',
                }}
                placeholder="置換..."
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '10px', padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '3px' }}
                onClick={() => {
                  if (results.length > 0 && replaceQuery) {
                    alert(`${totalMatches} 件の一致を "${replaceQuery}" で置換します。`);
                  }
                }}
                title="すべて置換 (Ctrl+Alt+Enter)"
              >
                <Replace size={11} />
                <span>すべて置換</span>
              </button>
            </div>
          )}
        </form>

        {/* Result summary */}
        <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--vscode-text-muted)' }}>
          {isSearching ? (
            'ワークスペースを検索中...'
          ) : results.length > 0 ? (
            `${results.length} 個のファイルで ${totalMatches} 件の一致`
          ) : query ? (
            '結果は見つかりませんでした'
          ) : null}
        </div>
      </div>

      {/* Results Tree */}
      <div className="sidebar-content" style={{ padding: '0 4px' }}>
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
    </div>
  );
};
