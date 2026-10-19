import Image from 'next/image';

export interface HalftoneImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  reveal?: boolean;
  sizes?: string;
  className?: string;
}

export function HalftoneImage({ src, alt, width, height, sizes, className }: HalftoneImageProps) {
  return <Image src={src} alt={alt} width={width} height={height} sizes={sizes} className={className} />;
}
