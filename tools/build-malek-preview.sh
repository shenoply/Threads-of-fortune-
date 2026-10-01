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
cp public/audio/intro/malek.mp3 dist-preview/audio/intro/

# stand-ins so the preview's console stays clean: no voices or recorded sounds are shipped with it
mkdir -p dist-preview/voices dist-preview/audio
echo '{"sprites":{}}' > dist-preview/voices/manifest.json
echo '{}' > dist-preview/audio/soundbank.json
du -sh dist-preview
