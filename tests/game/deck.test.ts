import { describe, it, expect } from 'vitest';
import {
  createDeck,
  shuffle,
  drawCard,
  createShuffledDeck,
  SUITS,
  RANKS,
} from '@/game/deck';

describe('createDeck', () => {
  it('生成 52 张牌', () => {
    expect(createDeck()).toHaveLength(52);
  });

  it('包含 4 花色 × 13 点数的全部组合', () => {
    const deck = createDeck();
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        expect(deck).toContainEqual({ suit, rank });
      }
    }
  });
});

describe('shuffle', () => {
  it('保持 52 张且内容不变（仅顺序变）', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(52);
    for (const card of deck) {
      expect(shuffled).toContainEqual(card);
    }
  });

  it('不修改原数组', () => {
    const deck = createDeck();
    const snapshot = [...deck];
    shuffle(deck);
    expect(deck).toEqual(snapshot);
  });
});

describe('drawCard', () => {
  it('抽出第一张并返回剩余 51 张', () => {
    const deck = createDeck();
    const [card, rest] = drawCard(deck);
    expect(card).toEqual(deck[0]);
    expect(rest).toHaveLength(51);
  });

  it('空牌组返回 [null, []]', () => {
    const [card, rest] = drawCard([]);
    expect(card).toBeNull();
    expect(rest).toEqual([]);
  });
});

describe('createShuffledDeck', () => {
  it('返回 52 张洗好的牌', () => {
    expect(createShuffledDeck()).toHaveLength(52);
  });
});
