import Image from 'next/image';
import logo from '../assets/quintaste-logo.png';

/** Same approved asset as the consumer app's assets/brand/quintaste-logo.png. */
export function BrandLogo({ width = 176 }: { width?: number }) {
  return <Image className="brand-logo" src={logo} alt="QuinTaste" width={width} height={width / 3} unoptimized loading="eager" />;
}
