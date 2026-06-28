import { describe, it, expect } from 'vitest';
import { playDealer, determineResult, payoutMultiplier } from '@/game/rules';
import { Card } from '@/game/types';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });

describe('playDealer', () => {
  it('17 及以上立即停牌', () => {
    const { hand } = playDealer([c('10'), c('7')], []);
    expect(hand).toEqual([c('10'), c('7')]);
  });

  it('16 以下继续要牌直到 >=17', () => {
    // [K,6]=16，抽 5 → 21 停
    const { hand } = playDealer([c('K'), c('6')], [c('5'), c('2')]);
    expect(hand).toHaveLength(3);
    expect(hand[2]).toEqual(c('5'));
  });

  it('返回剩余牌组', () => {
    const { deck } = playDealer([c('K'), c('6')], [c('5'), c('2'), c('3')]);
    expect(deck).toEqual([c('2'), c('3')]);
  });
});

describe('determineResult', () => {
  it('玩家 Blackjack', () => {
    expect(determineResult([c('A'), c('K')], [c('10'), c('7')])).toBe('playerBlackjack');
  });
  it('双方 Blackjack → 平', () => {
    expect(determineResult([c('A'), c('K')], [c('A'), c('Q')])).toBe('push');
  });
  it('庄家 Blackjack、玩家普通 → 输', () => {
    expect(determineResult([c('10'), c('9')], [c('A'), c('K')])).toBe('playerLoss');
  });
  it('玩家点数更高 → 赢', () => {
    expect(determineResult([c('10'), c('9')], [c('10'), c('7')])).toBe('playerWin');
  });
  it('玩家点数更低 → 输', () => {
    expect(determineResult([c('10'), c('6')], [c('10'), c('9')])).toBe('playerLoss');
  });
  it('点数相等 → 平', () => {
    expect(determineResult([c('10'), c('9')], [c('10'), c('9')])).toBe('push');
  });
  it('玩家爆牌 → 输', () => {
    expect(determineResult([c('10'), c('6'), c('8')], [c('10'), c('7')])).toBe('playerLoss');
  });
  it('庄家爆牌、玩家未爆 → 赢', () => {
    expect(determineResult([c('10'), c('7')], [c('10'), c('6'), c('8')])).toBe('playerWin');
  });
});

describe('payoutMultiplier', () => {
  it('Blackjack 返还 2.5（本金 + 1.5）', () => {
    expect(payoutMultiplier('playerBlackjack')).toBe(2.5);
  });
  it('普通赢返还 2（本金 + 1）', () => {
    expect(payoutMultiplier('playerWin')).toBe(2);
  });
  it('平局返还 1（退本金）', () => {
    expect(payoutMultiplier('push')).toBe(1);
  });
  it('输返还 0', () => {
    expect(payoutMultiplier('playerLoss')).toBe(0);
  });
});
