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
