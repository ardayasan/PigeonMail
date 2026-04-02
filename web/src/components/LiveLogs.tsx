import React, { useState, useRef, useEffect } from 'react';
import { useMail } from '../store';

type LogFilter = 'ALL' | 'SMTP' | 'POP3' | 'API' | 'ERROR';

function categorizeLog(log: string): { filter: LogFilter; color: string } {
  const upper = log.toUpperCase();
  if (upper.includes('ERROR') || upper.includes('EXCEPTION') || upper.includes('-ERR') || upper.includes('WARNING'))
    return { filter: 'ERROR', color: '#F87171' };
  if (upper.includes('SMTP'))
    return { filter: 'SMTP', color: '#34D399' };
  if (upper.includes('POP3'))
    return { filter: 'POP3', color: '#60A5FA' };
  if (upper.includes('REST') || upper.includes('HTTP') || upper.includes('API') || upper.includes('AUTH'))
    return { filter: 'API', color: '#FBBF24' };
  return { filter: 'ALL', color: '#9CA3AF' };
}

const FILTER_COLORS: Record<LogFilter, string> = {
  ALL:   '#9CA3AF',
  SMTP:  '#34D399',
  POP3:  '#60A5FA',
  API:   '#FBBF24',
  ERROR: '#F87171',
};

export default function LiveLogs() {
  const { serverLogs } = useMail();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<LogFilter>('ALL');
  const [cleared, setCleared] = useState(0); // index offset to simulate clear
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [serverLogs, isOpen]);

  const visibleLogs = serverLogs.slice(cleared).filter(log => {
    if (filter === 'ALL') return true;
    const { filter: cat } = categorizeLog(log);
    return cat === filter || (filter === 'ERROR' && cat === 'ERROR');
  });

  const panelStyle: React.CSSProperties = isFullscreen
    ? { position: 'fixed', inset: 20, bottom: 20, right: 20, width: 'auto', height: 'auto', zIndex: 9999 }
    : { position: 'fixed', bottom: 16, right: 16, width: 680, height: 440, zIndex: 9999 };

  if (!isOpen) {
    const unreadErrors = serverLogs.slice(cleared).filter(l => categorizeLog(l).filter === 'ERROR').length;
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
          background: unreadErrors > 0 ? '#EF4444' : '#1d4ed8',
          color: 'white', border: 'none',
          padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
          transition: 'background 0.2s',
        }}
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
        </svg>
        Server Logs
        {unreadErrors > 0 && (
          <span style={{
            background: 'white', color: '#EF4444', borderRadius: 10,
            padding: '1px 6px', fontSize: 11, fontWeight: 700, minWidth: 18, textAlign: 'center',
          }}>{unreadErrors > 99 ? '99+' : unreadErrors}</span>
        )}
      </button>
    );
  }

  return (
    <div style={{
      ...panelStyle,
      background: '#0d1117', border: '1px solid #30363d', borderRadius: 10,
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
      fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', padding: '8px 12px',
        background: '#161b22', borderBottom: '1px solid #30363d',
        borderTopLeftRadius: 10, borderTopRightRadius: 10, alignItems: 'center', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, background: '#10B981', borderRadius: '50%', boxShadow: '0 0 4px #10B981' }} />
          <span style={{ color: '#e6edf3', fontSize: 13, fontWeight: 600 }}>Live Server Logs</span>
          <span style={{ color: '#484f58', fontSize: 12 }}>{visibleLogs.length} entries</span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 4, flex: 1, justifyContent: 'center' }}>
          {(['ALL', 'SMTP', 'POP3', 'API', 'ERROR'] as LogFilter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${filter === f ? FILTER_COLORS[f] : '#30363d'}`,
              background: filter === f ? `${FILTER_COLORS[f]}20` : 'transparent',
              color: filter === f ? FILTER_COLORS[f] : '#484f58',
              transition: 'all 0.15s',
            }}>{f}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <button onClick={() => setCleared(serverLogs.length)} title="Clear logs" style={{
            background: 'transparent', border: '1px solid #30363d', color: '#484f58',
            cursor: 'pointer', padding: '3px 8px', borderRadius: 6, fontSize: 11,
            transition: 'all 0.15s',
          }}
            onMouseOver={e => { e.currentTarget.style.border = '1px solid #6e7681'; e.currentTarget.style.color = '#8b949e'; }}
            onMouseOut={e => { e.currentTarget.style.border = '1px solid #30363d'; e.currentTarget.style.color = '#484f58'; }}
          >Clear</button>
          <button onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Shrink" : "Fullscreen"} style={{
            background: 'transparent', border: 'none', color: '#484f58', cursor: 'pointer', padding: 4,
          }}>
            {isFullscreen ? (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
                <line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>
              </svg>
            ) : (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            )}
          </button>
          <button onClick={() => setIsOpen(false)} style={{
            background: 'transparent', border: 'none', color: '#484f58', cursor: 'pointer', fontSize: 16, padding: '0 2px',
          }}>✕</button>
        </div>
      </div>

      {/* Log content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', fontSize: 12, lineHeight: 1.7 }}>
        {visibleLogs.length === 0 ? (
          <div style={{ color: '#484f58', fontStyle: 'italic', marginTop: 8 }}>
            {filter === 'ALL' ? 'Waiting for logs…' : `No ${filter} logs yet.`}
          </div>
        ) : (
          visibleLogs.map((log, i) => {
            const { color } = categorizeLog(log);
            // Bold the protocol direction arrows
            const parts = log.split(/(\u2190|\u2192)/);
            return (
              <div key={i} style={{ wordBreak: 'break-all', marginBottom: 1, color, display: 'flex', gap: 6 }}>
                <span style={{ color: '#484f58', flexShrink: 0, userSelect: 'none' }}>{String(cleared + i + 1).padStart(3, '0')}</span>
                <span>{log}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
