// A second way of saying what a regular had only one way to say, so a return visit does not repeat a
// line word for word. Not recorded: these are shown as text only, and never replace a recorded line.
// A sum named here must be the same sum as in the buyer's own line (negotiation.ts reads it as what
// they will spend).
type More = Partial<Record<string, string[]>>;

export const UNVOICED_LINES: Record<string, More> = {
  samira: {
    budgetLate: ['Ten pounds, for the right piece. I shall not pretend otherwise, and I shall not go further.'],
    holdGive: ['Very well. {price}. You may tell no one I gave in.'],
    badSale: ['It is bought. Ask me in a month whether I am glad.'],
  },
  yusuf: {
    budgetLate: ['Five pounds, my friend. My wife says four. Somewhere between, if you are reasonable.'],
    budgetEarly: ['Five pounds at most. Less, and we are friends for life.'],
    holdGive: ['You do not move, eh? {price}. Wrap it.'],
    badSale: ['Bought. If the porters ruin it, I bring it back to you in pieces.'],
  },
  mariam: {
    budgetLate: ['We have three pounds fifty put by. Perhaps a little over, if it is the right one.'],
    budgetEarly: ['It is not very much. About three pounds. A little more, perhaps.'],
    holdGive: ['Then {price}. Karim will understand. I hope.'],
    badSale: ['I have bought it. I hope it looks better at home.'],
  },
  hassan: {
    budgetLate: ['Four pounds for the right rug. Four and a half if it makes the men stop talking. Not a piastre over.'],
    budgetEarly: ['Two pounds. Three, if you make me laugh.'],
    holdGive: ['Stubborn man. {price}, then, and you drink a coffee with me.'],
    badSale: ['It is mine now. The men will have something to argue about.'],
  },
};

/** every line above, so a recorded line is always chosen first and these only stand in for one just said */
export const UNVOICED_SET = new Set(Object.values(UNVOICED_LINES).flatMap((m) => Object.values(m).flat() as string[]));
