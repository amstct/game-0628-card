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
