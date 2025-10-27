import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-wind-merge';

/**
 * Tailwind CSSクラスを条件付きで結合
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
