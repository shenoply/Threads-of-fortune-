// A voice generation provider, used only by development scripts in Node. Never imported by the
// game: provider keys must not reach src/, public/ or any VITE_* variable.
export interface VoiceGenerationProvider {
  name: string;
  generateSpeech(input: { text: string; voiceId: string; outputFormat?: string }): Promise<Blob>;
}
