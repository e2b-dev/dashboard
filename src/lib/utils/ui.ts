import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates an exponential smoothing easing function based on the mathematical
 * formula: 1 - exp(-speed * t)
 *
 * This provides natural, smooth animations that start fast and slow down
 * as they approach the target, similar to physical damping.
 *
 * @param speed - Controls the animation speed. Higher values = faster animation.
 *                Typical range: 5-50. Default: 10.
 * @returns An easing function that takes t (0-1) and returns the eased value
 *
 * @see https://lisyarus.github.io/blog/posts/exponential-smoothing.html
 */
export function exponentialSmoothing(speed: number = 6) {
  return (t: number) => {
    // Clamp t to [0, 1] range
    t = Math.max(0, Math.min(1, t));
    // Apply the exponential smoothing formula
    return 1 - Math.exp(-speed * t);
  };
}
