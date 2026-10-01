#!/bin/sh
# Build the Malek's grill preview into dist-preview/ with just the art it uses.
set -e
cd "$(dirname "$0")/.."
npx vite build --config vite.preview.config.ts
mkdir -p dist-preview/art/malek dist-preview/art/portraits
cp public/art/malek/*.webp dist-preview/art/malek/
cp public/art/portraits/malek.jpg public/art/portraits/malek-stall2.webp dist-preview/art/portraits/
mkdir -p dist-preview/video dist-preview/audio/intro
cp public/video/malek-intro* dist-preview/video/
cp public/audio/intro/*.mp3 dist-preview/audio/intro/
# the paintings the other films use
mkdir -p dist-preview/art/world dist-preview/art/cities dist-preview/art/arran/scenes
cp public/art/world/giza-district.jpg public/art/world/city-alexandria.jpg dist-preview/art/world/
cp public/art/cities/cairo-1925-map.webp dist-preview/art/cities/
cp public/art/arran/13-lab-room.webp public/art/arran/11-lab-inspect.webp dist-preview/art/arran/
cp public/art/arran/scenes/s02.webp public/art/arran/scenes/s05.webp dist-preview/art/arran/scenes/
cp public/art/portraits/abuhamid.jpg public/art/portraits/rashid.jpg public/art/portraits/nabil.jpg public/art/portraits/nabil-stall2.webp public/art/portraits/cohen.jpg public/art/portraits/cohen-stall2.webp dist-preview/art/portraits/

# stand-ins so the preview's console stays clean: no voices or recorded sounds are shipped with it
mkdir -p dist-preview/voices dist-preview/audio
echo '{"sprites":{}}' > dist-preview/voices/manifest.json
echo '{}' > dist-preview/audio/soundbank.json
du -sh dist-preview
