
import { Tile, AiGuessResult, Difficulty, AiProvider } from "../types";
import { getGeminiMove } from "./geminiService";
import { getOpenAiMove } from "./openaiService";
import { TOTAL_NUMBERS } from "../utils/gameLogic";

// Define the common interface signature
type AiMoveFunction = (
  apiKey: string,
  aiHand: Tile[],
  playerHand: Tile[],
  deckSize: number,
  fullLogHistory: string[],
  canPass: boolean,
  difficulty: Difficulty
) => Promise<AiGuessResult>;

// Central service to dispatch to the correct provider
export const getAiMove = async (
  provider: AiProvider,
  apiKey: string,
  aiHand: Tile[],
  playerHand: Tile[],
  deckSize: number,
  fullLogHistory: string[],
  canPass: boolean,
  difficulty: Difficulty
): Promise<AiGuessResult> => {
  
  let moveStrategy: AiMoveFunction;

  switch (provider) {
    case 'gemini':
      moveStrategy = getGeminiMove;
      break;
    case 'openai':
      moveStrategy = getOpenAiMove;
      break;
    default:
      moveStrategy = getGeminiMove;
  }

  try {
    return await moveStrategy(apiKey, aiHand, playerHand, deckSize, fullLogHistory, canPass, difficulty);
  } catch (error) {
    console.error(`AI Service Error (${provider}):`, error);
    return getFallbackMove(playerHand, canPass);
  }
};

// Robust fallback logic in case of API failure
const getFallbackMove = (playerHand: Tile[], canPass: boolean): AiGuessResult => {
    if (canPass) {
       return {
          targetIndex: -1,
          guessValue: 0,
          reasoning: "AI连接中断，选择稳妥结束。",
          chatMessage: "信号不好，但这局我记下了。"
       };
    }

    const hiddenIndices = playerHand.map((t, i) => t.isRevealed ? -1 : i).filter(i => i !== -1);
    const targetIdx = hiddenIndices.length > 0 ? hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)] : 0;
    
    // Random guess
    let randomGuess = Math.floor(Math.random() * TOTAL_NUMBERS);
    if (Math.random() > 0.9) randomGuess = -1; 

    return {
      targetIndex: targetIdx,
      guessValue: randomGuess,
      reasoning: "（系统故障，盲猜模式）直觉告诉我...",
      chatMessage: "无论发生什么，游戏必须继续。"
    };
};
