import { describe, it, expect } from 'vitest';
import { cardValue, calculateScore, isBlackjack, isBust } from '@/game/scoring';
import { Card } from '@/game/types';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });

describe('cardValue', () => {
  it('A=11，人头牌=10，数字按面值', () => {
    expect(cardValue('A')).toBe(11);
    expect(cardValue('J')).toBe(10);
    expect(cardValue('Q')).toBe(10);
    expect(cardValue('K')).toBe(10);
    expect(cardValue('10')).toBe(10);
    expect(cardValue('5')).toBe(5);
  });
});

describe('calculateScore', () => {
  it('简单求和', () => {
    expect(calculateScore([c('5'), c('6')])).toBe(11);
  });

  it('A 当 11 不爆牌', () => {
    expect(calculateScore([c('A'), c('6')])).toBe(17);
  });

  it('A 自动降为 1 避免爆牌', () => {
    expect(calculateScore([c('A'), c('6'), c('10')])).toBe(17);
  });

  it('两张 A 不爆牌（=12）', () => {
    expect(calculateScore([c('A'), c('A')])).toBe(12);
  });

  it('Blackjack 牌型 = 21', () => {
    expect(calculateScore([c('A'), c('K')])).toBe(21);
  });

  it('爆牌返回 >21', () => {
    expect(calculateScore([c('10'), c('K'), c('5')])).toBe(25);
  });
});

describe('isBlackjack', () => {
  it('两张 21 点为 Blackjack', () => {
    expect(isBlackjack([c('A'), c('K')])).toBe(true);
  });

  it('三张 21 点不是 Blackjack', () => {
    expect(isBlackjack([c('7'), c('7'), c('7')])).toBe(false);
  });

  it('两张非 21 不是 Blackjack', () => {
    expect(isBlackjack([c('A'), c('9')])).toBe(false);
  });
});

describe('isBust', () => {
  it('>21 爆牌', () => {
    expect(isBust([c('10'), c('K'), c('5')])).toBe(true);
  });

  it('=21 不爆牌', () => {
    expect(isBust([c('A'), c('K')])).toBe(false);
  });
});
