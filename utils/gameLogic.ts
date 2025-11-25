import { Tile, TileColor } from '../types';

export const TOTAL_NUMBERS = 12; // 0-11

export const createDeck = (): Tile[] => {
  const deck: Tile[] = [];
  
  // Normal 0-11
  for (let i = 0; i < TOTAL_NUMBERS; i++) {
    deck.push({
      id: `b-${i}`,
      color: 'black',
      value: i,
      sortValue: i,
      isRevealed: false,
      isNew: false,
    });
    deck.push({
      id: `w-${i}`,
      color: 'white',
      value: i,
      sortValue: i,
      isRevealed: false,
      isNew: false,
    });
  }

  // Joker Tiles (-)
  // Value is -1. Initial sortValue is high to place at end by default if not manually placed.
  deck.push({
    id: `b-joker`,
    color: 'black',
    value: -1,
    sortValue: 100, 
    isRevealed: false,
    isNew: false,
  });
  deck.push({
    id: `w-joker`,
    color: 'white',
    value: -1,
    sortValue: 100,
    isRevealed: false,
    isNew: false,
  });

  return shuffle(deck);
};

const shuffle = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Sorts tiles: Ascending sortValue. If sortValues equal, Black comes before White.
export const sortHand = (hand: Tile[]): Tile[] => {
  return [...hand].sort((a, b) => {
    if (a.sortValue !== b.sortValue) {
      return a.sortValue - b.sortValue;
    }
    // If sortValue matches (rare, unless multiple jokers at same spot or same number), black first
    return a.color === 'black' ? -1 : 1;
  });
};

export const drawTile = (deck: Tile[]): { tile: Tile | undefined; newDeck: Tile[] } => {
  if (deck.length === 0) return { tile: undefined, newDeck: deck };
  const [tile, ...remainingDeck] = deck;
  return { tile, newDeck: remainingDeck };
};