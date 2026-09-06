import React, { useState } from 'react';
import { FileMatch } from '../types';
import { CaseSensitive, FileText, Regex, Search } from 'lucide-react';

interface SearchPanelProps {
  onSearch: (query: string, isRegex: boolean, caseSensitive: boolean) => Promise<FileMatch[]>;
  onOpenFileAtLine: (path: string, line: number) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onSearch, onOpenFileAtLine }) => {
  const [query, setQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [results, setResults] = useState<FileMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await onSearch(query, isRegex, caseSensitive);
      setResults(res);
    } finally {
      setIsSearching(false);
    }
  };

  const totalMatches = results.reduce((acc, r) => acc + r.matches.length, 0);

  return (
    <div className="left-sidebar">
      <div className="sidebar-header">
        <span>Search</span>
      </div>

      <div style={{ padding: '10px 12px' }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              className="input-text"
              style={{ width: '100%', paddingRight: '60px' }}
              placeholder="Search in files..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div
              style={{
                position: 'absolute',
                right: '6px',
                display: 'flex',
                gap: '4px',
              }}
            >
              <button
                type="button"
                className={`btn btn-secondary btn-sm ${caseSensitive ? 'btn-primary' : ''}`}
                style={{ padding: '2px 4px' }}
                onClick={() => setCaseSensitive(!caseSensitive)}
                title="Match Case"
              >
                <CaseSensitive size={12} />
              </button>
              <button
                type="button"
                className={`btn btn-secondary btn-sm ${isRegex ? 'btn-primary' : ''}`}
                style={{ padding: '2px 4px' }}
                onClick={() => setIsRegex(!isRegex)}
                title="Use Regular Expression"
              >
                <Regex size={12} />
              </button>
            </div>
          </div>
        </form>

        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
          {isSearching ? (
            'Searching workspace...'
          ) : results.length > 0 ? (
            `${totalMatches} results in ${results.length} files`
          ) : query ? (
            'No results found'
          ) : null}
        </div>
      </div>

      <div className="sidebar-content" style={{ padding: '4px' }}>
        {results.map((fileRes) => (
          <div key={fileRes.path} style={{ marginBottom: '8px' }}>
            <div
              className="tree-node"
              style={{ fontWeight: 600, color: 'var(--text-primary)' }}
            >
              <FileText size={13} color="var(--accent-primary)" />
              <span>{fileRes.relative_path}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {fileRes.matches.length}
              </span>
            </div>
            {fileRes.matches.map((m, idx) => (
              <div
                key={idx}
                className="tree-node"
                style={{ paddingLeft: '24px', fontSize: '11px' }}
                onClick={() => onOpenFileAtLine(fileRes.path, m.line_number)}
              >
                <span style={{ color: 'var(--accent-cyan)', marginRight: '6px' }}>
                  {m.line_number}:
                </span>
                <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.line_content.trim()}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
