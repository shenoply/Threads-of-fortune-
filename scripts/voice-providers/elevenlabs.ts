// ElevenLabs text-to-speech, for the development script only. The key is read from the environment
// (ELEVENLABS_API_KEY in .env.local, which git ignores), never from Vite.
import type { VoiceGenerationProvider } from './types.ts';

export function elevenLabs(apiKey: string, opts: { modelId?: string; stability?: number; similarity?: number; style?: number } = {}): VoiceGenerationProvider {
  return {
    name: 'elevenlabs',
    async generateSpeech({ text, voiceId, outputFormat = 'mp3_44100_128' }) {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${outputFormat}`, {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: 'audio/mpeg' },
        body: JSON.stringify({
          text,
          model_id: opts.modelId ?? 'eleven_multilingual_v2',
          // steady, understated delivery: fairly high stability, no added style exaggeration
          voice_settings: { stability: opts.stability ?? 0.6, similarity_boost: opts.similarity ?? 0.85, style: opts.style ?? 0, use_speaker_boost: true },
        }),
      });
      if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 300)}`);
      return await r.blob();
    },
  };
}
