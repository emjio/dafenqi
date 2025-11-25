import React, { useEffect, useRef } from 'react';
import { GameLogEntry } from '../types';
import { MessageSquare, Terminal } from 'lucide-react';

interface LogPanelProps {
  logs: GameLogEntry[];
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-64 md:h-full bg-slate-900/90 border-t border-slate-700 md:border-t-0 md:border-l backdrop-blur-sm">
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center gap-2 flex-shrink-0">
        <Terminal size={18} className="text-amber-500" />
        <span className="font-bold text-slate-200 text-sm tracking-wider uppercase">游戏日志</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {logs.length === 0 && (
          <p className="text-slate-600 italic text-center mt-10">等待游戏开始...</p>
        )}
        
        {logs.map((log) => (
          <div key={log.id} className={`flex flex-col animate-fadeIn`}>
            {log.type === 'chat' ? (
               <div className="flex gap-2 text-amber-200/90 italic bg-amber-900/20 p-2 rounded-lg border border-amber-900/30">
                 <MessageSquare size={14} className="mt-1 shrink-0" />
                 <span>"{log.message}"</span>
               </div>
            ) : (
              <div className={`
                leading-relaxed
                ${log.type === 'success' ? 'text-emerald-400' : ''}
                ${log.type === 'failure' ? 'text-red-400' : ''}
                ${log.type === 'info' ? 'text-slate-400' : ''}
              `}>
                <span className="opacity-40 text-xs mr-2 select-none">
                  [{new Date(log.timestamp).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}]
                </span>
                {log.player === 'ai' && <span className="font-bold text-indigo-400">对手: </span>}
                {log.player === 'player' && <span className="font-bold text-amber-500">你: </span>}
                {log.message}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};
