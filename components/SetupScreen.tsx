
import React, { useState } from 'react';
import { AiProvider } from '../types';
import { Key, Bot, Cpu, ShieldCheck, Sparkles } from 'lucide-react';

interface SetupScreenProps {
  onStart: (provider: AiProvider, apiKey: string) => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStart }) => {
  const [provider, setProvider] = useState<AiProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('请输入 API Key 以继续');
      return;
    }
    onStart(provider, apiKey);
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,0)_0%,rgba(0,0,0,0.8)_100%)] z-0 pointer-events-none" />
      
      <div className="z-10 w-full max-w-md bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-md p-8 animate-fadeIn">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-4xl font-bold text-amber-500 brand-font mb-2 tracking-tighter drop-shadow-lg">
            配置智能代理
          </h1>
          <p className="text-slate-400 text-sm">
            连接 AI 模型以启动达芬奇密码对决
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-bold flex items-center gap-2">
              <Cpu size={16} className="text-indigo-400" /> 选择 AI 模型
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProvider('gemini')}
                className={`
                  flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all
                  ${provider === 'gemini' 
                    ? 'bg-indigo-900/40 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'}
                `}
              >
                <Bot size={20} className={provider === 'gemini' ? 'text-indigo-400' : ''} />
                <span>Gemini</span>
              </button>
              
              <button
                type="button"
                onClick={() => setProvider('openai')}
                className={`
                  flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 transition-all
                  ${provider === 'openai' 
                    ? 'bg-emerald-900/40 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'}
                `}
              >
                 <Sparkles size={20} className={provider === 'openai' ? 'text-emerald-400' : ''} />
                <span>OpenAI</span>
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <label className="text-slate-300 text-sm font-bold flex items-center gap-2">
              <Key size={16} className="text-amber-500" /> API Key
            </label>
            <div className="relative group">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError('');
                }}
                placeholder={provider === 'gemini' ? "AIzaSy..." : "sk-..."}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-mono"
              />
              <div className="absolute inset-0 rounded-xl ring-1 ring-white/10 pointer-events-none" />
            </div>
            {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <ShieldCheck size={12} /> 您的 Key 仅用于当前浏览器会话请求，不会被存储。
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold py-3.5 rounded-xl shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
          >
            初始化系统并进入
          </button>
        </form>
      </div>
    </div>
  );
};
