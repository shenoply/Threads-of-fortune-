// A film's own sound (a <video>, or the voice that goes with it) under the Settings > Sound
// sliders: it starts at the right level and follows any slider moved while it plays, and switching
// its channel off silences it without stopping the picture. Speech goes on the dialogue channel.
// (Set before the browser paints, so a film that starts by itself never begins at full volume.)
import { useLayoutEffect, type RefObject } from 'react';
import { audio } from './engine';

/** `deps`: when the player itself can come and go (shown only while a film is up), pass what decides
 *  that, so a new player is taken on each time. `f` is the film's own level under the sliders. */
export function useFilmSound(ref: RefObject<HTMLMediaElement | null>, kind: 'dialogue' | 'music' | 'sfx' = 'dialogue', f = 1, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    return audio.attachFilm(el, kind, f);
  }, [kind, f, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
}
