import { GoogleGenAI, Type } from "@google/genai";
import { Tile, AiGuessResult, Difficulty } from "../types";
import { TOTAL_NUMBERS } from "../utils/gameLogic";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getAiMove = async (
  aiHand: Tile[],
  playerHand: Tile[],
  deckSize: number,
  fullLogHistory: string[],
  canPass: boolean = false,
  difficulty: Difficulty = 'medium'
): Promise<AiGuessResult> => {

  const aiHandDescription = aiHand.map(t => `${t.value === -1 ? '-' : t.value}${t.color === 'black' ? '黑' : '白'}`).join(', ');
  
  const playerHandPublic = playerHand.map((t, index) => {
    if (t.isRevealed) {
      return `[索引 ${index}: ${t.value === -1 ? '-' : t.value}${t.color === 'black' ? '黑' : '白'}(已揭示)]`;
    } else {
      return `[索引 ${index}: ??? ${t.color === 'black' ? '黑' : '白'}(隐藏)]`;
    }
  }).join(', ');

  const relevantHistory = fullLogHistory.slice(-15).join('\n');

  let strategyPrompt = "";
  if (difficulty === 'easy') {
    strategyPrompt = `
    **策略提示 (初级难度):**
    - 你是一个初学者。采取**非常保守**的策略。
    - 即使你有线索，也不要过于自信。
    - 偶尔可以在聊天中表现出不确定或困惑。
    - 如果你之前猜对了 (canPass=true)，大概率选择停止猜测 (targetIndex: -1)，除非剩下的非常明显。
    `;
  } else if (difficulty === 'medium') {
    strategyPrompt = `
    **策略提示 (中级难度):**
    - 你是一个熟练的玩家。采取**平衡**的策略。
    - 逻辑严密，通过排除法猜测。
    - 如果你之前猜对了，根据剩余牌的概率决定是否继续。如果有50%以上把握才继续。
    `;
  } else {
    strategyPrompt = `
    **策略提示 (高级难度):**
    - 你是一个顶尖高手。采取**非常激进**的策略。
    - 必须利用高级逻辑排除法（例如：根据排序规则，左边是3右边是5，中间只能是4或-）。
    - 必须记住之前所有回合的信息。
    - 如果你之前猜对了 (canPass=true)，只要不是完全盲猜，**尽量选择继续猜测**来压制对手。
    - 在聊天中表现出压迫感和自信。
    `;
  }

  const prompt = `
    你正在玩“达芬奇密码”逻辑游戏（也称为 Coda）。
    
    **游戏规则:**
    1. 牌有黑色和白色。普通数字范围 0-${TOTAL_NUMBERS - 1}。
    2. **特殊规则**: 存在一张特殊牌 "-" (短横线)，值为 -1。
    3. **排序**: 普通手牌必须按升序排列。若数字相同，黑牌在左。
    4. **"-"牌规则**: 它可以放在手牌的**任何位置**，不受数字大小限制。当对手有 "-" 牌时，它可能出现在 0 之前，最大数之后，或任意两数之间。
    5. 你需要推断并猜测对手（玩家）某张隐藏牌的数字。
    
    ${strategyPrompt}
    
    **当前状态:**
    - 你的手牌 (私有): ${aiHandDescription}
    - 对手的手牌 (公开): ${playerHandPublic}
    - 牌堆剩余: ${deckSize}张
    - 是否允许结束回合: ${canPass ? '是 (你可以选择停止猜测)' : '否 (这是回合第一猜，必须猜测)'}
    
    **游戏记录:**
    ${relevantHistory}

    **任务:**
    ${canPass 
      ? '你刚刚猜对了。你可以继续猜测另一张隐藏牌，或者选择结束回合。如果想结束回合，请返回 targetIndex: -1。' 
      : '选择对手一张 **隐藏 (???)** 的牌进行猜测。'
    }
    
    你需要输出 JSON 格式:
    - targetIndex: 对手手牌的数组索引 (0 based)。如果决定结束回合，请填 -1。
    - guessValue: 猜测的数字 (0-11) 或 -1 (代表 "-")。如果结束回合，请填 0。
    - reasoning: 你的推理过程 (简短的中文)。
    - chatMessage: 一句简短的中文挑衅或评论。

    **输出 JSON Schema:**
    {
      "targetIndex": number,
      "guessValue": number,
      "reasoning": string,
      "chatMessage": string
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetIndex: { type: Type.INTEGER },
            guessValue: { type: Type.INTEGER },
            reasoning: { type: Type.STRING },
            chatMessage: { type: Type.STRING }
          },
          required: ['targetIndex', 'guessValue', 'reasoning', 'chatMessage']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    return JSON.parse(text) as AiGuessResult;

  } catch (error) {
    console.error("AI Move Error:", error);
    
    // Fallback logic
    if (canPass) {
       return {
          targetIndex: -1,
          guessValue: 0,
          reasoning: "AI连接不稳定，选择稳妥结束。",
          chatMessage: "这次就先放过你。"
       };
    }

    const hiddenIndices = playerHand.map((t, i) => t.isRevealed ? -1 : i).filter(i => i !== -1);
    const targetIdx = hiddenIndices.length > 0 ? hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)] : 0;
    
    // Random guess including -1
    let randomGuess = Math.floor(Math.random() * TOTAL_NUMBERS);
    if (Math.random() > 0.9) randomGuess = -1; 

    return {
      targetIndex: targetIdx,
      guessValue: randomGuess,
      reasoning: "（AI连接不稳定，盲猜）这可能是关键一步。",
      chatMessage: "我看穿了你的伪装...大概。"
    };
  }
};