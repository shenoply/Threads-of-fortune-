# Malek cutscene — video and audio handoff for Claude

Integrate these finished clips into **Threads of Fortune**, the existing Vite/React/TypeScript game. Inspect the current repository, Malek event chain, asset helpers, audio manager and saved state before changing code. Preserve existing story triggers and character identities.

## Available videos and order

Both MP4s are in the Google Drive **Malek** folder:
https://drive.google.com/drive/folders/1I2xKkzSxPga3CrTjhN7In59G7zfEC6Jg

1. `01-malek-goons-enter-5s.mp4` — short man pays the hired men, turns toward the restaurant and leads them inside. Actual duration **5.0625 seconds**, **832×560**, H.264, no audio.
   https://drive.google.com/file/d/13ezbTlGRAeibf-AyPiEbQnPnDMLs4np1/view
2. `02-malek-orangutan-drives-goons-out.mp4` — orangutan reacts and the men scramble toward the exit. Actual duration **3.5625 seconds**, **832×560**, H.264, no audio.
   https://drive.google.com/file/d/1O9UIFRssbLnV597CM1UJp1bFLfwPsKbn/view

**The third video, Malek rewarding the orangutan with a shawarma, has NOT been generated.** A still illustration exists. Locate it in Malek's existing assets; do not claim a third MP4 exists. If necessary, end this cutscene after clip 2 and show the existing reward still through the normal event interface.

## Integration

- Copy the videos into an appropriate existing asset directory, preferably `public/art/malek/videos/`, retaining the numbered filenames.
- Use the project's base-URL-aware asset helper. GitHub Pages runs beneath `/Threads-of-fortune-/`; do not use unqualified root asset URLs.
- Use one reusable cutscene component, with video and audio behind the game's established event system. Avoid adding another intrusive popup over existing controls.
- Play clip 1 then clip 2 when the existing story places these actions in the same encounter. If the event chain deliberately spreads them over separate visits/days, preserve that pacing and associate each clip with its corresponding existing event. Do not fire the whole chain on every visit.
- Match the actual video ratio, **832:560**. Preserve the full image using `object-fit: contain`; do not stretch or crop away feet or the doorway. Use a neutral dark surround when letterboxing is necessary.
- A hard cut between the two shots is acceptable. No loading flash: preload the next video, wait for readiness, and retain the last frame or a poster while loading.
- Provide Play, Skip, sound on/off and subtitle controls, sized for mobile. Start with a user gesture if the browser blocks playback with sound. Always handle rejected `play()` promises.
- If autoplay fails, show a clear Play button. If a clip cannot load, show its existing scene still and allow the event to continue.
- Apply game outcomes once, through existing state transitions. Prevent double rewards or repeated penalties on skip, replay, component rerender or page reload. Avoid changing the save version unless a genuine state migration is required.

## Add matching audio

These MP4s are silent. **Add a separate, synchronized audio layer**. Preferred delivery: one finished sound-effects track per clip plus optional separate dialogue/subtitle cues, using the existing audio manager. An embedded-audio MP4 can also work if game volume/mute controls still behave correctly.

Use sounds created for this project or verified assets with rights suitable for the game's intended distribution. Record the source and license for every borrowed sound. Do not download random film soundtracks or copy commercial game audio. These timings are starting points: inspect the actual frames and align each sound to visible contact or movement before final export.

### Clip 1 — arrival, 5.0625 seconds

| Approximate time | Cue | Direction |
|---|---|---|
| Whole clip | Quiet restaurant/street bed | Gentle charcoal sizzle and distant market murmur, kept below actions. No recognizable speech required. |
| 0.0–0.8 s | Coin pouch | Brief soft coin jingle and cloth rustle at the handover. |
| 0.8–2.0 s | Turn and first steps | Leather shoe scuffs as the short man turns and approaches the entrance. |
| 1.6–5.0 s | Group footsteps | Stagger several sets of footsteps on stone, changing to a slightly enclosed sound at the doorway. Match visible footfalls. |
| Visible threshold contacts | Clothing/wood detail | Optional light cloth movement or threshold creak. The entrance is already open: do not add an unexplained door slam. |

### Clip 2 — orangutan intervention, 3.5625 seconds

| Approximate time | Cue | Direction |
|---|---|---|
| Whole clip | Same restaurant bed | Continue the charcoal/room ambience for continuity. |
| 0.2–1.2 s | Orangutan vocalization | Short, low, throaty grunt timed to its visible mouth/shoulder movement. Keep it an animal vocalization, not a lion roar or human monster voice. |
| 0.5–2.5 s | Slapstick scramble | Shoe scuffs, cloth movement and occasional light furniture rattle where movement is visible. Avoid invented heavy impacts. |
| 1.0–3.4 s | Retreating feet | Fast, irregular footsteps toward the exit, with one or two brief startled reactions if suitable recordings exist. |
| End | Ambience settles | Briefly lower the commotion while retaining the room bed; no abrupt audio clipping. |

The suggested timings overlap deliberately. Do not play a dense wall of sound: foreground only the cues matching the strongest visible action. These videos contain generated motion; do not amplify visual anomalies with added sound.

## Optional dialogue

Dialogue is optional and separate from the effects. Reuse the game's established character voices if they exist. Do not invent a voice clone from someone else's recording. Keep lines short enough for the shot, and show readable subtitles.

- Short man, clip 1: **“There he is. Follow me.”**
- Malek, after the commotion or over the reward still: **“Good lad. You've earned a shawarma.”**

These clips have **no generated lip-sync**. Do not promise synchronized mouth animation. Treat spoken lines as off-screen dialogue, or put the line in the game's dialogue panel before/after the clip. Add no voice line just to fill silence.

## Playback synchronization and sound controls

- Drive cue timing from the active video's `currentTime`, not from a timer started when the React component mounts.
- Start/unlock audio after the same user gesture that begins playback. Respect existing master volume, effects volume, voice volume and mute settings.
- On pause, seek, skip, tab hiding, navigation or unmount: pause/stop the corresponding audio and clear scheduled cues. On resume/seek: resynchronize to the current frame; do not replay earlier cues accidentally.
- Prevent effects from firing twice. Distinguish a replay requested by the player from a rerender.
- If using separate audio tracks, correct drift and handle buffering. If using an embedded soundtrack, route its volume through the same settings as the rest of the game.
- Duck background music during the cutscene and restore it afterward. Use short fades to prevent clicks; avoid clipping in the mixed track.
- Allow captions/subtitles and silent playback. The event must work with audio muted or unavailable.

## Third scene still fallback

If the existing reward still is used, hold it long enough to read the line or let the player advance it. Add gentle grill ambience, a soft wrap/cloth rustle and, optionally, a quiet pleased orangutan grunt. Do not claim chewing or hand movement is animated in the still.

## Verify before publishing

Play the complete encounter on desktop and mobile, including the deployed GitHub Pages subpath. Check the first-load Play button, transition between clips, full-frame display, skip/pause/replay, background music restoration, mute/volume/subtitles, loading fallback and navigation cleanup. Confirm no duplicate story outcomes and no lingering sound after leaving. Return the working build and list any audio assets still missing; do not use silent placeholder files and report audio complete.
