'use client';

import { Button } from '@/components/ui/button';

export function ActionBar({
  onHit,
  onStand,
}: {
  onHit: () => void;
  onStand: () => void;
}) {
  return (
    <div className="flex justify-center gap-3">
      <Button onClick={onHit}>要牌 Hit</Button>
      <Button variant="secondary" onClick={onStand}>
        停牌 Stand
      </Button>
    </div>
  );
}
