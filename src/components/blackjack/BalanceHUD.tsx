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
