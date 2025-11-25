export type TileColor = 'black' | 'white';

export interface Tile {
  id: string;
  color: TileColor;
  value: number; // -1 represents the "-" Joker tile
  sortValue: number; // Used for sorting. For normal tiles, equals value. For Joker, determined by placement.
  isRevealed: boolean;
  isNew: boolean; // True if it's the tile just drawn this turn (vulnerable)
}

export type PlayerType = 'player' | 'ai';

export interface GameState {
  playerHand: Tile[];
  aiHand: Tile[];
  deck: Tile[];
  turn: PlayerType;
  phase: 'setup' | 'draw' | 'placement' | 'guess' | 'decision' | 'gameover'; // Added 'placement'
  winner: PlayerType | null;
  logs: GameLogEntry[];
  lastGuessedTileId: string | null;
  pendingTile: Tile | null; // The tile waiting to be placed
}

export interface GameLogEntry {
  id: string;
  player: PlayerType;
  message: string;
  timestamp: number;
  type: 'info' | 'success' | 'failure' | 'chat';
}

export interface AiGuessResult {
  targetIndex: number;
  guessValue: number;
  reasoning: string;
  chatMessage: string;
}