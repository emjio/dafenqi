
import React, { useState } from 'react';
import { User, ArrowRight } from 'lucide-react';

interface UserSetupModalProps {
  onComplete: (username: string) => void;
}

export const UserSetupModal: React.FC<UserSetupModalProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('请输入一个代号');
      return;
    }
    if (username.length > 10) {
      setError('代号太长了 (最多10个字符)');
      return;
    }
    onComplete(username.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative bg */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
        
        <h2 className="text-3xl font-bold text-white mb-2 relative z-10">身份登记</h2>
        <p className="text-slate-400 mb-8 relative z-10">在这场逻辑游戏中，我们需要一个代号来称呼你。</p>

        <form onSubmit={handleSubmit} className="relative z-10">
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              玩家代号
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type="text" 
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="例如: 逻辑大师"
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>

          <button 
            type="submit"
            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2 group"
          >
            确认身份 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
};
