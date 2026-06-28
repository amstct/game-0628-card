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
