import React from 'react'

// reads css variables synchronously for immediate availability
function readCssVarsSync<T extends readonly string[]>(
  varNames: T
): Record<T[number], string> {
  if (typeof window === 'undefined') {
    return {} as Record<T[number], string>
  }

  const style = getComputedStyle(document.documentElement)
  const result: Record<T[number], string> = {} as Record<T[number], string>

  for (const name of varNames) {
    result[name as T[number]] = style.getPropertyValue(name).trim()
  }

  return result
}

// hook that resolves css custom properties to their computed values
export function useCssVars<T extends readonly string[]>(varNames: T) {
  const initialValues = React.useMemo(
    () => readCssVarsSync(varNames),
    [varNames]
  )

  const [values, setValues] = React.useState(initialValues)

  // listen for theme changes and update css variables
  React.useEffect(() => {
    let raf = 0

    const read = () => {
      const newValues = readCssVarsSync(varNames)

      // only update if values actually changed
      const hasChanged = varNames.some(
        (name) => newValues[name as T[number]] !== values[name as T[number]]
      )

      if (hasChanged) {
        setValues(newValues)
      }
    }

    const observer = new MutationObserver(() => {
      raf = window.requestAnimationFrame(read)
    })

    // watch for class changes on document element (theme changes)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(raf)
    }
  }, [varNames, values])

  return values
}
