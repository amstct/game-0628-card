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
