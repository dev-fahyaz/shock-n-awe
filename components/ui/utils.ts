import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class strings, last-wins on conflicting utilities. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
