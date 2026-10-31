// The Steam demo's summing-up (components/Demo/DemoEnd.tsx): what the merchant did in ten days.
import type { GameState } from './state/store';
import { fmt } from './economy/money';
import { storiesOf } from './systems/stories';
import { RIVAL_NAME } from './systems/laneRival';

const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const words = (n: number) => (n < NUM.length ? NUM[n] : String(n));

/** what the merchant has done in the demo, a line each, in the game's own voice */
export function demoDone(s: GameState): string[] {
  const out: string[] = [];
  const sold = s.totalSales ?? s.ledger.filter((l) => l.kind === 'sale').length;
  const takings = s.ledger.filter((l) => l.kind === 'sale').reduce((a, l) => a + l.amount, 0);
  out.push(sold ? `You sold ${words(sold)} rug${sold === 1 ? '' : 's'} across your father's counter, for ${fmt(takings)} in all.` : 'Your father\'s counter is still waiting for its first sale.');
  if (s.missions?.alexandria === 'done') out.push('You ran Rashid\'s errand to Alexandria and brought back a receipt he read twice.');
  else if ((s.journal ?? []).some((j) => j.text === 'Arrived in Alexandria.')) out.push('You reached Alexandria, though Rashid still waits for his receipt.');
  else if ((s.journal ?? []).some((j) => j.text === 'Arrived in Cairo.' || j.text === 'Took the Nile ferry to Cairo.')) out.push('You crossed the Nile to Cairo and saw the Khan for yourself.');
  if (s.onboard?.bandits) out.push('Robbers stopped you on the way north, and you came through with your stock.');
  const lane = s.lane?.last;
  if (lane) out.push(lane.kind === 'beaten' ? `The lane says you outsold ${RIVAL_NAME}. He has not forgiven it.` : `${RIVAL_NAME} across the lane has been watching every buyer you serve.`);
  const forgery = storiesOf(s).runs.forgery;
  if (forgery) out.push(forgery.status === 'done' ? 'The Muski still talks about Selim Tannous and his Mamluk carpet, and about you.' : 'Selim Tannous and his Mamluk carpet are not finished with you yet.');
  out.push(`Your purse holds ${fmt(s.cash)}${s.reputation > 0 ? `, and the bazaar puts your standing at ${s.reputation}` : ''}.`);
  return out;
}

