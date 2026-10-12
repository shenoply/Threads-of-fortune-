// Greetings that have real recordings (tools/voice-recordings/<speaker>/clips.json). A talk whose own
// opening line is not recorded yet begins with one of these, so the character is heard as you arrive.
// The text must match the recording word for word.
export const RECORDED_GREETINGS: Record<string, string[]> = {
  rashid: [
    'Look who crawled in from Giza. Sit down before you fall down.',
    'Welcome, welcome, pasha of the three rugs. Tea first. Then I rob you.',
    'You again? Good. A merchant who comes back is a merchant who is selling. Or begging.',
    'Come in, nephew. Mind the doorstep. It is worth more than your stall.',
    'Ahlan! I heard you coming from Bab Zuweila. Nobody else walks like a lost goat.',
    'Sit. Drink. Say nothing clever. My heart is old.',
  ],
};
