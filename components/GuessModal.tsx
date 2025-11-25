import React, { useState } from 'react';
import { TOTAL_NUMBERS } from '../utils/gameLogic';
import { X } from 'lucide-react';

interface GuessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: number) => void;
  targetIndex: number | null;
}

export const GuessModal: React.FC<GuessModalProps> = ({ isOpen, onClose, onSubmit, targetIndex }) => {
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  if (!isOpen) return null;

  const numbers = Array.from({ length: TOTAL_NUMBERS }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all">
        <div className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-700">
          <h3 className="text-xl font-bold text-amber-500 brand-font">破解密码</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-slate-300 mb-6 text-center text-lg">
            对手在位置 <span className="font-bold text-white text-2xl mx-1">#{targetIndex !== null ? targetIndex + 1 : '?'}</span> 的牌是数字几？
          </p>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-6">
            {/* Special Joker Option */}
            <button
              onClick={() => setSelectedValue(-1)}
              className={`
                h-12 rounded-lg font-bold text-xl transition-all border-2
                ${selectedValue === -1 
                  ? 'bg-amber-500 text-black border-amber-500 scale-105 shadow-lg' 
                  : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-400 hover:text-white'}
              `}
            >
              -
            </button>

            {numbers.map((num) => (
              <button
                key={num}
                onClick={() => setSelectedValue(num)}
                className={`
                  h-12 rounded-lg font-bold text-xl transition-all
                  ${selectedValue === num 
                    ? 'bg-amber-500 text-black scale-105 shadow-lg shadow-amber-500/20' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'}
                `}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors font-semibold"
            >
              取消
            </button>
            <button 
              disabled={selectedValue === null}
              onClick={() => selectedValue !== null && onSubmit(selectedValue)}
              className={`
                px-6 py-2 rounded-lg font-bold text-black transition-all
                ${selectedValue !== null 
                  ? 'bg-amber-500 hover:bg-amber-400 hover:scale-105 shadow-lg' 
                  : 'bg-slate-600 cursor-not-allowed opacity-50'}
              `}
            >
              确认猜测
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};