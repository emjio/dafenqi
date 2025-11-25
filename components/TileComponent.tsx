import React from 'react';
import { Tile } from '../types';
import { Lock, Eye } from 'lucide-react';

interface TileProps {
  tile: Tile;
  isHidden: boolean; // If true, we don't show the number (unless revealed is true on the tile itself)
  onClick?: () => void;
  isSelectable?: boolean;
  isTarget?: boolean;
}

export const TileComponent: React.FC<TileProps> = ({ 
  tile, 
  isHidden, 
  onClick, 
  isSelectable,
  isTarget 
}) => {
  const showValue = tile.isRevealed || !isHidden;
  
  // Base styles
  const baseClasses = `
    relative flex flex-col items-center justify-center 
    w-12 h-16 md:w-16 md:h-24 rounded-lg shadow-xl transition-all duration-300 transform
    border-2
  `;

  // Color theme
  const colorClasses = tile.color === 'black' 
    ? 'bg-slate-900 border-slate-700 text-slate-100' 
    : 'bg-slate-200 border-slate-300 text-slate-900';

  // State modifiers
  const hoverClasses = isSelectable ? 'cursor-pointer hover:-translate-y-2 hover:shadow-2xl hover:border-amber-500' : '';
  const targetClasses = isTarget ? 'ring-4 ring-amber-500 -translate-y-2' : '';
  const revealedClasses = tile.isRevealed ? 'opacity-90' : '';
  const newClasses = tile.isNew && showValue ? 'ring-2 ring-emerald-500' : ''; 

  return (
    <div 
      onClick={isSelectable ? onClick : undefined}
      className={`${baseClasses} ${colorClasses} ${hoverClasses} ${targetClasses} ${revealedClasses} ${newClasses}`}
    >
      {showValue ? (
        <span className="text-2xl md:text-4xl font-bold font-serif select-none">
          {tile.value === -1 ? '-' : tile.value}
        </span>
      ) : (
        <Lock size={20} className="opacity-50" />
      )}

      {/* Status Indicators */}
      {tile.isNew && !tile.isRevealed && (
         <div className="absolute -top-2 -right-2 w-4 h-4 bg-emerald-500 rounded-full animate-pulse shadow-md border border-slate-900" title="刚摸的牌" />
      )}
      
      {tile.isRevealed && (
        <div className="absolute -bottom-3 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 z-10">
          <Eye size={10} />
          <span>明</span>
        </div>
      )}
      
      {/* Visual cue for 6 vs 9 if needed, decorative */}
      {(showValue && (tile.value === 6 || tile.value === 9)) && (
         <div className="absolute bottom-2 w-4 h-0.5 bg-current opacity-30"></div>
      )}
    </div>
  );
};
