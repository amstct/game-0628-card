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
