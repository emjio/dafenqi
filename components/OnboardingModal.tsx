
import React, { useState } from 'react';
import { Shield, BookOpen, SkipForward, Info } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: (skip: boolean, isVeteran: boolean) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (showDetails) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
          <h2 className="text-3xl font-bold text-amber-500 mb-6 brand-font border-b border-slate-700 pb-4">
            达芬奇密码 - 详细规则
          </h2>
          
          <div className="space-y-6 text-slate-300 leading-relaxed">
            <section>
              <h3 className="text-xl text-white font-bold mb-2 flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full"/> 游戏目标</h3>
              <p>这就好比是一个逻辑推理的“大逃杀”。你需要通过推理和运气，猜出对手所有的隐藏手牌（数字 0-11），同时保护好自己的手牌不被猜中。</p>
            </section>

            <section>
              <h3 className="text-xl text-white font-bold mb-2 flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full"/> 核心机制：排序</h3>
              <p>所有手牌在摸到时，必须按照**从小到大（0 -> 11）**的顺序排列。</p>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-slate-400">
                <li>如果你有黑色的 3 和白色的 7，那么 3 必须在 7 的左边。</li>
                <li>如果数字相同（例如黑 5 和白 5），**黑牌必须在左边**。</li>
              </ul>
              <p className="mt-2 text-indigo-400 italic">正是这个规则，让你能通过对手已知牌的位置，推断出未知牌的范围。</p>
            </section>

            <section>
              <h3 className="text-xl text-white font-bold mb-2 flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full"/> 特殊牌：Joker (-)</h3>
              <p>牌堆中有两张特殊牌（短横线 -）。</p>
              <p>这是一张**王牌**。当你摸到它时，你可以把它**插入到手牌的任何位置**，不受数字大小限制。</p>
              <p>这能极大地迷惑对手，因为他们无法通过正常的排序逻辑来推断这张牌周围的数字。</p>
            </section>

            <section>
              <h3 className="text-xl text-white font-bold mb-2 flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full"/> 游戏流程</h3>
              <ol className="list-decimal pl-6 space-y-2 text-slate-400">
                <li>**摸牌**：回合开始时，你从牌堆摸一张牌。这张牌暂时对所有人可见（如果不幸猜错，它就会一直保持可见）。</li>
                <li>**猜测**：你必须猜测对手的一张隐藏牌。指着它，说出一个数字。</li>
                <li>**结果**：
                  <ul className="list-disc pl-4 mt-1">
                    <li><span className="text-emerald-400">猜对了</span>：对手该牌被揭示。你可以选择**继续猜测**另一张（乘胜追击），或者**结束回合**（保护自己刚摸的牌不被公开）。</li>
                    <li><span className="text-red-400">猜错了</span>：你的回合结束。你刚摸到的那张牌必须**公开展示**给对手看（作为惩罚）。</li>
                  </ul>
                </li>
              </ol>
            </section>
          </div>

          <button 
            onClick={() => onComplete(false, false)}
            className="mt-8 w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all"
          >
            我明白了，开始游戏
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-8 shadow-2xl text-center">
        <h1 className="text-4xl font-bold text-amber-500 mb-2 brand-font">欢迎来到达芬奇密码</h1>
        <p className="text-slate-400 mb-8">一场关于逻辑、心理与概率的对决。</p>

        <div className="space-y-4">
          <button 
            onClick={() => onComplete(true, true)}
            className="w-full group flex items-center justify-between px-6 py-4 bg-slate-800 hover:bg-indigo-900/40 border border-slate-700 hover:border-indigo-500 rounded-xl transition-all"
          >
             <div className="text-left">
               <div className="font-bold text-white flex items-center gap-2">
                 <Shield size={18} className="text-indigo-400" /> 我是老手
               </div>
               <div className="text-xs text-slate-500 mt-1">跳过介绍，默认中级难度</div>
             </div>
             <SkipForward className="text-slate-600 group-hover:text-indigo-400" />
          </button>

          <button 
            onClick={() => onComplete(true, false)}
            className="w-full group flex items-center justify-between px-6 py-4 bg-slate-800 hover:bg-emerald-900/40 border border-slate-700 hover:border-emerald-500 rounded-xl transition-all"
          >
             <div className="text-left">
               <div className="font-bold text-white flex items-center gap-2">
                 <BookOpen size={18} className="text-emerald-400" /> 我已了解规则
               </div>
               <div className="text-xs text-slate-500 mt-1">直接开始，默认初级难度</div>
             </div>
             <SkipForward className="text-slate-600 group-hover:text-emerald-400" />
          </button>

          <button 
            onClick={() => setShowDetails(true)}
            className="w-full group flex items-center justify-between px-6 py-4 bg-slate-800 hover:bg-amber-900/40 border border-slate-700 hover:border-amber-500 rounded-xl transition-all"
          >
             <div className="text-left">
               <div className="font-bold text-white flex items-center gap-2">
                 <Info size={18} className="text-amber-400" /> 详细规则说明
               </div>
               <div className="text-xs text-slate-500 mt-1">适合新手小白</div>
             </div>
             <div className="text-slate-600 group-hover:text-amber-400">→</div>
          </button>
        </div>
      </div>
    </div>
  );
};
