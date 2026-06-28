# 21 点卡牌网页游戏 — 设计文档

- **日期**：2026-06-28
- **状态**：已确认，待实现计划
- **技术栈**：Next.js 15（App Router）+ TypeScript + Tailwind CSS + shadcn/ui
- **定位**：最小可玩版本（MVP）的虚拟筹码 21 点（Blackjack）

---

## 1. 概述与目标

一个纯前端的 21 点网页游戏。玩家用虚拟筹码下注，与庄家比点数，追求最接近 21 点而不爆牌。

**核心循环**：下注 → 发牌 → 玩家行动（Hit / Stand）→ 庄家自动行动 → 结算 → 下一局。

**成功标准**：
- 完整可玩的标准 21 点核心循环。
- 虚拟筹码下注系统，余额随输赢增减，可输光重置。
- 简约现代的视觉风格，桌面与移动端可用。
- 游戏规则逻辑与 UI 完全解耦，规则层有完整单元测试覆盖。

## 2. 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 15，App Router |
| 语言 | TypeScript |
| 样式 | Tailwind CSS + shadcn/ui（Button、Card、Badge 等基础组件）|
| 状态 | React 内置 `useReducer` + 自定义 hook（零额外状态库）|
| 持久化 | 浏览器 `localStorage` |
| 测试 | Vitest（逻辑层单元测试）|
| 部署形态 | 纯前端，无后端、无数据库 |

整个游戏运行在单个客户端组件树（`'use client'`）中。

## 3. 整体架构与目录结构

核心设计原则：**纯逻辑层与 UI 层严格分离**。`game/` 是纯 TypeScript 逻辑，零 React 依赖，所有规则可独立单元测试；`components/` 只负责渲染与派发 action，绝不内嵌业务规则；`useBlackjack` 是两者间的桥梁。

```
src/
  app/
    page.tsx                 # 入口，渲染 <BlackjackTable/>
  components/blackjack/      # UI 层（只渲染 + 派发 action，不含规则）
    BlackjackTable.tsx       # 顶层容器，组合所有子组件 + 接 hook
    CardView.tsx             # 单张扑克牌（CSS/SVG 自绘，简约风）
    Hand.tsx                 # 一手牌（玩家/庄家）的展示
    BettingControls.tsx      # 下注区：筹码档位按钮
    ActionBar.tsx            # Hit / Stand / Deal 按钮
    ResultBanner.tsx         # 结算横幅（赢/输/平/Blackjack）
    BalanceHUD.tsx           # 顶部余额 + 战绩
  game/                      # 纯逻辑层（零 React 依赖，可独立单测）
    types.ts                 # Card、Suit、Rank、GamePhase、Result 等类型
    deck.ts                  # 创建牌组、洗牌、抽牌
    scoring.ts               # 点数计算（A 软/硬处理）、Blackjack 判定
    rules.ts                 # 庄家行动、结算判定、赔付计算、playDealer()
    reducer.ts               # GameState + Actions + reducer + 初始状态
  hooks/
    useBlackjack.ts          # 封装 useReducer，对外暴露状态与操作
```

## 4. 游戏规则

### 4.1 牌组与发牌
- 标准单副 52 张牌（4 花色 × 13 点数），**每局开始重新洗牌**。
- 开局：玩家 2 张明牌；庄家 1 张明牌 + 1 张暗牌（hole card）。

### 4.2 点数计算（`scoring.ts`）
- 2–10 按面值；J/Q/K = 10；A = 1 或 11。
- A **自动取最优**：能不爆牌就按 11，否则按 1。
- "软牌"（soft）：含一张按 11 计且总分 ≤ 21 的手牌。

### 4.3 阶段流转（状态机 `GamePhase`）
`betting`（下注）→ `playerTurn`（玩家行动）→ `dealerTurn`（庄家自动行动）→ `settled`（结算）

| 阶段 | 允许的操作 |
|---|---|
| betting | 选筹码叠加下注 / 清空下注 / 确认开牌（Deal）|
| playerTurn | Hit（要牌）/ Stand（停牌）|
| dealerTurn | 全自动，按钮禁用 |
| settled | 显示结果 / 下一局（Next Round）|

### 4.4 庄家规则（`rules.ts`）
- 玩家停牌或爆牌后，翻开暗牌。
- 庄家点数 **< 17 必须要牌，≥ 17 必停**（硬 17 规则）。
- 庄家爆牌则玩家赢。

### 4.5 结算与赔付
| 结果 | 条件 | 盈利 |
|---|---|---|
| 玩家 Blackjack | 开局两张 = 21 | 下注 × 1.5（3:2）|
| 玩家普通赢 | 点数更高 / 庄家爆牌 | 下注 × 1（1:1）|
| 平局 | 点数相等 | 0（退回本金）|
| 玩家输 | 爆牌 / 点数更低 | −下注 |

### 4.6 默认数值
- 起始筹码：**1000**。
- 筹码档位：**10 / 25 / 50 / 100**（点击叠加，单次下注不可超过当前余额）。
- 输光（余额 = 0）：显示"破产"，提供"重新开始"按钮重置回 1000。

## 5. 状态管理（`reducer.ts`）

### 5.1 State 结构

```ts
type GamePhase = 'betting' | 'playerTurn' | 'dealerTurn' | 'settled';
type Result = 'playerBlackjack' | 'playerWin' | 'push' | 'playerLoss' | null;

interface GameState {
  phase: GamePhase;
  balance: number;          // 可用余额（下注时实时扣减）
  currentBet: number;       // 当前桌面下注金额
  deck: Card[];             // 当前牌组
  playerHand: Card[];
  dealerHand: Card[];
  holeRevealed: boolean;    // 庄家暗牌是否翻开
  result: Result;           // 结算结果（settled 阶段填充）
  stats: { wins: number; losses: number; pushes: number };
}
```

### 5.2 Actions

`PLACE_BET(n)` / `CLEAR_BET` / `DEAL` / `HIT` / `STAND` / `SETTLE` / `NEXT_ROUND` / `RESET_BANKROLL` / `HYDRATE(saved)`（启动时从 localStorage 恢复）

### 5.3 数据流：一局的完整流转

关键约定——**点击筹码即从余额扣款**（钱从钱包移到桌面），`balance` 实时反映可用余额：

| Action | 行为 |
|---|---|
| `PLACE_BET(n)` | `n ≤ balance` 才生效：`currentBet += n`，`balance -= n` |
| `CLEAR_BET` | `balance += currentBet`，`currentBet = 0`（钱退回钱包）|
| `DEAL` | 要求 `currentBet > 0`；洗牌、发玩家 2 张 + 庄家明 1 暗 1；→ `playerTurn`；若玩家或庄家开局即 Blackjack，直接进入结算 |
| `HIT` | 抽一张给玩家；若爆牌（>21）立即结算（玩家输）|
| `STAND` | → `dealerTurn`；`playDealer()` 一次性算出庄家最终手牌，`holeRevealed = true`；进入结算 |
| `SETTLE` | 按 `result` 结算余额、更新 `stats`；→ `settled` |
| `NEXT_ROUND` | 新洗一副完整牌、`currentBet = 0`、清空双手；→ `betting`（保留余额）|
| `RESET_BANKROLL` | 破产重置：`balance = 1000`、`stats` 清零；→ `betting` |

**结算时余额增减**（本金已在 `PLACE_BET` 时扣走）：
- 玩家 Blackjack：`balance += currentBet × 2.5`（本金 + 1.5 倍盈利）
- 玩家普通赢：`balance += currentBet × 2`
- 平局：`balance += currentBet`（退回本金）
- 玩家输：不变

## 6. UI 组件与布局

### 6.1 牌桌整体布局（简约现代风）

```
┌────────────────────────────────────────┐
│ BalanceHUD      余额 ¥1000   战绩 3-2-1 │ ← 顶部
├────────────────────────────────────────┤
│            庄家  [🂠][🂡]    点数 ?       │
│              ╶╶ 21 点桌 ╴╴              │
│            玩家  [🂢][🂣]   点数 18       │
├────────────────────────────────────────┤
│  当前下注 ¥50          [Hit] [Stand]     │ ← 底部操作区
│  (betting 阶段显示筹码档位 10/25/50/100) │   (依 phase 切换)
└────────────────────────────────────────┘
        居中，max-w-3xl，移动端自适应
```

### 6.2 各组件职责

- **`CardView`** — 单张牌（核心视觉）。纯 CSS/SVG 自绘，零图片资源。props：`{ card, faceDown }`。正面：白底圆角卡，左上/右下角点数+花色，中间大花色符号；♥♦ 红色、♠♣ 深色。背面：shadcn primary 色调 + 简单纹样。进场动画：轻微滑入 + 翻转（纯 CSS `@keyframes`，不引依赖）。
- **`Hand`** — 一手牌。横向排列、轻微重叠（堆叠效果）。显示点数；庄家暗牌未翻时显示明牌点数或 `?`。
- **`BettingControls`**（betting 阶段）/ **`ActionBar`**（playerTurn 阶段）— 两者按 `phase` 切换显示。下注区：4 个筹码档位按钮 + 当前下注 + 清空 / Deal；余额不足的档位禁用。
- **`ResultBanner`**（settled 阶段）— 大字结果 + 盈亏 + "下一局"按钮。
- **`BalanceHUD`** — 余额 + 战绩。

### 6.3 卡牌视觉与动画策略
逻辑上 `playDealer()` **一次性算出**庄家最终手牌（保持 reducer 纯净，无 `setTimeout` 状态机）；视觉上用 **CSS 逐张延迟动画**做出"逐张翻开"效果。**两者解耦**——动画是渲染层的事，不影响状态。因此**不引入 framer-motion**，只用 Tailwind + CSS `@keyframes`。

### 6.4 响应式
桌面 / 移动端同一布局，靠响应式字号 + 卡牌重叠适配；MVP 不做横向滚动。

## 7. 持久化（`localStorage`）

- 存储 key：`blackjack:save`，内容 `{ balance, stats }`。
- 初始化用默认值（`balance = 1000`），**mount 后 `useEffect` 读取并 dispatch `HYDRATE` 覆盖**——避免 Next.js SSR 的 `localStorage` 访问与 hydration mismatch。
- `balance` / `stats` 变化时 `useEffect` 自动写回。

## 8. 错误处理

- **非法 action 防御**：reducer 对当前 `phase` 不合法的 action（如 betting 阶段 `HIT`）直接返回原 state（no-op）。
- **下注越界**：`PLACE_BET` 校验 `n ≤ balance`，否则忽略；不足的筹码按钮禁用。
- **牌组抽空**：每局 `NEXT_ROUND` 重新生成完整 52 张，一局最多约 20 张，绝不抽空；`drawCard()` 仍做空值兜底。
- **Deal 门槛**：`currentBet === 0` 时禁用 Deal 按钮。

## 9. 测试策略（重点）

`game/` 纯逻辑层是规则正确性的命脉，**用 Vitest 全面单测**：

- **`scoring`**：A 软/硬切换、爆牌、Blackjack 判定（各种手牌组合）。
- **`rules`**：庄家 `< 17 要 / ≥ 17 停`、**所有 4 个结算分支**、赔付金额正确。
- **`reducer`**：完整局流转、非法 action no-op、下注越界、破产重置、`HYDRATE`。
- UI 层 MVP 阶段以手动验证为主（后续可加 React Testing Library）。

## 10. 范围边界（明确不做 — YAGNI）

为保持 MVP 精简，以下功能**不在本期范围**：
- Split（分牌）、Double Down（加倍）、Surrender（投降）、Insurance（保险）。
- 多手 / 多玩家。
- 多副牌（鞋）、计牌。
- 服务端、账号系统、排行榜。
- 音效、主题切换、动画库（framer-motion）。
- 战绩之外的成就系统。

这些均可在 MVP 跑通后作为后续迭代增量加入。
