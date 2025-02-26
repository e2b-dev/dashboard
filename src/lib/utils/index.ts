import { ClassValue } from 'class-variance-authority/types'

import { twMerge } from 'tailwind-merge'
import { clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Creates an exponential smoothing easing function for Framer Motion animations.
 * This implements exponential smoothing as described in https://lisyarus.github.io/blog/posts/exponential-smoothing.html
 * where the position approaches the target value smoothly with a speed factor.
 * @param {number} speed - The speed factor that determines how quickly the value approaches the target (default: 10)
 * @returns {(t: number) => number} An easing function that takes a progress value between 0 and 1 and returns a smoothed value
 */
export const exponentialSmoothing =
  (speed: number = 10) =>
  (t: number): number => {
    // For Framer Motion, we want to map t from [0,1] to a smoothed value
    // Using exponential smoothing formula: 1 - exp(-speed * t)
    return 1 - Math.exp(-speed * t)
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
