import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Animation easing curves
 * ⚠️ Must be kept in sync with theme.css utilities (anim-ease-appear, anim-ease-transform)
 */
export const EASE_APPEAR = [0.23, 1, 0.32, 1] as const; // ease-out-quint
export const EASE_TRANSFORM = [0.79, 0.14, 0.15, 0.86] as const; // ease-in-out-circ
