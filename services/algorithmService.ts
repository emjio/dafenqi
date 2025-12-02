
import { Tile, AiGuessResult, Difficulty, TileColor } from "../types";
import { TOTAL_NUMBERS } from "../utils/gameLogic";

// --- Types ---
type CandidateSet = Set<number>; // -1 for Joker, 0-11 for numbers

interface SlotState {
  index: number;
  color: TileColor;
  isRevealed: boolean;
  value: number; // -1 if hidden (or if it is a revealed joker, value is -1)
  candidates: CandidateSet;
}

// --- Helpers ---

// Parses the logs to find which values have already been guessed for specific slots and failed.
const getInvalidGuesses = (logs: string[]): Map<number, Set<number>> => {
  const invalidMap = new Map<number, Set<number>>();
  
  for (let i = 0; i < logs.length - 1; i++) {
    const log = logs[i];
    const nextLog = logs[i+1];

    // Check if it's an AI guess or Player guess? 
    // We only care about AI's previous attempts to avoid repeating mistakes.
    const guessMatch = log.match(/猜测你位置 (\d+) 的牌是 (-?\d+|"-")/);
    
    if (guessMatch) {
      const slotIndex = parseInt(guessMatch[1]) - 1; // 1-based in text, 0-based in logic
      let valStr = guessMatch[2];
      const val = valStr === '"-"' || valStr === '-' ? -1 : parseInt(valStr);

      // Check result in next line
      if (nextLog.includes("猜错了")) {
         if (!invalidMap.has(slotIndex)) {
           invalidMap.set(slotIndex, new Set());
         }
         invalidMap.get(slotIndex)?.add(val);
      }
    }
  }
  return invalidMap;
};

// Returns a Set of values that are definitely NOT available (because they are in AI hand or Revealed on table)
const getUnavailableNumbers = (aiHand: Tile[], playerHand: Tile[]): Set<number> => {
  const unavailable = new Set<number>();
  
  // AI's own hand
  aiHand.forEach(t => { 
    if (t.value !== -1) unavailable.add(t.value); 
  });
  
  // Revealed cards on the table (Player's)
  playerHand.forEach(t => { 
    if (t.isRevealed && t.value !== -1) unavailable.add(t.value); 
  });

  return unavailable;
};

// Core Logic: Is it possible for `val` to exist in `currentSlot` given `neighborVal` in `neighborSlot`?
const isCompatible = (
  val: number, 
  color: TileColor, 
  neighborVal: number, 
  neighborColor: TileColor, 
  direction: 'left' | 'right'
): boolean => {
  // If either is a Joker, they don't constrain each other numerically
  if (val === -1 || neighborVal === -1) return true;

  if (direction === 'left') {
    // neighbor must be <= val
    if (neighborVal > val) return false;
    // Tie-breaker: If numbers equal, Black is Left.
    if (neighborVal === val) {
      if (neighborColor === 'white' && color === 'black') return false; // White cannot be left of Black
      if (neighborColor === color) return false; 
    }
  } else {
    // direction === 'right'
    // neighbor must be >= val
    if (neighborVal < val) return false;
    if (neighborVal === val) {
      if (color === 'white' && neighborColor === 'black') return false; 
      if (color === neighborColor) return false;
    }
  }
  return true;
};

export const getAlgorithmMove = async (
  apiKey: string,
  aiHand: Tile[],
  playerHand: Tile[],
  deckSize: number,
  fullLogHistory: string[],
  canPass: boolean,
  difficulty: Difficulty
): Promise<AiGuessResult> => {
  
  // 1. Simulation Delay
  const delay = difficulty === 'hard' ? 1000 : 1500;
  await new Promise(resolve => setTimeout(resolve, delay));

  // 2. Decision to Pass
  if (canPass) {
    const threshold = difficulty === 'hard' ? 0.15 : (difficulty === 'medium' ? 0.4 : 0.7);
    if (Math.random() < threshold) {
      return {
        targetIndex: -1,
        guessValue: 0,
        reasoning: "保持现有优势，过回合。",
        chatMessage: "这回合先放过你。"
      };
    }
  }

  // 3. Setup Candidates
  const unavailableNumbers = getUnavailableNumbers(aiHand, playerHand);
  const invalidGuesses = getInvalidGuesses(fullLogHistory);

  // Initialize slots
  const slots: SlotState[] = playerHand.map((t, index) => {
    if (t.isRevealed) {
      return {
        index,
        color: t.color,
        isRevealed: true,
        value: t.value,
        candidates: new Set([t.value])
      };
    } else {
      const candidates = new Set<number>();
      // Add Numbers 0-11
      for (let i = 0; i < TOTAL_NUMBERS; i++) {
        if (!unavailableNumbers.has(i)) {
          const wrongForThisSlot = invalidGuesses.get(index);
          if (!wrongForThisSlot || !wrongForThisSlot.has(i)) {
            candidates.add(i);
          }
        }
      }
      
      // Add Joker -1
      let visibleJokers = 0;
      aiHand.forEach(c => c.value === -1 && visibleJokers++);
      playerHand.forEach(c => c.isRevealed && c.value === -1 && visibleJokers++);
      
      if (visibleJokers < 2) {
         const wrongForThisSlot = invalidGuesses.get(index);
         if (!wrongForThisSlot || !wrongForThisSlot.has(-1)) {
            candidates.add(-1);
         }
      }

      return {
        index,
        color: t.color,
        isRevealed: false,
        value: -1,
        candidates
      };
    }
  });

  // 4. Constraint Propagation
  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = 20;

  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;

    for (let i = 0; i < slots.length; i++) {
      const current = slots[i];
      if (current.candidates.size === 0) continue; 

      const candidatesToRemove: number[] = [];

      for (const val of current.candidates) {
        // Check Left Neighbor
        if (i > 0) {
          const left = slots[i - 1];
          let possibleLeft = false;
          for (const lVal of left.candidates) {
            if (isCompatible(val, current.color, lVal, left.color, 'left')) {
              possibleLeft = true;
              break;
            }
          }
          if (!possibleLeft) {
            candidatesToRemove.push(val);
            continue; 
          }
        }

        // Check Right Neighbor
        if (i < slots.length - 1) {
          const right = slots[i + 1];
          let possibleRight = false;
          for (const rVal of right.candidates) {
            if (isCompatible(val, current.color, rVal, right.color, 'right')) {
              possibleRight = true;
              break;
            }
          }
          if (!possibleRight) {
            candidatesToRemove.push(val);
            continue;
          }
        }
      }

      if (candidatesToRemove.length > 0) {
        candidatesToRemove.forEach(v => current.candidates.delete(v));
        changed = true;
      }
    }
  }

  // 5. Select Best Guess
  const targetSlots = slots.filter(s => !s.isRevealed);
  
  if (targetSlots.length === 0) {
    return { targetIndex: -1, guessValue: 0, reasoning: "Error", chatMessage: "Error" };
  }

  // Sort by number of candidates (Ascending)
  targetSlots.sort((a, b) => a.candidates.size - b.candidates.size);

  const bestSlot = targetSlots[0];
  let guessValue = 0;
  
  // Filter out any candidates that might have slipped through (e.g. became revealed during iteration or calculation)
  // And ensure we don't pick something revealed.
  const candidatesArray = Array.from(bestSlot.candidates).filter(v => {
      // Logic for Joker is complex, but normal numbers should not be in unavailable
      if (v !== -1 && unavailableNumbers.has(v)) return false;
      return true;
  });
  
  if (candidatesArray.length === 0) {
    // Fallback: This happens if constraints were too tight (e.g. player bluffed joker placement or logic edge case)
    // We pick a random valid number that is NOT in unavailable
    const all = Array.from({length: TOTAL_NUMBERS}, (_, i) => i);
    // Add joker if available
    let visibleJokers = 0;
    aiHand.forEach(c => c.value === -1 && visibleJokers++);
    playerHand.forEach(c => c.isRevealed && c.value === -1 && visibleJokers++);
    if (visibleJokers < 2) all.push(-1);

    const validRandoms = all.filter(n => {
       if (n === -1) return true;
       return !unavailableNumbers.has(n);
    });

    guessValue = validRandoms[Math.floor(Math.random() * validRandoms.length)];
    if (guessValue === undefined) guessValue = 0; // Worst case safety
  } else {
    guessValue = candidatesArray[Math.floor(Math.random() * candidatesArray.length)];
  }

  const certainty = candidatesArray.length <= 1 ? 100 : Math.round((1 / candidatesArray.length) * 100);
  
  let chat = "正在分析...";
  if (certainty === 100) chat = "这张牌已经无处可藏了。";
  else if (certainty > 50) chat = "我有相当大的把握。";
  else chat = "让我们测试一下这个理论。";

  // Construct reasoning text
  const cStr = candidatesArray.map(c => c === -1 ? '-' : c).join(',');
  const reasoning = `位置 ${bestSlot.index + 1} (${bestSlot.color === 'black' ? '黑' : '白'}) 的可能性: [${cStr}]。命中率: ${certainty}%`;

  return {
    targetIndex: bestSlot.index,
    guessValue: guessValue,
    reasoning: reasoning,
    chatMessage: chat
  };
};
