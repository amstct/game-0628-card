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
