// Read CSS variables after theme class has been applied
// This hook ensures we get the correct CSS variable values after theme changes

import React from 'react'

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
