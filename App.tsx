
import React, { useState, useEffect } from 'react';
import { 
  GameState, Tile, PlayerType, GameLogEntry, TileColor, Difficulty, AiProvider 
} from './types';
import { 
  createDeck, drawTile, sortHand, TOTAL_NUMBERS 
} from './utils/gameLogic';
import { getAiMove } from './services/aiService';
import { TileComponent } from './components/TileComponent';
import { GuessModal } from './components/GuessModal';
import { LogPanel } from './components/LogPanel';
import { SetupScreen } from './components/SetupScreen';
import { Brain, RotateCcw, Play, CheckCircle2, AlertCircle, HelpCircle, ArrowRightLeft, User, Bot, ArrowDown, Swords, EyeOff, Shield } from 'lucide-react';

const INITIAL_HAND_SIZE = 4;

const App: React.FC = () => {
  // --- State ---
  // Initial phase is now 'setup' before we even show the main menu
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  
  const [gameState, setGameState] = useState<GameState>({
    playerHand: [],
    aiHand: [],
    deck: [],
    turn: 'player',
    phase: 'setup',
    winner: null,
    logs: [],
    lastGuessedTileId: null,
    pendingTile: null,
    difficulty: 'medium',
    aiConfig: {
      provider: 'gemini',
      apiKey: ''
    }
  });

  const [guessModalOpen, setGuessModalOpen] = useState(false);
  const [targetTileIndex, setTargetTileIndex] = useState<number | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showTurnNotification, setShowTurnNotification] = useState<{player: PlayerType, show: boolean}>({ player: 'player', show: false });

  // --- Helper ---
  const getColorName = (color: TileColor) => color === 'black' ? '黑色' : '白色';

  // --- Actions ---

  const handleSetupComplete = (provider: AiProvider, apiKey: string) => {
    setGameState(prev => ({
      ...prev,
      aiConfig: { provider, apiKey }
    }));
    setIsSetupComplete(true);
  };

  const addLog = (player: PlayerType, message: string, type: GameLogEntry['type'] = 'info') => {
    setGameState(prev => ({
      ...prev,
      logs: [...prev.logs, {
        id: Math.random().toString(36).substr(2, 9),
        player,
        message,
        timestamp: Date.now(),
        type
      }]
    }));
  };

  const setDifficulty = (diff: Difficulty) => {
    setGameState(prev => ({ ...prev, difficulty: diff }));
  };

  const startGame = () => {
    const deck = createDeck();
    let playerHand: Tile[] = [];
    let aiHand: Tile[] = [];

    // Deal initial hands
    for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
      const pDraw = drawTile(deck);
      if (pDraw.tile) {
        if (pDraw.tile.value === -1) pDraw.tile.sortValue = 100 + i; 
        playerHand.push(pDraw.tile);
      }
      
      const aiDraw = drawTile(pDraw.newDeck);
      if (aiDraw.tile) {
        if (aiDraw.tile.value === -1) aiDraw.tile.sortValue = Math.random() * 12;
        aiHand.push(aiDraw.tile);
      }
      
      deck.splice(0, 2); 
    }

    const sortedPlayerHand = sortHand(playerHand);
    const sortedAiHand = sortHand(aiHand);
    const remainingDeck = deck; 

    setGameState(prev => ({
      ...prev,
      playerHand: sortedPlayerHand,
      aiHand: sortedAiHand,
      deck: remainingDeck,
      turn: 'player', 
      phase: 'draw',
      winner: null,
      logs: [],
      lastGuessedTileId: null,
      pendingTile: null
    }));
    
    addLog('player', `游戏开始。难度: ${gameState.difficulty === 'easy' ? '初级' : gameState.difficulty === 'medium' ? '中级' : '高级'}`, 'info');
    triggerTurnNotification('player');
  };

  const triggerTurnNotification = (player: PlayerType) => {
    setShowTurnNotification({ player, show: true });
    setTimeout(() => {
      setShowTurnNotification(prev => ({ ...prev, show: false }));
    }, 2000);
  };

  // --- Turn Management ---

  useEffect(() => {
    if (!isSetupComplete || gameState.phase === 'setup' || gameState.winner) return;

    const checkWin = () => {
      const playerLost = gameState.playerHand.every(t => t.isRevealed);
      const aiLost = gameState.aiHand.every(t => t.isRevealed);

      if (playerLost) {
        setGameState(prev => ({ ...prev, winner: 'ai', phase: 'gameover' }));
        addLog('ai', '你的秘密已全部暴露。我赢了。', 'failure');
      } else if (aiLost) {
        setGameState(prev => ({ ...prev, winner: 'player', phase: 'gameover' }));
        addLog('player', '你破解了所有谜题。你赢了！', 'success');
      }
    };

    checkWin();
    
    if (gameState.phase === 'draw' && !gameState.winner) {
      handleDrawPhase();
    }

    // AI Logic Trigger
    if (gameState.turn === 'ai' && !isAiThinking && !gameState.winner) {
      if (gameState.phase === 'guess') {
        // Initial mandatory guess
        makeAiMove(false);
      } else if (gameState.phase === 'decision') {
        // Optional follow-up guess
        makeAiMove(true);
      }
    }
  }, [gameState.phase, gameState.turn, gameState.winner, gameState.playerHand, gameState.aiHand, isSetupComplete]);


  const handleDrawPhase = () => {
    if (gameState.deck.length === 0) {
      addLog(gameState.turn, '牌堆已空。直接进入猜测阶段。', 'info');
      setGameState(prev => ({ ...prev, phase: 'guess' }));
      return;
    }

    const { tile, newDeck } = drawTile(gameState.deck);
    if (!tile) return;

    tile.isNew = true;

    if (gameState.turn === 'player') {
      if (tile.value === -1) {
        // Prompt is handled by the UI overlay in render
        setGameState(prev => ({
          ...prev,
          deck: newDeck,
          pendingTile: tile,
          phase: 'placement' 
        }));
      } else {
        addLog('player', `摸了一张 ${getColorName(tile.color)} 牌。`, 'info');
        setGameState(prev => {
          const newHand = sortHand([...prev.playerHand, tile]);
          return {
            ...prev,
            deck: newDeck,
            playerHand: newHand,
            phase: 'guess'
          };
        });
      }
    } else {
      // AI Turn
      if (tile.value === -1) {
        tile.sortValue = Math.random() * 12; 
      }
      addLog('ai', `对手摸了一张 ${getColorName(tile.color)} 牌。`, 'info');
      setGameState(prev => {
        const newHand = sortHand([...prev.aiHand, tile]);
        return {
          ...prev,
          deck: newDeck,
          aiHand: newHand,
          phase: 'guess'
        };
      });
    }
  };

  const handlePlacement = (index: number) => {
    const hand = gameState.playerHand;
    const tile = gameState.pendingTile;
    if (!tile) return;

    let newSortValue = 0;

    if (hand.length === 0) {
      newSortValue = 0;
    } else if (index === 0) {
      newSortValue = hand[0].sortValue - 1;
    } else if (index === hand.length) {
      newSortValue = hand[hand.length - 1].sortValue + 1;
    } else {
      const left = hand[index - 1].sortValue;
      const right = hand[index].sortValue;
      newSortValue = (left + right) / 2;
    }

    tile.sortValue = newSortValue;
    
    const newHand = sortHand([...hand, tile]);
    
    setGameState(prev => ({
      ...prev,
      playerHand: newHand,
      pendingTile: null,
      phase: 'guess'
    }));

    addLog('player', '放置了特殊牌。', 'info');
  };

  // --- Player Interactions ---

  const handleAiTileClick = (index: number) => {
    if (gameState.turn !== 'player' || gameState.phase !== 'guess' || gameState.winner) return;
    
    const tile = gameState.aiHand[index];
    if (tile.isRevealed) return;

    setTargetTileIndex(index);
    setGuessModalOpen(true);
  };

  const submitPlayerGuess = (value: number) => {
    setGuessModalOpen(false);
    if (targetTileIndex === null) return;

    const targetTile = gameState.aiHand[targetTileIndex];
    const isCorrect = targetTile.value === value;
    
    const guessDisplay = value === -1 ? '"-"' : value;

    addLog('player', `猜测位置 ${targetTileIndex + 1} 是 ${guessDisplay}...`, 'info');

    if (isCorrect) {
      handleCorrectGuess('player', targetTileIndex);
    } else {
      handleIncorrectGuess('player');
    }
  };

  const handleCorrectGuess = (guesser: PlayerType, targetIndex: number) => {
    addLog(guesser, '猜对了！', 'success');

    setGameState(prev => {
      const opponentHandKey = guesser === 'player' ? 'aiHand' : 'playerHand';
      const newOpponentHand = [...prev[opponentHandKey]];
      newOpponentHand[targetIndex] = { ...newOpponentHand[targetIndex], isRevealed: true };

      const myHandKey = guesser === 'player' ? 'playerHand' : 'aiHand';
      // When correct, the 'new' tile is no longer vulnerable if we choose to stop, 
      // but in 'decision' phase we might keep guessing. The 'isNew' status persists until endTurn.
      const myHand = prev[myHandKey]; 

      return {
        ...prev,
        [opponentHandKey]: newOpponentHand,
        [myHandKey]: myHand,
        phase: 'decision', 
        turn: guesser
      };
    });
  };

  const handleIncorrectGuess = (guesser: PlayerType) => {
    addLog(guesser, '猜错了！', 'failure');

    setGameState(prev => {
      const myHandKey = guesser === 'player' ? 'playerHand' : 'aiHand';
      const newTileIndex = prev[myHandKey].findIndex(t => t.isNew);
      
      let newHand = [...prev[myHandKey]];
      if (newTileIndex !== -1) {
        newHand[newTileIndex] = { ...newHand[newTileIndex], isRevealed: true, isNew: false };
        const val = newHand[newTileIndex].value;
        const valDisplay = val === -1 ? '"-"' : val;
        addLog(guesser, `惩罚：公开了我的 ${getColorName(newHand[newTileIndex].color)} 牌 ${valDisplay}。`, 'failure');
      }

      const nextTurn = guesser === 'player' ? 'ai' : 'player';
      
      // Trigger notification for next turn
      setTimeout(() => triggerTurnNotification(nextTurn), 500);

      return {
        ...prev,
        [myHandKey]: newHand,
        phase: 'draw',
        turn: nextTurn
      };
    });
  };

  const endTurn = () => {
    setGameState(prev => ({
      ...prev,
      playerHand: prev.playerHand.map(t => ({ ...t, isNew: false })),
      aiHand: prev.aiHand.map(t => ({ ...t, isNew: false })),
      turn: prev.turn === 'player' ? 'ai' : 'player',
      phase: 'draw'
    }));
    addLog('player', '结束回合。', 'info');
    triggerTurnNotification(gameState.turn === 'player' ? 'ai' : 'player');
  };

  // --- AI Logic ---

  const makeAiMove = async (canPass: boolean) => {
    setIsAiThinking(true);
    // Delay for realism
    await new Promise(resolve => setTimeout(resolve, canPass ? 2000 : 2500));

    // Snapshot logs for context
    const fullLogHistory = gameState.logs.map(l => {
      const prefix = l.player === 'ai' ? '[我/AI]' : '[对手/玩家]';
      return `${prefix}: ${l.message}`;
    });

    const move = await getAiMove(
      gameState.aiConfig.provider,
      gameState.aiConfig.apiKey,
      gameState.aiHand,
      gameState.playerHand,
      gameState.deck.length,
      fullLogHistory,
      canPass,
      gameState.difficulty
    );

    setIsAiThinking(false);

    if (move.chatMessage) {
      addLog('ai', move.chatMessage, 'chat');
    }

    // Check if AI decided to pass (stop guessing)
    if (canPass && move.targetIndex === -1) {
       addLog('ai', 'AI 决定结束回合。', 'info');
       setGameState(prev => ({
          ...prev,
          aiHand: prev.aiHand.map(t => ({ ...t, isNew: false })),
          turn: 'player',
          phase: 'draw'
       }));
       triggerTurnNotification('player');
       return;
    }

    // Validate Move
    if (move.targetIndex < 0 || move.targetIndex >= gameState.playerHand.length) {
       // Should theoretically not happen if AI is working correctly
       if (canPass) {
          // Treat invalid move as pass in decision phase
          addLog('ai', 'AI 决定结束回合。', 'info');
          setGameState(prev => ({ ...prev, turn: 'player', phase: 'draw' }));
          triggerTurnNotification('player');
          return;
       }
       addLog('ai', '困惑中失误了（无效位置）。回合结束。', 'failure');
       handleIncorrectGuess('ai');
       return;
    }

    const guessDisplay = move.guessValue === -1 ? '"-"' : move.guessValue;
    addLog('ai', `猜测你位置 ${move.targetIndex + 1} 的牌是 ${guessDisplay}。`, 'info');

    const targetTile = gameState.playerHand[move.targetIndex];
    if (targetTile.isRevealed) {
       addLog('ai', '愚蠢地猜了一张已经揭示的牌。', 'failure');
       handleIncorrectGuess('ai');
       return;
    }

    if (targetTile.value === move.guessValue) {
      // AI Guessed Correctly
      // handleCorrectGuess sets phase to 'decision' and turn to 'ai'
      // This will trigger the useEffect again, calling makeAiMove(true)
      handleCorrectGuess('ai', move.targetIndex);
    } else {
      handleIncorrectGuess('ai');
    }
  };


  // --- Render ---

  if (!isSetupComplete) {
    return <SetupScreen onStart={handleSetupComplete} />;
  }

  if (gameState.phase === 'setup') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
         <h1 className="text-5xl md:text-7xl text-amber-500 font-bold mb-4 text-center brand-font tracking-tighter drop-shadow-glow animate-slideDown">
            达芬奇密码
         </h1>
         <div className="max-w-md text-center text-slate-400 mb-8 space-y-4 animate-fadeIn">
           <p>与机器进行一场智慧的较量。</p>
           <p>在对手破解你的密码之前，推断出他们手牌中的隐藏数字。</p>
           
           <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl mt-6">
              <h3 className="text-white font-bold mb-4 flex items-center justify-center gap-2">
                <Shield size={18} className="text-indigo-400" /> 选择难度
              </h3>
              <div className="flex gap-3 justify-center">
                 {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                   <button
                     key={level}
                     onClick={() => setDifficulty(level)}
                     className={`
                       px-4 py-2 rounded-lg font-bold capitalize transition-all border-2
                       ${gameState.difficulty === level 
                         ? 'bg-amber-500 text-black border-amber-500 scale-105 shadow-md' 
                         : 'bg-slate-700 text-slate-400 border-slate-600 hover:border-slate-500'}
                     `}
                   >
                     {{easy: '初级', medium: '中级', hard: '高级'}[level]}
                   </button>
                 ))}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                {gameState.difficulty === 'easy' && "AI 比较保守，容易犹豫。"}
                {gameState.difficulty === 'medium' && "AI 逻辑严密，攻守平衡。"}
                {gameState.difficulty === 'hard' && "AI 极具侵略性，利用高级排除法。"}
              </p>
           </div>
         </div>

         <button 
           onClick={startGame}
           className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg transition-all hover:scale-105 flex items-center gap-3 mt-4 animate-pulse"
         >
           <Play size={24} fill="currentColor" /> 进入圣殿
         </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#1a1a1a] text-slate-200 flex flex-col md:flex-row overflow-hidden relative">
      
      {/* Turn Notification Overlay */}
      {showTurnNotification.show && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none animate-bounceIn">
           <div className={`
             flex flex-col items-center justify-center
             px-12 py-8 rounded-2xl shadow-2xl backdrop-blur-md border-2
             ${showTurnNotification.player === 'player' 
               ? 'bg-amber-900/80 border-amber-500 text-amber-100' 
               : 'bg-indigo-900/80 border-indigo-500 text-indigo-100'}
           `}>
             <Swords size={64} className="mb-4 animate-pulse" />
             <h2 className="text-4xl font-bold brand-font tracking-widest">
               {showTurnNotification.player === 'player' ? '你的回合' : 'AI 的回合'}
             </h2>
           </div>
        </div>
      )}

      {/* Sidebar / Log Panel */}
      <div className="order-2 md:order-2 w-full md:w-80 flex-shrink-0 z-20 shadow-xl bg-slate-900 flex flex-col h-1/3 md:h-full">
         <LogPanel logs={gameState.logs} />
      </div>

      {/* Main Game Area */}
      <div className="order-1 md:order-1 flex-1 flex flex-col relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black overflow-hidden">
        
        {/* Header */}
        <header className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20 pointer-events-none">
          <div className="brand-font text-amber-500/50 text-xl font-bold pointer-events-auto select-none">
            达芬奇密码 <span className="text-xs text-slate-600 ml-2 border border-slate-700 px-2 py-0.5 rounded-full">{{easy: '初级', medium: '中级', hard: '高级'}[gameState.difficulty]}</span>
          </div>
          <div className="flex items-center gap-4 pointer-events-auto">
             <div className="bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 text-sm font-mono text-slate-400">
               剩余牌数: {gameState.deck.length}
             </div>
             <button onClick={() => setShowRules(!showRules)} className="text-slate-500 hover:text-amber-500 transition-colors">
               <HelpCircle size={24} />
             </button>
          </div>
        </header>

        {/* Turn Indicator (Persistent) */}
        <div className="mt-16 md:mt-4 flex justify-center z-10">
           <div className={`
             flex items-center gap-3 px-6 py-2 rounded-full border shadow-lg backdrop-blur-sm transition-all duration-500
             ${gameState.turn === 'player' 
               ? 'bg-amber-900/40 border-amber-500/50 text-amber-100' 
               : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-100'}
           `}>
              {gameState.turn === 'player' ? <User size={18} /> : <Bot size={18} />}
              <span className="font-bold tracking-widest">
                {gameState.turn === 'player' ? '你的回合' : 'AI 回合'}
              </span>
           </div>
        </div>

        {/* Rules Modal Overlay */}
        {showRules && (
          <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-6" onClick={() => setShowRules(false)}>
             <div className="max-w-md text-slate-300 bg-slate-800 p-6 rounded-xl border border-slate-600 shadow-2xl">
                <h3 className="text-xl text-amber-500 font-bold mb-4">游戏法则</h3>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                   <li><strong className="text-white">目标:</strong> 揭示对手的所有手牌。</li>
                   <li><strong className="text-white">排序:</strong> 牌按 0-11 排序。</li>
                   <li><strong className="text-white">特殊牌 "-":</strong> 摸到时可自由插入手牌任意位置。</li>
                   <li><strong className="text-white">同值:</strong> 数字相同时，黑牌在左（小），白牌在右。</li>
                   <li><strong className="text-white">失败:</strong> 猜错必须公开刚摸到的牌。</li>
                   <li><strong className="text-white">奖励:</strong> 猜对可选择继续猜测或结束回合。</li>
                </ul>
                <p className="mt-4 text-center text-xs text-slate-500">点击任意处关闭</p>
             </div>
          </div>
        )}

        {/* Placement Phase Overlay */}
        {gameState.phase === 'placement' && gameState.pendingTile && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center animate-fadeIn p-4">
            
            <div className="mb-8 text-center animate-slideDown">
               <h2 className="text-3xl md:text-4xl font-bold text-amber-500 mb-3 brand-font drop-shadow-lg">
                 摸到了特殊牌 “-”
               </h2>
               <p className="text-slate-300 text-lg bg-black/40 px-6 py-2 rounded-full inline-block border border-slate-700 mb-2">
                 请点击下方的 <span className="text-amber-500 font-bold">↓</span> 箭头，将其插入到手牌的任意位置
               </p>
               <p className="flex items-center justify-center gap-2 text-indigo-400 text-sm font-semibold opacity-90">
                 <EyeOff size={16} /> 此操作对对手不可见 (AI 不会知道你放哪了)
               </p>
            </div>

            {/* The Pending Tile */}
            <div className="mb-10 p-6 bg-gradient-to-b from-amber-500/20 to-transparent rounded-full border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-float">
               <TileComponent tile={gameState.pendingTile} isHidden={false} />
            </div>

            {/* Insertion Zone */}
            <div className="flex items-center gap-0 overflow-x-auto p-8 max-w-full bg-slate-900/60 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-sm">
              
              {/* Insert Slot 0 */}
              <button 
                onClick={() => handlePlacement(0)} 
                className="group relative w-12 h-32 flex items-center justify-center mx-1 transition-all"
              >
                <div className="absolute inset-y-4 left-1/2 w-0.5 -translate-x-1/2 bg-slate-700 group-hover:bg-amber-500/50 transition-colors" />
                <div className="z-10 w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-600 group-hover:border-amber-500 group-hover:bg-amber-500 text-slate-400 group-hover:text-black flex items-center justify-center transition-all shadow-lg transform group-hover:scale-110">
                  <ArrowDown size={20} />
                </div>
              </button>

              {gameState.playerHand.map((tile, i) => (
                <React.Fragment key={tile.id}>
                  <div className="opacity-90 scale-100 hover:scale-105 transition-transform duration-300">
                    <TileComponent tile={tile} isHidden={false} />
                  </div>
                  {/* Insert Slot i+1 */}
                  <button 
                    onClick={() => handlePlacement(i + 1)} 
                    className="group relative w-12 h-32 flex items-center justify-center mx-1 transition-all"
                  >
                     <div className="absolute inset-y-4 left-1/2 w-0.5 -translate-x-1/2 bg-slate-700 group-hover:bg-amber-500/50 transition-colors" />
                     <div className="z-10 w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-600 group-hover:border-amber-500 group-hover:bg-amber-500 text-slate-400 group-hover:text-black flex items-center justify-center transition-all shadow-lg transform group-hover:scale-110">
                       <ArrowDown size={20} />
                     </div>
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState.winner && (
          <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center animate-fadeIn p-4">
             <div className="text-6xl mb-4">
               {gameState.winner === 'player' ? '🏆' : '💀'}
             </div>
             <h2 className={`text-4xl md:text-6xl font-bold mb-2 brand-font ${gameState.winner === 'player' ? 'text-amber-500' : 'text-red-600'}`}>
               {gameState.winner === 'player' ? '胜利' : '失败'}
             </h2>
             <p className="text-slate-400 text-lg mb-8">
               {gameState.winner === 'player' ? '你证明了自己的智慧。' : 'AI 智胜了你。'}
             </p>
             <button 
               onClick={startGame}
               className="bg-slate-200 text-black hover:bg-white font-bold py-3 px-8 rounded-full flex items-center gap-2 transition-transform hover:scale-105"
             >
               <RotateCcw size={20} /> 再玩一次
             </button>
          </div>
        )}

        {/* AI Hand Area (Top) */}
        <div className="flex-1 flex flex-col items-center justify-center relative p-4">
           {isAiThinking && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-black/60 px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-md border border-indigo-500/30 shadow-xl">
                <Brain className="animate-pulse text-indigo-400" size={24} />
                <span className="text-indigo-200 font-mono text-sm tracking-widest">
                   {gameState.phase === 'decision' ? 'AI 正在决策是否继续...' : 'AI 正在推理...'}
                </span>
             </div>
           )}
           
           <div className="flex gap-2 md:gap-4 perspective-1000">
             {gameState.aiHand.map((tile, index) => (
               <div key={tile.id} className="transition-all duration-500 flex flex-col items-center">
                  <TileComponent 
                    tile={tile} 
                    isHidden={!gameState.winner} 
                    isSelectable={gameState.turn === 'player' && gameState.phase === 'guess' && !tile.isRevealed}
                    onClick={() => handleAiTileClick(index)}
                  />
                  {/* Position Indicator */}
                  <div className="text-[10px] text-slate-600 mt-2 font-mono bg-slate-900/50 px-2 rounded-full">
                    {index + 1}
                  </div>
               </div>
             ))}
           </div>
        </div>

        {/* Center Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent my-2 md:my-0 flex items-center justify-center relative">
          <div className="absolute bg-slate-900 border border-slate-700 rounded-full p-1 text-slate-500">
             <ArrowRightLeft size={14} />
          </div>
        </div>

        {/* Player Hand Area (Bottom) */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/30 p-4 border-t border-slate-800 relative">
           
           <div className="flex gap-2 md:gap-4 mb-4">
             {gameState.playerHand.map((tile) => (
               <TileComponent 
                 key={tile.id} 
                 tile={tile} 
                 isHidden={false} 
                 isSelectable={false}
               />
             ))}
           </div>

           {/* Action Bar */}
           <div className="h-16 flex items-center justify-center w-full">
             {gameState.turn === 'player' && gameState.phase === 'decision' && (
                <div className="flex gap-4 animate-slideUp">
                   <button 
                     onClick={() => setGameState(prev => ({ ...prev, phase: 'guess' }))} 
                     className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2"
                   >
                     <CheckCircle2 size={18} /> 继续猜测
                   </button>
                   <button 
                     onClick={endTurn}
                     className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-6 py-2 rounded-lg font-bold shadow-lg"
                   >
                     结束回合
                   </button>
                </div>
             )}
             
             {gameState.turn === 'player' && gameState.phase === 'guess' && (
               <div className="text-amber-500 text-sm font-semibold animate-pulse flex items-center gap-2 bg-amber-900/20 px-4 py-2 rounded-lg border border-amber-900/50">
                 <AlertCircle size={16} /> 请点击对手的一张隐藏牌进行猜测
               </div>
             )}
              {gameState.turn === 'ai' && (
               <div className="text-slate-500 text-sm font-mono flex items-center gap-2">
                 <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                 等待 AI 行动...
               </div>
             )}
           </div>
        </div>

      </div>

      <GuessModal 
        isOpen={guessModalOpen}
        onClose={() => setGuessModalOpen(false)}
        onSubmit={submitPlayerGuess}
        targetIndex={targetTileIndex}
      />

    </div>
  );
};

export default App;
