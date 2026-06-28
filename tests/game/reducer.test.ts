import { describe, it, expect } from 'vitest';
import { reducer, INITIAL_STATE, INITIAL_BANKROLL } from '@/game/reducer';
import { Card, GameState } from '@/game/types';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });

function withDeck(deck: Card[]): GameState {
  return { ...INITIAL_STATE, deck };
}

describe('reducer - PLACE_BET', () => {
  it('下注从余额扣除并累加 currentBet', () => {
    const next = reducer(INITIAL_STATE, { type: 'PLACE_BET', amount: 100 });
    expect(next.balance).toBe(INITIAL_BANKROLL - 100);
    expect(next.currentBet).toBe(100);
  });

  it('超过余额则忽略（返回原 state）', () => {
    const next = reducer(INITIAL_STATE, { type: 'PLACE_BET', amount: 99999 });
    expect(next).toBe(INITIAL_STATE);
  });

  it('非正数金额忽略', () => {
    expect(reducer(INITIAL_STATE, { type: 'PLACE_BET', amount: 0 })).toBe(INITIAL_STATE);
    expect(reducer(INITIAL_STATE, { type: 'PLACE_BET', amount: -5 })).toBe(INITIAL_STATE);
  });

  it('非 betting 阶段忽略', () => {
    let s = reducer(INITIAL_STATE, { type: 'PLACE_BET', amount: 100 });
    s = reducer(s, { type: 'DEAL' });
    expect(reducer(s, { type: 'PLACE_BET', amount: 50 })).toBe(s);
  });
});

describe('reducer - CLEAR_BET', () => {
  it('清空下注并退回余额', () => {
    let s = reducer(INITIAL_STATE, { type: 'PLACE_BET', amount: 100 });
    s = reducer(s, { type: 'CLEAR_BET' });
    expect(s.currentBet).toBe(0);
    expect(s.balance).toBe(INITIAL_BANKROLL);
  });
});

describe('reducer - DEAL', () => {
  it('未下注时忽略', () => {
    expect(reducer(withDeck([c('5'), c('6'), c('7'), c('8')]), { type: 'DEAL' }))
      .toEqual(withDeck([c('5'), c('6'), c('7'), c('8')]));
  });

  it('正常发牌进入 playerTurn，发 4 张', () => {
    let s = withDeck([c('5', 'hearts'), c('6', 'spades'), c('7', 'clubs'), c('8', 'diamonds')]);
    s = reducer(s, { type: 'PLACE_BET', amount: 50 });
    s = reducer(s, { type: 'DEAL' });
    expect(s.phase).toBe('playerTurn');
    expect(s.playerHand).toEqual([c('5', 'hearts'), c('7', 'clubs')]);
    expect(s.dealerHand).toEqual([c('6', 'spades'), c('8', 'diamonds')]);
    expect(s.holeRevealed).toBe(false);
  });

  it('玩家开局 Blackjack 直接结算（3:2）', () => {
    let s = withDeck([c('A', 'hearts'), c('6', 'spades'), c('K', 'clubs'), c('7', 'diamonds')]);
    s = reducer(s, { type: 'PLACE_BET', amount: 100 });
    s = reducer(s, { type: 'DEAL' });
    expect(s.phase).toBe('settled');
    expect(s.result).toBe('playerBlackjack');
    expect(s.holeRevealed).toBe(true);
    expect(s.balance).toBe(1150);
    expect(s.stats.wins).toBe(1);
  });
});

describe('reducer - HIT', () => {
  it('要牌增加一张', () => {
    let s = withDeck([c('5', 'hearts'), c('6', 'spades'), c('7', 'clubs'), c('8', 'diamonds'), c('9', 'hearts'), c('2', 'spades')]);
    s = reducer(s, { type: 'PLACE_BET', amount: 50 });
    s = reducer(s, { type: 'DEAL' });
    s = reducer(s, { type: 'HIT' });
    expect(s.playerHand).toHaveLength(3);
    expect(s.playerHand[2]).toEqual(c('9', 'hearts'));
  });

  it('爆牌立即结算为输', () => {
    let s = withDeck([c('K', 'hearts'), c('6', 'spades'), c('8', 'clubs'), c('7', 'diamonds'), c('5', 'hearts')]);
    s = reducer(s, { type: 'PLACE_BET', amount: 100 });
    s = reducer(s, { type: 'DEAL' });
    s = reducer(s, { type: 'HIT' });
    expect(s.phase).toBe('settled');
    expect(s.result).toBe('playerLoss');
    expect(s.balance).toBe(900);
    expect(s.stats.losses).toBe(1);
  });

  it('非 playerTurn 阶段忽略', () => {
    expect(reducer(INITIAL_STATE, { type: 'HIT' })).toBe(INITIAL_STATE);
  });
});

describe('reducer - STAND', () => {
  it('庄家行动后结算（庄家爆牌→玩家赢）', () => {
    let s = withDeck([c('5', 'hearts'), c('6', 'spades'), c('7', 'clubs'), c('8', 'diamonds'), c('9', 'hearts'), c('2', 'spades')]);
    s = reducer(s, { type: 'PLACE_BET', amount: 50 });
    s = reducer(s, { type: 'DEAL' });
    s = reducer(s, { type: 'STAND' });
    expect(s.phase).toBe('settled');
    expect(s.result).toBe('playerWin');
    expect(s.holeRevealed).toBe(true);
    expect(s.balance).toBe(1050);
    expect(s.stats.wins).toBe(1);
  });

  it('非 playerTurn 阶段忽略', () => {
    expect(reducer(INITIAL_STATE, { type: 'STAND' })).toBe(INITIAL_STATE);
  });
});

describe('reducer - NEXT_ROUND / RESET_BANKROLL', () => {
  it('NEXT_ROUND 保留余额与战绩，回到 betting', () => {
    let s = withDeck([c('5', 'hearts'), c('6', 'spades'), c('7', 'clubs'), c('8', 'diamonds'), c('9', 'hearts'), c('2', 'spades')]);
    s = reducer(s, { type: 'PLACE_BET', amount: 50 });
    s = reducer(s, { type: 'DEAL' });
    s = reducer(s, { type: 'STAND' });
    const balanceBefore = s.balance;
    const statsBefore = { ...s.stats };
    const next = reducer(s, { type: 'NEXT_ROUND' });
    expect(next.phase).toBe('betting');
    expect(next.currentBet).toBe(0);
    expect(next.playerHand).toEqual([]);
    expect(next.dealerHand).toEqual([]);
    expect(next.balance).toBe(balanceBefore);
    expect(next.stats).toEqual(statsBefore);
  });

  it('RESET_BANKROLL 重置为初始 1000 并清战绩', () => {
    const next = reducer(INITIAL_STATE, { type: 'RESET_BANKROLL' });
    expect(next.balance).toBe(INITIAL_BANKROLL);
    expect(next.stats).toEqual({ wins: 0, losses: 0, pushes: 0 });
    expect(next.phase).toBe('betting');
  });
});

describe('reducer - HYDRATE', () => {
  it('恢复余额与战绩', () => {
    const next = reducer(INITIAL_STATE, {
      type: 'HYDRATE',
      saved: { balance: 500, stats: { wins: 3, losses: 2, pushes: 1 } },
    });
    expect(next.balance).toBe(500);
    expect(next.stats.wins).toBe(3);
  });
});
