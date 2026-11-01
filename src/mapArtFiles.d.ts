// the file names in public/art/map, listed by the build (vite.config.ts mapArtFiles)
declare module 'virtual:map-art-files' {
  const files: string[];
  export default files;
}
