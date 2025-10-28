import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSSクラスを条件付きで結合
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
