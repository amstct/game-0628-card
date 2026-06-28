import { Action, Card, GameState, Result, Stats } from './types';
import { createShuffledDeck, drawCard } from './deck';
import { isBlackjack, isBust } from './scoring';
import { determineResult, payoutMultiplier, playDealer } from './rules';

export const INITIAL_BANKROLL = 1000;
export const SAVE_KEY = 'blackjack:save';

export const INITIAL_STATE: GameState = {
  phase: 'betting',
  balance: INITIAL_BANKROLL,
  currentBet: 0,
  deck: createShuffledDeck(),
  playerHand: [],
  dealerHand: [],
  holeRevealed: false,
  result: null,
  stats: { wins: 0, losses: 0, pushes: 0 },
};

function applySettlement(state: GameState, result: Result): GameState {
  const balance = state.balance + state.currentBet * payoutMultiplier(result);
  const stats: Stats = { ...state.stats };
  if (result === 'playerBlackjack' || result === 'playerWin') stats.wins++;
  else if (result === 'playerLoss') stats.losses++;
  else stats.pushes++;
  return { ...state, result, balance, stats, holeRevealed: true, phase: 'settled' };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'PLACE_BET': {
      if (state.phase !== 'betting') return state;
      if (action.amount <= 0 || action.amount > state.balance) return state;
      return {
        ...state,
        balance: state.balance - action.amount,
        currentBet: state.currentBet + action.amount,
      };
    }
    case 'CLEAR_BET': {
      if (state.phase !== 'betting') return state;
      return {
        ...state,
        balance: state.balance + state.currentBet,
        currentBet: 0,
      };
    }
    case 'DEAL': {
      if (state.phase !== 'betting' || state.currentBet <= 0) return state;
      let deck = state.deck.length >= 4 ? state.deck : createShuffledDeck();
      const playerHand: Card[] = [];
      const dealerHand: Card[] = [];
      for (let i = 0; i < 2; i++) {
        const [p, d1] = drawCard(deck);
        if (p) { playerHand.push(p); deck = d1; }
        const [d, d2] = drawCard(deck);
        if (d) { dealerHand.push(d); deck = d2; }
      }
      const afterDeal: GameState = {
        ...state,
        deck,
        playerHand,
        dealerHand,
        holeRevealed: false,
        result: null,
        phase: 'playerTurn',
      };
      if (isBlackjack(playerHand) || isBlackjack(dealerHand)) {
        return applySettlement(afterDeal, determineResult(playerHand, dealerHand));
      }
      return afterDeal;
    }
    case 'HIT': {
      if (state.phase !== 'playerTurn') return state;
      const [card, deck] = drawCard(state.deck);
      if (!card) return state;
      const playerHand = [...state.playerHand, card];
      const next: GameState = { ...state, playerHand, deck };
      if (isBust(playerHand)) {
        return applySettlement(next, 'playerLoss');
      }
      return next;
    }
    case 'STAND': {
      if (state.phase !== 'playerTurn') return state;
      const { hand, deck } = playDealer(state.dealerHand, state.deck);
      const result = determineResult(state.playerHand, hand);
      return applySettlement({ ...state, dealerHand: hand, deck }, result);
    }
    case 'NEXT_ROUND': {
      if (state.phase !== 'settled') return state;
      return {
        ...INITIAL_STATE,
        balance: state.balance,
        stats: state.stats,
        deck: createShuffledDeck(),
      };
    }
    case 'RESET_BANKROLL': {
      return { ...INITIAL_STATE, deck: createShuffledDeck() };
    }
    case 'HYDRATE': {
      return {
        ...state,
        balance: action.saved.balance,
        stats: action.saved.stats,
      };
    }
    default:
      return state;
  }
}
