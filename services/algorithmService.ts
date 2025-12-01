
import { Tile, AiGuessResult, Difficulty } from "../types";
import { TOTAL_NUMBERS } from "../utils/gameLogic";

// Helper: Extract previous wrong guesses from logs
const getInvalidGuessesForSlots = (logs: string[], playerHandSize: number): Set<string> => {
  const invalidSet = new Set<string>();
  // Matches: "猜测你位置 X 的牌是 Y" (Log format from App.tsx)
  // We need to parse the Chinese log format strictly
  const regex = /猜测你位置 (\d+) 的牌是 (-?\d+|"-")/;

  logs.forEach(log => {
    // Only care about AI's failed guesses or player's failed guesses? 
    // Actually, we only care about what *this* AI has already tried on the current configuration.
    // However, since logs are mixed, we look for lines where AI acted.
    // In App.tsx, the log is: addLog('ai', `猜测你位置 ${move.targetIndex + 1} 的牌是 ${guessDisplay}。`, 'info');
    // followed by '猜错了！' if it failed.
    // Simplifying: If the AI made a guess and it's NOT revealed in the current hand, it was wrong.
    
    const match = log.match(regex);
    if (match) {
      const pos = parseInt(match[1]) - 1; // 1-based in log to 0-based
      let valStr = match[2];
      const val = valStr === '"-"' || valStr === '-' ? -1 : parseInt(valStr);
      
      // key: "pos-val"
      invalidSet.add(`${pos}-${val}`);
    }
  });
  return invalidSet;
};

// Helper: Get numbers that are definitely NOT available (in AI hand or revealed in Player hand)
const getGlobalImpossibleNumbers = (aiHand: Tile[], playerHand: Tile[]): Set<number> => {
  const impossible = new Set<number>();
  
  // AI knows its own cards
  aiHand.forEach(t => {
    if (t.value !== -1) impossible.add(t.value);
  });

  // AI knows revealed player cards
  playerHand.forEach(t => {
    if (t.isRevealed && t.value !== -1) impossible.add(t.value);
  });

  return impossible;
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
  
  // Simulate thinking
  const thinkTime = difficulty === 'hard' ? 2000 : 1000;
  await new Promise(resolve => setTimeout(resolve, thinkTime));

  // --- Decision: Continue or Stop? ---
  if (canPass) {
    // Logic: If I have a "Sure Fire" guess available, continue. Otherwise stop.
    // For algorithm simplicity:
    let threshold = 0.5;
    if (difficulty === 'easy') threshold = 0.9; // Stop almost always
    if (difficulty === 'hard') threshold = 0.3; // Continue unless very risky

    if (Math.random() < threshold) {
      return {
        targetIndex: -1,
        guessValue: 0,
        reasoning: "保持优势，结束回合。",
        chatMessage: "不贪心，这局稳了。"
      };
    }
  }

  // --- Deduction Engine ---

  const hiddenIndices = playerHand.map((t, i) => t.isRevealed ? -1 : i).filter(i => i !== -1);
  if (hiddenIndices.length === 0) {
    return { targetIndex: -1, guessValue: 0, reasoning: "", chatMessage: "" };
  }

  const impossibleNumbers = getGlobalImpossibleNumbers(aiHand, playerHand);
  const invalidHistory = getInvalidGuessesForSlots(fullLogHistory, playerHand.length);
  
  // We will score each hidden slot based on how "narrow" the possibility range is.
  // Lower score = Better target (fewer possibilities).
  let bestTargetIndex = -1;
  let bestGuessValue = -1;
  let minPossibilities = 999;
  let bestReasoning = "";

  for (const targetIdx of hiddenIndices) {
    // 1. Find Left constraint
    let leftVal = -1;
    let leftDist = 0;
    for (let i = targetIdx - 1; i >= 0; i--) {
      leftDist++;
      if (playerHand[i].isRevealed && playerHand[i].value !== -1) {
        leftVal = playerHand[i].value;
        break;
      }
    }

    // 2. Find Right constraint
    let rightVal = TOTAL_NUMBERS; // 12
    let rightDist = 0;
    for (let i = targetIdx + 1; i < playerHand.length; i++) {
      rightDist++;
      if (playerHand[i].isRevealed && playerHand[i].value !== -1) {
        rightVal = playerHand[i].value;
        break;
      }
    }

    // 3. Generate Candidates based on "Distance Logic"
    // The card at targetIdx must be > leftVal (approx) and < rightVal (approx)
    // Strictly: (leftVal + leftDist) <= candidate <= (rightVal - rightDist)
    // BUT this assumes no Jokers in between.
    // Since Jokers exist, we relax the strict distance check but keep the bound check.
    
    const possibleValues: number[] = [];
    
    // Check standard numbers
    for (let v = 0; v < TOTAL_NUMBERS; v++) {
      if (impossibleNumbers.has(v)) continue; // Already seen
      if (invalidHistory.has(`${targetIdx}-${v}`)) continue; // Already guessed wrong
      
      // Basic Sort Rule: Must be larger than left neighbor, smaller than right neighbor
      if (v <= leftVal) continue;
      if (v >= rightVal) continue;

      // Advanced Distance Heuristic (Hard Mode Only)
      // If we assume NO jokers in the gap, then the value must scale with distance.
      // E.g. [2, ?, ?, 5]. The first ? cannot be 5. It must be at least 3. 
      // The second ? must be at least 4.
      // This is risky if there's a Joker, but statistically strong.
      if (difficulty === 'hard') {
         // Relaxed distance: Assume at least 1 step per slot?
         // Actually, let's just use the strict bound logic but fallback if empty.
         if (v < leftVal + leftDist) continue; 
         if (v > rightVal - rightDist) continue;
      }

      possibleValues.push(v);
    }

    // Always consider Joker (-1) unless we know all jokers
    // Check how many jokers are visible
    let visibleJokers = 0;
    aiHand.forEach(t => t.value === -1 && visibleJokers++);
    playerHand.forEach(t => t.isRevealed && t.value === -1 && visibleJokers++);
    
    if (visibleJokers < 2 && !invalidHistory.has(`${targetIdx}--1`)) {
       // Joker is a possibility
       // In logic, joker has low probability compared to a calculated number fit
       // We add it, but maybe treat it separately or add to list
       if (difficulty !== 'easy') {
          // In hard mode, only guess Joker if numbers are tight or empty
          if (possibleValues.length === 0) possibleValues.push(-1);
          else if (Math.random() > 0.8) possibleValues.push(-1); // Small chance to suspect Joker
       } else {
          possibleValues.push(-1);
       }
    }

    // 4. Evaluate this slot
    if (possibleValues.length > 0 && possibleValues.length < minPossibilities) {
      minPossibilities = possibleValues.length;
      bestTargetIndex = targetIdx;
      // Pick the median value for "safest" bet in a range, or random
      const mid = Math.floor(possibleValues.length / 2);
      bestGuessValue = possibleValues[mid];
      
      if (bestGuessValue === -1) {
        bestReasoning = "排除所有数字可能，这里一定是特殊牌。";
      } else {
         bestReasoning = `根据左右邻居（${leftVal === -1 ? '开头' : leftVal} 和 ${rightVal === 12 ? '结尾' : rightVal}），数字被锁定在极小范围。`;
      }
    }
  }

  // --- Fallback if no logical deduction found ---
  if (bestTargetIndex === -1) {
    // Pick random hidden slot
    bestTargetIndex = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
    // Pick random valid number
    let randomVal = Math.floor(Math.random() * TOTAL_NUMBERS);
    while (impossibleNumbers.has(randomVal) || invalidHistory.has(`${bestTargetIndex}-${randomVal}`)) {
       randomVal = (randomVal + 1) % TOTAL_NUMBERS;
       // Safety break?
       if (Math.random() < 0.05) break; 
    }
    bestGuessValue = randomVal;
    bestReasoning = "现有线索不足，进行概率试探。";
  }

  const chats = [
    "这一步完全在计算之中。",
    "你的排序习惯我已经掌握了。",
    "排除法是不会骗人的。",
    "别紧张，只是个数字游戏。",
    "我看透了你的布局。"
  ];

  return {
    targetIndex: bestTargetIndex,
    guessValue: bestGuessValue,
    reasoning: bestReasoning,
    chatMessage: chats[Math.floor(Math.random() * chats.length)]
  };
};
