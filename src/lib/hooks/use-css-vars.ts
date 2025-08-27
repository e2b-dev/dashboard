// Read CSS variables after theme class has been applied
// This hook ensures we get the correct CSS variable values after theme changes

import React from 'react'

/**
 * Hook that resolves CSS custom properties (CSS variables) to their computed JavaScript values.
 * This is useful for accessing theme colors and other CSS variables in JavaScript/React components.
 *
 * @param varNames - Array of CSS variable names to resolve. Pass as a const array for proper type inference.
 *                   Example: ['--color-primary', '--spacing-md'] as const
 * @param deps - React dependency list that triggers re-evaluation of CSS variables
 * @returns Record mapping each CSS variable name to its resolved string value
 */
export function useCssVars<T extends readonly string[]>(
  varNames: T,
  deps: React.DependencyList
) {
  const [values, setValues] = React.useState<Record<T[number], string>>(
    {} as Record<T[number], string>
  )

  React.useEffect(() => {
    let raf = 0

    const read = () => {
      const style = getComputedStyle(document.documentElement)
      const next: Record<T[number], string> = {} as Record<T[number], string>

      for (const name of varNames) {
        next[name as T[number]] = style.getPropertyValue(name).trim()
      }

      setValues(next)
    }

    raf = window.requestAnimationFrame(read)

    return () => window.cancelAnimationFrame(raf)
  }, deps)

  return values
}
