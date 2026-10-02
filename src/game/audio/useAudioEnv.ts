import { useEffect, useId } from 'react';
import { audio, type Env, type MusicCtx } from './engine';

const PORTS = ['alexandria', 'portsaid', 'suez', 'jaffa', 'beirut', 'istanbul'];
const LEVANT = ['jerusalem', 'damascus', 'amman', 'baghdad'];
/** The sound of a town: harbour towns hear the sea, desert places the wind. */
export const townEnv = (sid: string): Env => (PORTS.includes(sid) ? 'port' : sid === 'sinai' || sid === 'bedouin' ? 'road' : 'market');
export const townMusic = (sid: string): MusicCtx =>
  sid === 'istanbul' || sid === 'ankara' || sid === 'konya' ? 'istanbul'
  : sid === 'sinai' || sid === 'bedouin' ? 'desert'
  : PORTS.includes(sid) ? 'port'
  : LEVANT.includes(sid) ? 'levant'
  : 'town';

/** While a screen is open, it sets the ambience (and optionally the music) for where the player is. */
export function useAudioEnv(env: Env | null, music?: MusicCtx) {
  const key = useId();
  useEffect(() => {
    if (!env) return;
    audio.pushEnv(key, env, music);
    return () => audio.popEnv(key);
  }, [key, env, music]);
}
