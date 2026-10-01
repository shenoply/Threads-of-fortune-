import type { CutsceneShot } from './Cutscene';

// Story stage 3 on film: Nabil pays the three men and leads them in, then the orangutan sees them
// out (two silent clips with their own sound, tools/build-malek-cutscene-audio.py). Stages 2 and 4
// keep their paintings; stage 4 has its sound and Malek's line over the picture.
const V = 'art/malek/videos/';
export const STORY_FILM: Record<number, CutsceneShot[]> = {
  3: [
    { mp4: `${V}01-malek-goons-enter-5s.mp4`, webm: `${V}01-malek-goons-enter-5s.webm`, first: `${V}01-malek-goons-enter-5s-first.webp`, last: `${V}01-malek-goons-enter-5s-last.webp`, fx: 'audio/malek/cutscene-01.mp3',
      cues: [{ at: 1.1, until: 3.6, who: 'NABIL', text: 'There he is. Follow me.', voice: 'audio/malek/cutscene-nabil.mp3' }] },
    { mp4: `${V}02-malek-orangutan-drives-goons-out.mp4`, webm: `${V}02-malek-orangutan-drives-goons-out.webm`, first: `${V}02-malek-orangutan-drives-goons-out-first.webp`, last: `${V}02-malek-orangutan-drives-goons-out-last.webp`, fx: 'audio/malek/cutscene-02.mp3' },
  ],
};
