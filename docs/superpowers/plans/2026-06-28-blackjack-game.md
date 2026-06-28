# 21 点卡牌网页游戏 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个纯前端的虚拟筹码 21 点（Blackjack）网页游戏，玩家用筹码下注、与庄家比点数，核心循环可玩。

**Architecture:** 严格分层——`src/game/` 是纯 TypeScript 逻辑层（零 React 依赖，规则可独立单测），`src/hooks/useBlackjack.ts` 用 `useReducer` 封装状态并对接 `localStorage` 持久化，`src/components/blackjack/` 是只渲染+派发 action 的 UI 层。状态机：`betting → playerTurn → dealerTurn(瞬态) → settled`。

**Tech Stack:** Next.js 15（App Router）+ TypeScript + Tailwind CSS + shadcn/ui + Vitest。

对应设计文档：`docs/superpowers/specs/2026-06-28-blackjack-game-design.md`

---

## 文件结构总览

| 文件 | 职责 |
|---|---|
| `src/game/types.ts` | 所有类型：`Card`、`Suit`、`Rank`、`GamePhase`、`Result`、`Stats`、`GameState`、`Action` |
| `src/game/deck.ts` | 创建牌组、Fisher-Yates 洗牌、抽牌（纯函数）|
| `src/game/scoring.ts` | 点数计算（A 软/硬）、Blackjack 判定、爆牌判定（纯函数）|
| `src/game/rules.ts` | 庄家行动 `playDealer`、结算判定 `determineResult`、赔付倍数 `payoutMultiplier`（纯函数）|
| `src/game/reducer.ts` | `INITIAL_STATE`、`reducer`、内部结算函数 `applySettlement`、常量 |
| `src/hooks/useBlackjack.ts` | 封装 `useReducer` + `localStorage` 读写（仅此文件含 React）|
| `src/components/blackjack/CardView.tsx` | 单张扑克牌（CSS/SVG 自绘）|
| `src/components/blackjack/Hand.tsx` | 一手牌展示（玩家/庄家，含暗牌）|
| `src/components/blackjack/BalanceHUD.tsx` | 顶部余额 + 战绩 |
| `src/components/blackjack/BettingControls.tsx` | 筹码档位下注区 |
| `src/components/blackjack/ActionBar.tsx` | Hit / Stand 按钮 |
| `src/components/blackjack/ResultBanner.tsx` | 结算横幅 + 下一局 |
| `src/components/blackjack/BlackjackTable.tsx` | 顶层容器，按 phase 组合所有子组件 |
| `src/app/page.tsx` | 入口，渲染 `<BlackjackTable/>` |
| `src/app/globals.css` | 卡牌进场动画 `@keyframes` |
| `tests/game/*.test.ts` | `game/` 层 Vitest 单测 |
| `tests/hooks/useBlackjack.test.tsx` | hook 持久化测试（jsdom）|
| `vitest.config.ts` | Vitest 配置（路径别名 `@/*`）|

---

## Task 1: 项目脚手架（Next.js + shadcn + Vitest）

**Files:**
- Create: 整个 Next.js 项目结构
- Create: `vitest.config.ts`
- Modify: `package.json`（测试脚本）

- [ ] **Step 1: 用 create-next-app 初始化项目**

在项目根目录 `/Users/chen/Documents/code/game/card0628` 运行（目录已含 `docs/` 与 `.git`，`--yes` 跳过提示）：

```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```

预期：生成 `src/app/`、`package.json`、`tsconfig.json`、`tailwind` 配置等。若提示目录非空，选择继续。

- [ ] **Step 2: 安装 shadcn/ui 并添加基础组件**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button card badge
```

预期：生成 `src/components/ui/button.tsx`、`card.tsx`、`badge.tsx`，以及 `components.json`、`src/lib/utils.ts`。

- [ ] **Step 3: 安装测试依赖**

```bash
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react
```

- [ ] **Step 4: 创建 Vitest 配置**

Create `vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 5: 添加测试脚本到 package.json**

在 `package.json` 的 `scripts` 中加入：

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: 验证脚手架可用**

Run: `npm run dev`
Expected: 开发服务器启动，浏览器访问 `http://localhost:3000` 看到 Next.js 默认页面。

Run: `npm run test`
Expected: `No test files found`（正常，尚未写测试），退出码 0。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: 初始化 Next.js + shadcn + Vitest 脚手架"
```

---

## Task 2: 类型定义 types.ts

**Files:**
- Create: `src/game/types.ts`

- [ ] **Step 1: 创建类型文件**

Create `src/game/types.ts`：

```ts
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
```

> 说明：设计文档 5.2 列了独立 `SETTLE` action，实现上将其逻辑封装为 `reducer.ts` 内部函数 `applySettlement`，由 `DEAL`/`HIT`/`STAND` 触发，无需外部 dispatch，简化时序。

- [ ] **Step 2: 验证类型编译通过**

Run: `npx tsc --noEmit`
Expected: 无错误。

- [ ] **Step 3: Commit**

```bash
git add src/game/types.ts
git commit -m "feat(game): 定义游戏核心类型"
```

---

## Task 3: 牌组逻辑 deck.ts（TDD）

**Files:**
- Create: `src/game/deck.ts`
- Test: `tests/game/deck.test.ts`

- [ ] **Step 1: 写失败测试**

Create `tests/game/deck.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/game/deck.test.ts`
Expected: FAIL，提示 `createDeck` 等未定义/模块找不到。

- [ ] **Step 3: 实现 deck.ts**

Create `src/game/deck.ts`：

```ts
import { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = [
  'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K',
];

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

export function shuffle(deck: Card[]): Card[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createShuffledDeck(): Card[] {
  return shuffle(createDeck());
}

export function drawCard(deck: Card[]): [Card | null, Card[]] {
  if (deck.length === 0) return [null, []];
  const [first, ...rest] = deck;
  return [first, rest];
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/game/deck.test.ts`
Expected: PASS（全部用例）。

- [ ] **Step 5: Commit**

```bash
git add src/game/deck.ts tests/game/deck.test.ts
git commit -m "feat(game): 牌组创建/洗牌/抽牌"
```

---

## Task 4: 点数计算 scoring.ts（TDD）

**Files:**
- Create: `src/game/scoring.ts`
- Test: `tests/game/scoring.test.ts`

- [ ] **Step 1: 写失败测试**

Create `tests/game/scoring.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/game/scoring.test.ts`
Expected: FAIL，模块找不到。

- [ ] **Step 3: 实现 scoring.ts**

Create `src/game/scoring.ts`：

```ts
import { Card, Rank } from './types';

export function cardValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return parseInt(rank, 10);
}

export function calculateScore(hand: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    total += cardValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

export function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && calculateScore(hand) === 21;
}

export function isBust(hand: Card[]): boolean {
  return calculateScore(hand) > 21;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/game/scoring.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/game/scoring.ts tests/game/scoring.test.ts
git commit -m "feat(game): 点数计算与 Blackjack/爆牌判定"
```

---

## Task 5: 规则逻辑 rules.ts（TDD）

**Files:**
- Create: `src/game/rules.ts`
- Test: `tests/game/rules.test.ts`

- [ ] **Step 1: 写失败测试**

Create `tests/game/rules.test.ts`：

```ts
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/game/rules.test.ts`
Expected: FAIL，模块找不到。

- [ ] **Step 3: 实现 rules.ts**

Create `src/game/rules.ts`：

```ts
import { Card, Result } from './types';
import { calculateScore, isBust, isBlackjack } from './scoring';
import { drawCard } from './deck';

export function playDealer(
  dealerHand: Card[],
  deck: Card[],
): { hand: Card[]; deck: Card[] } {
  const hand = [...dealerHand];
  let remaining = [...deck];
  while (calculateScore(hand) < 17) {
    const [card, rest] = drawCard(remaining);
    if (!card) break;
    hand.push(card);
    remaining = rest;
  }
  return { hand, deck: remaining };
}

export function determineResult(
  playerHand: Card[],
  dealerHand: Card[],
): Result {
  const playerBJ = isBlackjack(playerHand);
  const dealerBJ = isBlackjack(dealerHand);
  if (playerBJ && dealerBJ) return 'push';
  if (playerBJ) return 'playerBlackjack';
  if (dealerBJ) return 'playerLoss';
  if (isBust(playerHand)) return 'playerLoss';
  if (isBust(dealerHand)) return 'playerWin';

  const playerScore = calculateScore(playerHand);
  const dealerScore = calculateScore(dealerHand);
  if (playerScore > dealerScore) return 'playerWin';
  if (playerScore < dealerScore) return 'playerLoss';
  return 'push';
}

export function payoutMultiplier(result: Result): number {
  switch (result) {
    case 'playerBlackjack':
      return 2.5;
    case 'playerWin':
      return 2;
    case 'push':
      return 1;
    case 'playerLoss':
      return 0;
  }
}
```

> 说明：`remaining = rest` 每次循环重新赋值（`drawCard` 返回去首后的新数组），无原地副作用；`drawCard` 已做抽空兜底（返回 `[null, []]` 时 `break`）。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/game/rules.test.ts`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/game/rules.ts tests/game/rules.test.ts
git commit -m "feat(game): 庄家行动、结算判定与赔付倍数"
```

---

## Task 6: 状态机 reducer.ts（TDD）

**Files:**
- Create: `src/game/reducer.ts`
- Test: `tests/game/reducer.test.ts`

> 关键设计：
> - 洗牌发生在进入 `betting`（`INITIAL_STATE` 与 `NEXT_ROUND`）时；`DEAL` 从 `state.deck` 发牌，使测试可用固定牌组精确控制。
> - `dealerTurn` 是瞬态：`STAND` 一次性执行 `playDealer` 并直接进入 `settled`，不在状态中停留（庄家逐张翻牌的视觉效果由 CSS 动画承担，见 spec 6.3）。

- [ ] **Step 1: 写失败测试**

Create `tests/game/reducer.test.ts`：

```ts
import { describe, it, expect } from 'vitest';
import { reducer, INITIAL_STATE, INITIAL_BANKROLL } from '@/game/reducer';
import { Card, GameState } from '@/game/types';

const c = (rank: Card['rank'], suit: Card['suit'] = 'spades'): Card => ({ rank, suit });

// 用固定牌组构造可预测的初始状态（覆盖随机洗好的 deck）
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
    // 发牌顺序：玩家1, 庄家1, 玩家2, 庄家2 → 取 deck[0..3]
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
    s = reducer(s, { type: 'PLACE_BET', amount: 100 }); // balance 900, bet 100
    s = reducer(s, { type: 'DEAL' }); // player[A,K] BJ
    expect(s.phase).toBe('settled');
    expect(s.result).toBe('playerBlackjack');
    expect(s.holeRevealed).toBe(true);
    expect(s.balance).toBe(1150); // 900 + 100*2.5
    expect(s.stats.wins).toBe(1);
  });
});

describe('reducer - HIT', () => {
  it('要牌增加一张', () => {
    let s = withDeck([c('5', 'h'), c('6', 's'), c('7', 'c'), c('8', 'd'), c('9', 'h'), c('2', 's')]);
    s = reducer(s, { type: 'PLACE_BET', amount: 50 });
    s = reducer(s, { type: 'DEAL' });
    s = reducer(s, { type: 'HIT' });
    expect(s.playerHand).toHaveLength(3);
    expect(s.playerHand[2]).toEqual(c('9', 'h'));
  });

  it('爆牌立即结算为输', () => {
    // player[K,8]=18, 下一张 5 → 23 爆
    let s = withDeck([c('K', 'h'), c('6', 's'), c('8', 'c'), c('7', 'd'), c('5', 'h')]);
    s = reducer(s, { type: 'PLACE_BET', amount: 100 }); // balance 900
    s = reducer(s, { type: 'DEAL' }); // player[K,8]=18, dealer[6,7]=13
    s = reducer(s, { type: 'HIT' }); // 抽5 → 23 爆
    expect(s.phase).toBe('settled');
    expect(s.result).toBe('playerLoss');
    expect(s.balance).toBe(900); // 输不退
    expect(s.stats.losses).toBe(1);
  });

  it('非 playerTurn 阶段忽略', () => {
    expect(reducer(INITIAL_STATE, { type: 'HIT' })).toBe(INITIAL_STATE);
  });
});

describe('reducer - STAND', () => {
  it('庄家行动后结算（庄家爆牌→玩家赢）', () => {
    // player[5,7]=12, dealer[6,8]=14, deck 下一张 9 → 庄家 23 爆 → 玩家赢
    let s = withDeck([c('5', 'h'), c('6', 's'), c('7', 'c'), c('8', 'd'), c('9', 'h'), c('2', 's')]);
    s = reducer(s, { type: 'PLACE_BET', amount: 50 }); // balance 950, bet 50
    s = reducer(s, { type: 'DEAL' }); // deck 剩 [9,2]
    s = reducer(s, { type: 'STAND' }); // 庄家 14→抽9→23 爆
    expect(s.phase).toBe('settled');
    expect(s.result).toBe('playerWin');
    expect(s.holeRevealed).toBe(true);
    expect(s.balance).toBe(1050); // 950 + 50*2
    expect(s.stats.wins).toBe(1);
  });

  it('非 playerTurn 阶段忽略', () => {
    expect(reducer(INITIAL_STATE, { type: 'STAND' })).toBe(INITIAL_STATE);
  });
});

describe('reducer - NEXT_ROUND / RESET_BANKROLL', () => {
  it('NEXT_ROUND 保留余额与战绩，回到 betting', () => {
    let s = withDeck([c('5', 'h'), c('6', 's'), c('7', 'c'), c('8', 'd'), c('9', 'h'), c('2', 's')]);
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/game/reducer.test.ts`
Expected: FAIL，模块找不到。

- [ ] **Step 3: 实现 reducer.ts**

Create `src/game/reducer.ts`：

```ts
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/game/reducer.test.ts`
Expected: PASS（全部用例）。

- [ ] **Step 5: 运行全部测试**

Run: `npm test`
Expected: PASS（deck + scoring + rules + reducer 全部通过）。

- [ ] **Step 6: Commit**

```bash
git add src/game/reducer.ts tests/game/reducer.test.ts
git commit -m "feat(game): 状态机 reducer 与结算逻辑"
```

---

## Task 7: useBlackjack hook + localStorage 持久化（TDD）

**Files:**
- Create: `src/hooks/useBlackjack.ts`
- Test: `tests/hooks/useBlackjack.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `tests/hooks/useBlackjack.test.tsx`：

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlackjack } from '@/hooks/useBlackjack';
import { SAVE_KEY, INITIAL_BANKROLL } from '@/game/reducer';

describe('useBlackjack', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('初始余额为 1000', () => {
    const { result } = renderHook(() => useBlackjack());
    expect(result.current.state.balance).toBe(INITIAL_BANKROLL);
  });

  it('启动时从 localStorage 恢复余额与战绩', () => {
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ balance: 500, stats: { wins: 2, losses: 1, pushes: 0 } }),
    );
    const { result } = renderHook(() => useBlackjack());
    expect(result.current.state.balance).toBe(500);
    expect(result.current.state.stats.wins).toBe(2);
  });

  it('dispatch PLACE_BET 后余额变化', () => {
    const { result } = renderHook(() => useBlackjack());
    act(() => {
      result.current.dispatch({ type: 'PLACE_BET', amount: 100 });
    });
    expect(result.current.state.balance).toBe(INITIAL_BANKROLL - 100);
    expect(result.current.state.currentBet).toBe(100);
  });

  it('余额变化后写入 localStorage', () => {
    const { result } = renderHook(() => useBlackjack());
    act(() => {
      result.current.dispatch({ type: 'PLACE_BET', amount: 100 });
    });
    const raw = window.localStorage.getItem(SAVE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).balance).toBe(INITIAL_BANKROLL - 100);
  });

  it('损坏的 localStorage 数据被安全忽略', () => {
    window.localStorage.setItem(SAVE_KEY, '{not valid json');
    const { result } = renderHook(() => useBlackjack());
    expect(result.current.state.balance).toBe(INITIAL_BANKROLL);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/hooks/useBlackjack.test.tsx`
Expected: FAIL，模块找不到。

- [ ] **Step 3: 实现 useBlackjack.ts**

Create `src/hooks/useBlackjack.ts`：

```ts
'use client';

import { useEffect, useReducer } from 'react';
import { reducer, INITIAL_STATE, SAVE_KEY } from '@/game/reducer';
import { Stats } from '@/game/types';

interface SavedGame {
  balance: number;
  stats: Stats;
}

function loadSaved(): SavedGame | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedGame>;
    if (
      typeof parsed.balance === 'number' &&
      parsed.stats &&
      typeof parsed.stats.wins === 'number' &&
      typeof parsed.stats.losses === 'number' &&
      typeof parsed.stats.pushes === 'number'
    ) {
      return { balance: parsed.balance, stats: parsed.stats as Stats };
    }
    return null;
  } catch {
    return null;
  }
}

export function useBlackjack() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    const saved = loadSaved();
    if (saved) dispatch({ type: 'HYDRATE', saved });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({ balance: state.balance, stats: state.stats }),
    );
  }, [state.balance, state.stats]);

  return { state, dispatch };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- tests/hooks/useBlackjack.test.tsx`
Expected: PASS。

- [ ] **Step 5: 运行全部测试**

Run: `npm test`
Expected: PASS（含 game/ 与 hooks/）。

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useBlackjack.ts tests/hooks/useBlackjack.test.tsx
git commit -m "feat(hooks): useBlackjack 与 localStorage 持久化"
```

---

## Task 8: 卡牌组件 CardView

**Files:**
- Create: `src/components/blackjack/CardView.tsx`

- [ ] **Step 1: 实现 CardView**

Create `src/components/blackjack/CardView.tsx`：

```tsx
'use client';

import { Card, Suit } from '@/game/types';

const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const RED_SUITS: Suit[] = ['hearts', 'diamonds'];

export function CardView({
  card,
  faceDown = false,
}: {
  card: Card;
  faceDown?: boolean;
}) {
  if (faceDown) {
    return (
      <div className="card-enter w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md border border-primary-foreground/20">
        <div className="w-10 h-14 rounded border-2 border-primary-foreground/30" />
      </div>
    );
  }

  const isRed = RED_SUITS.includes(card.suit);
  const symbol = SUIT_SYMBOL[card.suit];

  return (
    <div
      className={`card-enter w-16 h-24 sm:w-20 sm:h-28 rounded-lg bg-white shadow-md flex flex-col justify-between p-1.5 select-none ${
        isRed ? 'text-red-600' : 'text-slate-900'
      }`}
    >
      <div className="text-left leading-none">
        <div className="font-bold text-sm sm:text-base">{card.rank}</div>
        <div className="text-xs sm:text-sm">{symbol}</div>
      </div>
      <div className="text-center text-2xl sm:text-3xl">{symbol}</div>
      <div className="text-right leading-none rotate-180">
        <div className="font-bold text-sm sm:text-base">{card.rank}</div>
        <div className="text-xs sm:text-sm">{symbol}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blackjack/CardView.tsx
git commit -m "feat(ui): 卡牌组件 CardView（CSS 自绘）"
```

---

## Task 9: 一手牌组件 Hand

**Files:**
- Create: `src/components/blackjack/Hand.tsx`

- [ ] **Step 1: 实现 Hand**

Create `src/components/blackjack/Hand.tsx`：

```tsx
'use client';

import { Card } from '@/game/types';
import { CardView } from './CardView';
import { calculateScore } from '@/game/scoring';

export function Hand({
  cards,
  label,
  holeFaceDown = false,
}: {
  cards: Card[];
  label: string;
  /** 庄家未结算时为 true：第二张显示为背面，点数显示为 ? */
  holeFaceDown?: boolean;
}) {
  const scoreCards = holeFaceDown && cards.length >= 2 ? cards.slice(0, 1) : cards;
  const score = calculateScore(scoreCards);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-sm text-muted-foreground">
        {label} · {holeFaceDown ? '?' : score}
      </div>
      <div className="flex items-center">
        {cards.map((card, i) => (
          <div key={i} className={i > 0 ? '-ml-10' : ''}>
            <CardView card={card} faceDown={holeFaceDown && i === 1} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blackjack/Hand.tsx
git commit -m "feat(ui): 一手牌组件 Hand"
```

---

## Task 10: 余额 HUD 组件 BalanceHUD

**Files:**
- Create: `src/components/blackjack/BalanceHUD.tsx`

- [ ] **Step 1: 实现 BalanceHUD**

Create `src/components/blackjack/BalanceHUD.tsx`：

```tsx
'use client';

import { Stats } from '@/game/types';

export function BalanceHUD({
  balance,
  stats,
}: {
  balance: number;
  stats: Stats;
}) {
  return (
    <div className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-muted">
      <div className="text-lg font-semibold">余额 ¥{balance}</div>
      <div className="text-sm text-muted-foreground">
        战绩 {stats.wins}-{stats.losses}-{stats.pushes}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blackjack/BalanceHUD.tsx
git commit -m "feat(ui): 余额与战绩 HUD"
```

---

## Task 11: 下注区组件 BettingControls

**Files:**
- Create: `src/components/blackjack/BettingControls.tsx`

- [ ] **Step 1: 实现 BettingControls**

Create `src/components/blackjack/BettingControls.tsx`：

```tsx
'use client';

import { Button } from '@/components/ui/button';

const CHIPS = [10, 25, 50, 100];

export function BettingControls({
  balance,
  currentBet,
  onPlaceBet,
  onClearBet,
  onDeal,
}: {
  balance: number;
  currentBet: number;
  onPlaceBet: (amount: number) => void;
  onClearBet: () => void;
  onDeal: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-sm">当前下注 ¥{currentBet}</div>
      <div className="flex gap-2">
        {CHIPS.map((n) => (
          <Button
            key={n}
            variant="secondary"
            disabled={n > balance}
            onClick={() => onPlaceBet(n)}
          >
            ¥{n}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClearBet} disabled={currentBet === 0}>
          清空
        </Button>
        <Button onClick={onDeal} disabled={currentBet === 0}>
          开牌 Deal
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blackjack/BettingControls.tsx
git commit -m "feat(ui): 筹码档位下注区"
```

---

## Task 12: 行动按钮组件 ActionBar

**Files:**
- Create: `src/components/blackjack/ActionBar.tsx`

- [ ] **Step 1: 实现 ActionBar**

Create `src/components/blackjack/ActionBar.tsx`：

```tsx
'use client';

import { Button } from '@/components/ui/button';

export function ActionBar({
  onHit,
  onStand,
}: {
  onHit: () => void;
  onStand: () => void;
}) {
  return (
    <div className="flex justify-center gap-3">
      <Button onClick={onHit}>要牌 Hit</Button>
      <Button variant="secondary" onClick={onStand}>
        停牌 Stand
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blackjack/ActionBar.tsx
git commit -m "feat(ui): Hit/Stand 行动按钮"
```

---

## Task 13: 结算横幅组件 ResultBanner

**Files:**
- Create: `src/components/blackjack/ResultBanner.tsx`

- [ ] **Step 1: 实现 ResultBanner**

Create `src/components/blackjack/ResultBanner.tsx`：

```tsx
'use client';

import { Button } from '@/components/ui/button';
import { Result } from '@/game/types';

const TEXT: Record<Result, { title: string; cls: string }> = {
  playerBlackjack: { title: 'Blackjack!', cls: 'text-amber-500' },
  playerWin: { title: '你赢了!', cls: 'text-emerald-500' },
  push: { title: '平局', cls: 'text-sky-500' },
  playerLoss: { title: '你输了', cls: 'text-red-500' },
};

export function ResultBanner({
  result,
  delta,
  onNext,
}: {
  result: Result;
  delta: number;
  onNext: () => void;
}) {
  const info = TEXT[result];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`text-3xl font-bold ${info.cls}`}>{info.title}</div>
      <div className="text-sm text-muted-foreground">
        {delta >= 0 ? '+' : ''}
        {delta}
      </div>
      <Button onClick={onNext}>下一局</Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/blackjack/ResultBanner.tsx
git commit -m "feat(ui): 结算横幅"
```

---

## Task 14: 组装 BlackjackTable + 入口页 + 动画

**Files:**
- Create: `src/components/blackjack/BlackjackTable.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: 实现 BlackjackTable**

Create `src/components/blackjack/BlackjackTable.tsx`：

```tsx
'use client';

import { useBlackjack } from '@/hooks/useBlackjack';
import { BalanceHUD } from './BalanceHUD';
import { Hand } from './Hand';
import { BettingControls } from './BettingControls';
import { ActionBar } from './ActionBar';
import { ResultBanner } from './ResultBanner';
import { Button } from '@/components/ui/button';
import { payoutMultiplier } from '@/game/rules';

export function BlackjackTable() {
  const { state, dispatch } = useBlackjack();
  const {
    phase,
    balance,
    currentBet,
    playerHand,
    dealerHand,
    holeRevealed,
    result,
    stats,
  } = state;

  const delta =
    result && phase === 'settled'
      ? Math.round(currentBet * (payoutMultiplier(result) - 1))
      : 0;

  const bankrupt = phase === 'betting' && balance === 0 && currentBet === 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-between gap-6 p-4 max-w-3xl mx-auto">
      <BalanceHUD balance={balance} stats={stats} />

      <div className="flex flex-col items-center gap-10 py-8">
        <Hand
          cards={dealerHand}
          label="庄家"
          holeFaceDown={!holeRevealed && dealerHand.length >= 2}
        />
        <Hand cards={playerHand} label="玩家" />
      </div>

      <div className="w-full">
        {phase === 'betting' && !bankrupt && (
          <BettingControls
            balance={balance}
            currentBet={currentBet}
            onPlaceBet={(n) => dispatch({ type: 'PLACE_BET', amount: n })}
            onClearBet={() => dispatch({ type: 'CLEAR_BET' })}
            onDeal={() => dispatch({ type: 'DEAL' })}
          />
        )}

        {bankrupt && (
          <div className="flex flex-col items-center gap-3">
            <div className="text-2xl font-bold text-red-500">破产了！</div>
            <Button onClick={() => dispatch({ type: 'RESET_BANKROLL' })}>
              重新开始
            </Button>
          </div>
        )}

        {phase === 'playerTurn' && (
          <ActionBar
            onHit={() => dispatch({ type: 'HIT' })}
            onStand={() => dispatch({ type: 'STAND' })}
          />
        )}

        {phase === 'settled' && result && (
          <ResultBanner
            result={result}
            delta={delta}
            onNext={() => dispatch({ type: 'NEXT_ROUND' })}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 替换入口页**

Replace `src/app/page.tsx` 全文为：

```tsx
import { BlackjackTable } from '@/components/blackjack/BlackjackTable';

export default function Home() {
  return <BlackjackTable />;
}
```

- [ ] **Step 3: 加入卡牌进场动画**

在 `src/app/globals.css` 末尾追加（不要删除现有 Tailwind 指令）：

```css
@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(-12px) rotate(-6deg);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotate(0);
  }
}

.card-enter {
  animation: cardEnter 0.25s ease-out;
}
```

- [ ] **Step 4: 类型检查与构建**

Run: `npx tsc --noEmit`
Expected: 无错误。

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 5: Commit**

```bash
git add src/components/blackjack/BlackjackTable.tsx src/app/page.tsx src/app/globals.css
git commit -m "feat: 组装牌桌、入口页与卡牌动画"
```

---

## Task 15: 端到端手动验证

**Files:**
- 无（验证既有实现）

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev`
Expected: 服务器在 `http://localhost:3000` 启动。

- [ ] **Step 2: 跑全部自动化测试**

Run: `npm test`
Expected: PASS（deck / scoring / rules / reducer / useBlackjack 全部通过）。

- [ ] **Step 3: 手动验证核心流程（浏览器）**

依次确认以下场景：

- [ ] 首次进入：余额 ¥1000，战绩 0-0-0，显示筹码 10/25/50/100 与"开牌 Deal"（禁用）。
- [ ] 点 ¥50：当前下注变 ¥50，余额变 ¥950，Deal 按钮启用。
- [ ] 再点 ¥50：当前下注 ¥100，余额 ¥900。
- [ ] 点"清空"：当前下注归 0，余额回到 1000。
- [ ] 下注 ¥50 后点 Deal：发 4 张牌，玩家 2 张明牌、庄家 1 明 1 暗，进入 Hit/Stand。
- [ ] 庄家暗牌阶段点数显示 `?`。
- [ ] 连点 Hit 直到爆牌（>21）：立即显示"你输了"，余额扣减，战绩 loss +1。
- [ ] 新一局：下注后 Stand：庄家翻开暗牌、自动要牌至 ≥17，显示输/赢/平与盈亏数字。
- [ ] 开局拿到 A+K：立即显示"Blackjack!"，余额按 2.5 倍返还。
- [ ] 连输至余额 0：显示"破产了！"与"重新开始"按钮；点击后余额恢复 1000、战绩清零。
- [ ] 刷新页面：余额与战绩从 localStorage 恢复。
- [ ] 移动端宽度（如 Chrome DevTools 375px）：布局不溢出，卡牌重叠正常。

- [ ] **Step 4: 最终 Commit（如有验证中修复）**

```bash
git add -A
git commit -m "test: 端到端验证通过" --allow-empty
```

---

## 完成标准

- `npm test` 全绿（game/ 与 hooks/ 单测）。
- `npm run build` 成功。
- Task 15 全部手动验证场景通过。
- 设计文档 spec 中第 4–9 节的所有规则与要求均有对应实现。
