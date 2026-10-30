// The first-sale lesson is day one's: Samira only comes then. A Sandbox game (no opening) where day one
// ends without that sale used to stay "in the lesson" for good, so the Today chip (Rashid's gift and his
// runner) never showed, while every morning card said the gift was waiting under Today.
//   npx tsx tests/lesson-night.ts
// no browser: the sound engine is silenced (it would look for an AudioContext)
const A = await import('../src/game/audio/engine');
for (const k of ['sfx', 'mood', 'music', 'ambience', 'ensure']) if (typeof (A.audio as unknown as Record<string, unknown>)[k] === 'function') (A.audio as unknown as Record<string, unknown>)[k] = () => false;
const S = await import('../src/game/state/store');
const D = await import('../src/game/systems/daily');
const { useGame } = S;
const g = () => useGame.getState();

let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };

// a Sandbox game: day one passes with no sale to Samira
g().reset();
g().startSandbox({ kind: 'hassan' });
g().beginDayOne();
ok(!g().tutorial.done && g().day === 1, 'day one: the lesson is still open');
g().endDay();
ok(g().day === 2 && g().tutorial.done, 'the night after day one ends the lesson');

// the gift and the runner can be had on the days that follow
for (let d = 2; d <= 4; d++) {
  ok(D.giftToday(g().daily, g().day).open, `day ${g().day}: today's gift is there to open`);
  const gift = g().openGift();
  ok(!!gift && g().daily?.giftDay === g().day, `day ${g().day}: opened (${gift?.text})`);
  ok(g().openGift() === null, `day ${g().day}: and only once`);
  ok(!!g().openPouch() && g().openPouch() === null, `day ${g().day}: the runner's purse once`);
  g().endDay();
}
ok(g().daily?.streak === 3, `three days in a row (${g().daily?.streak})`);

// a lesson finished on day one is left as it was
g().reset();
g().startSandbox({ kind: 'hassan' });
g().beginDayOne();
g().skipTutorial();
g().endDay();
ok(g().tutorial.done && g().tutorial.step === 'done', 'a lesson already done stays done');

console.log(fails ? `\n${fails} failed` : '\nall ok');
process.exit(fails ? 1 : 0);
