
import { Tile, AiGuessResult, Difficulty, TileColor } from "../types";
import { TOTAL_NUMBERS } from "../utils/gameLogic";

// --- Types ---
type CandidateSet = Set<number>; // -1 for Joker, 0-11 for numbers

interface SlotConstraint {
  index: number;
  color: TileColor;
  isRevealed: boolean;
  value: number; // -1 if hidden (or if it is a revealed joker, value is -1)
  candidates: CandidateSet;
}

// --- Helpers ---

// Extract previous wrong guesses from logs specific to this game state
// Note: This is a simplified memory. Ideally, the AI should track this internally in state, 
// but parsing logs works for this stateless service function.
const getInvalidGuessesForSlots = (logs: string[], playerHandSize: number): Set<string> => {
  const invalidSet = new Set<string>();
  const regex = /猜测你位置 (\d+) 的牌是 (-?\d+|"-")/;

  // We iterate backwards to find the last "Draw" or "Turn Start" to ensure we don't count guesses from previous games?
  // Actually, for the current match, history is valid.
  // But if the player hand changed size (someone won/lost?), indices might shift?
  // In Coda/Davinci, hand size grows. Indices are stable for existing cards.
  // New cards are added. 
  // However, simple parsing is usually enough for the current "Stateless AI" context.
  
  logs.forEach(log => {
    const match = log.match(regex);
    if (match) {
      // Check if this guess resulted in a failure.
      // The log lines are sequential. 
      // If we see "猜测... X" then later "猜对了", that guess was valid (but now revealed).
      // If "猜错了", it was invalid.
      // Since we filter out revealed cards later, we mainly care about WRONG guesses on HIDDEN cards.
      // We assume the service provides logs.
      // For simplicity here: If it's in the log as a guess, and the card is STILL hidden, 
      // it implies it was either wrong OR it was right but we are in the "continue" phase (unlikely to guess same index).
      // Actually, standardizing: Treat any guess on a currently hidden card found in logs as "Tried and Failed" (or "Already Known").
      // Since we don't want to guess it again regardless.
      
      const pos = parseInt(match[1]) - 1;
      let valStr = match[2];
      const val = valStr === '"-"' || valStr === '-' ? -1 : parseInt(valStr);
      invalidSet.add(`${pos}-${val}`);
    }
  });
  return invalidSet;
};

const getGlobalImpossibleNumbers = (aiHand: Tile[], playerHand: Tile[]): Set<number> => {
  const impossible = new Set<number>();
  aiHand.forEach(t => { if (t.value !== -1) impossible.add(t.value); });
  playerHand.forEach(t => { if (t.isRevealed && t.value !== -1) impossible.add(t.value); });
  return impossible;
};

// Check if `next` can come after `prev` given their colors
const isValidSequence = (prevVal: number, prevColor: TileColor, nextVal: number, nextColor: TileColor): boolean => {
  // Joker checks
  if (prevVal === -1 || nextVal === -1) return true;

  // Sorting Rule: Small -> Large
  if (nextVal < prevVal) return false;

  // Tie-breaker: If values equal, Black must be Left
  if (prevVal === nextVal) {
    // Valid: Black -> White
    // Invalid: White -> Black
    if (prevColor === 'white' && nextColor === 'black') return false;
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
  
  // Simulate thinking delay
  const thinkTime = difficulty === 'hard' ? 1500 : 1000;
  await new Promise(resolve => setTimeout(resolve, thinkTime));

  // --- 1. Decision to Pass ---
  if (canPass) {
    // If aggressive (Hard), rarely pass. If Easy, pass often.
    const passChance = difficulty === 'easy' ? 0.8 : (difficulty === 'medium' ? 0.5 : 0.2);
    if (Math.random() < passChance) {
      return {
        targetIndex: -1,
        guessValue: 0,
        reasoning: "见好就收，保持优势。",
        chatMessage: "这次先放过你。"
      };
    }
  }

  // --- 2. Initialize Slots & Candidates ---
  const impossibleNumbers = getGlobalImpossibleNumbers(aiHand, playerHand);
  const invalidHistory = getInvalidGuessesForSlots(fullLogHistory, playerHand.length);
  
  const slots: SlotConstraint[] = playerHand.map((t, i) => {
    const candidates = new Set<number>();
    
    if (t.isRevealed) {
      // If revealed, it only has one value.
      candidates.add(t.value);
    } else {
      // If hidden, init with all valid numbers + Joker
      for (let v = 0; v < TOTAL_NUMBERS; v++) {
        if (!impossibleNumbers.has(v) && !invalidHistory.has(`${i}-${v}`)) {
          candidates.add(v);
        }
      }
      // Check Joker validity
      if (!invalidHistory.has(`${i}--1`)) {
        // Can we rule out Joker based on global count?
        let visibleJokers = 0;
        aiHand.forEach(card => card.value === -1 && visibleJokers++);
        playerHand.forEach(card => card.isRevealed && card.value === -1 && visibleJokers++);
        if (visibleJokers < 2) {
          candidates.add(-1);
        }
      }
    }

    return {
      index: i,
      color: t.color,
      isRevealed: t.isRevealed,
      value: t.isRevealed ? t.value : -1, // -1 placeholder for hidden
      candidates
    };
  });

  // --- 3. Constraint Propagation Loop ---
  // We keep filtering candidates until no changes occur
  let changed = true;
  let loops = 0;
  
  while (changed && loops < 10) {
    changed = false;
    loops++;

    for (let i = 0; i < slots.length; i++) {
      const current = slots[i];
      if (current.candidates.size === 0) continue; // Should not happen ideally

      const originalSize = current.candidates.size;
      const newCandidates = new Set<number>();

      // Filter based on Left Neighbor
      const left = i > 0 ? slots[i - 1] : null;
      // Filter based on Right Neighbor
      const right = i < slots.length - 1 ? slots[i + 1] : null;

      for (const val of current.candidates) {
        let validLeft = true;
        let validRight = true;

        // Check if there is AT LEAST ONE valid value in the left neighbor
        if (left) {
          let hasCompatibleLeft = false;
          for (const lVal of left.candidates) {
            if (isValidSequence(lVal, left.color, val, current.color)) {
              hasCompatibleLeft = true;
              break;
            }
          }
          if (!hasCompatibleLeft) validLeft = false;
        }

        // Check if there is AT LEAST ONE valid value in the right neighbor
        if (right) {
          let hasCompatibleRight = false;
          for (const rVal of right.candidates) {
            if (isValidSequence(val, current.color, rVal, right.color)) {
              hasCompatibleRight = true;
              break;
            }
          }
          if (!hasCompatibleRight) validRight = false;
        }

        if (validLeft && validRight) {
          newCandidates.add(val);
        }
      }

      // Update candidates
      if (newCandidates.size < originalSize) {
        current.candidates = newCandidates;
        changed = true;
      }
    }
  }

  // --- 4. Select Best Move ---
  let bestTarget = -1;
  let bestGuess = -1;
  let minCandidates = 999;
  let bestReasoning = "";

  const hiddenSlots = slots.filter(s => !s.isRevealed);
  
  if (hiddenSlots.length === 0) {
     return { targetIndex: -1, guessValue: 0, reasoning: "Error", chatMessage: "Err" };
  }

  // Find the slot with the fewest possibilities
  for (const slot of hiddenSlots) {
    if (slot.candidates.size > 0 && slot.candidates.size < minCandidates) {
      minCandidates = slot.candidates.size;
      bestTarget = slot.index;
      
      // Heuristic: Pick the value closest to the median of candidates
      const sorted = Array.from(slot.candidates).sort((a,b) => a - b);
      bestGuess = sorted[Math.floor(sorted.length / 2)];
      
      const prob = Math.round((1 / slot.candidates.size) * 100);
      bestReasoning = `经过多重逻辑排除，该位置只有 ${slot.candidates.size} 种可能性（${Array.from(slot.candidates).map(v=>v===-1?'-':v).join(',')}），命中率约 ${prob}%。`;
    }
  }

  // If constraint solver failed (contradiction or logic bug), fallback to random
  if (bestTarget === -1) {
    const randomSlot = hiddenSlots[Math.floor(Math.random() * hiddenSlots.length)];
    bestTarget = randomSlot.index;
    
    // Pick a safe random number not in impossible list
    let attempts = 0;
    do {
      bestGuess = Math.floor(Math.random() * TOTAL_NUMBERS);
      if (Math.random() > 0.8) bestGuess = -1;
      attempts++;
    } while ((impossibleNumbers.has(bestGuess) || invalidHistory.has(`${bestTarget}-${bestGuess}`)) && attempts < 20);
    
    bestReasoning = "逻辑链断裂，只能依直觉行事。";
  }

  const chats = [
    "如果你以为能骗过我的算法...",
    "数据是不会撒谎的。",
    "你的手牌已经暴露了。",
    "正在计算最优解...完成。",
    "这步棋在预料之中。"
  ];

  return {
    targetIndex: bestTarget,
    guessValue: bestGuess,
    reasoning: bestReasoning,
    chatMessage: chats[Math.floor(Math.random() * chats.length)]
  };
};
