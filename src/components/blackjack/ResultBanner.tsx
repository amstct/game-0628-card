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
