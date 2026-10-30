import { memo, type ImgHTMLAttributes } from 'react';
import type { Condition } from '../../game/types';
import { useWornSrc } from './wear';

/** A rug's picture with its condition drawn on it (dirt, wear, damage: see wear.ts). */
export const RugPicture = memo(function RugPicture({ src, condition, seed, ...rest }: { src: string; condition?: Condition; seed?: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  const shown = useWornSrc(src, condition, seed);
  return <img src={shown} data-condition={condition} {...rest} />;
});
