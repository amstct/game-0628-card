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
