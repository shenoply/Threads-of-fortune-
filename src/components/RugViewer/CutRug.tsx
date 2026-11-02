import type { CSSProperties, ImgHTMLAttributes } from 'react';
import crops from '../../data/rugCrops.json';

// A full-size rug photograph shown without its pale studio ground, for the few large flat views (the
// reveal, the auction floor). The carpet's box in each photograph is found once by
// tools/trim-rug-thumbs.py (the same rule as trim.ts) and kept in rugCrops.json, so nothing is decoded
// or scanned here: a frame the carpet's shape, and the picture inside it scaled and moved so only the
// carpet shows. The thumbnails (art/rugs/thumbs) are already cut, so cards need none of this.

type Box = [number, number, number, number, number];
const BOXES = crops as unknown as Record<string, Box>;

/** the carpet's box for a rug photograph's path, as fractions of the picture (x, y, w, h, aspect) */
export function cutFor(src: string): Box | undefined {
  const m = /art\/rugs\/([^/]+)\.webp$/.exec(src);
  return m ? BOXES[m[1]] : undefined;
}

export function CutRug({ src, className, style, ...rest }: { src: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  const b = cutFor(src);
  if (!b) return <img src={src} className={className} style={style} {...rest} />;
  const [x, y, w, h, ar] = b;
  const frame = { '--ar': ar } as CSSProperties;
  const pic: CSSProperties = { position: 'absolute', left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%`, width: `${100 / w}%`, height: `${100 / h}%`, maxWidth: 'none', maxHeight: 'none', minWidth: 0, objectFit: 'fill', boxShadow: 'none', border: 0, ...style };
  return (
    <span className={`cutrug ${className ?? ''}`} style={frame} data-cut="1">
      <img src={src} style={pic} {...rest} />
    </span>
  );
}
