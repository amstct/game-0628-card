export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type GamePhase = 'betting' | 'playerTurn' | 'dealerTurn' | 'settled';

export type Result =
  | 'playerBlackjack'
  | 'playerWin'
  | 'push'
  | 'playerLoss';

export interface Stats {
  wins: number;
  losses: number;
  pushes: number;
}

export interface GameState {
  phase: GamePhase;
  balance: number;
  currentBet: number;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  holeRevealed: boolean;
  result: Result | null;
  stats: Stats;
}

export type Action =
  | { type: 'PLACE_BET'; amount: number }
  | { type: 'CLEAR_BET' }
  | { type: 'DEAL' }
  | { type: 'HIT' }
  | { type: 'STAND' }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESET_BANKROLL' }
  | { type: 'HYDRATE'; saved: { balance: number; stats: Stats } };
