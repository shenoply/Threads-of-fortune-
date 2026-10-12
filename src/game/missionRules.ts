// Small rules that keep the story missions free of busywork. They watch the state the same way the
// mission checks in the store do, and are loaded with the mission bar (components/Mission/Mission.tsx).
import { useGame } from './state/store';

// 1. Your father's rug goes with you while Farid has still to see it: no packing step, no trip back to
//    Giza for it, and Rashid's replacement (if it was lost) is sent on to wherever you are.
useGame.subscribe((s) => {
  if (!s.started || s.missions?.farid !== 'active' || s.world.appraised.length) return;
  if (!s.inventory.some((i) => i.typeId === 'fayoum-hearth' && i.stored)) return;
  useGame.setState({ inventory: s.inventory.map((i) => (i.typeId === 'fayoum-hearth' && i.stored ? { ...i, stored: false } : i)) });
});

// (Rashid's errand counting a rug bought in Alexandria during the opening is handled in the store.)
