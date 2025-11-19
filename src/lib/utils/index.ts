import { ClassValue } from 'class-variance-authority/types'

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
export function exponentialSmoothing(speed: number = 10) {
  return (t: number) => {
    // Clamp t to [0, 1] range for safety
    t = Math.max(0, Math.min(1, t))
    // Apply the exponential smoothing formula
    return 1 - Math.exp(-speed * t)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: Timer | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
      timeout = null
    }, wait)
  }
}
