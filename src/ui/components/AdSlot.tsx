import { FEATURES } from '../../platform/site';

/**
 * Reserved space for a future ad or sponsorship. Renders nothing while
 * FEATURES.ads is false. Never place it on the game screen.
 */
export function AdSlot({ placement }: { placement: 'home' | 'results' }) {
  if (!FEATURES.ads) return null;
  return <aside className="ad-slot" data-placement={placement} aria-hidden="true" />;
}
