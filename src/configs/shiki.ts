import { ThemeRegistration } from 'shiki'
import { useTheme } from 'next-themes'
import { useMemo } from 'react'

import baseThemeDark from '@shikijs/themes/rose-pine'
import baseThemeLight from '@shikijs/themes/rose-pine-dawn'

export const SHIKI_THEME_DARK: ThemeRegistration = {
  ...baseThemeDark,
  bg: 'transparent',
}

export const SHIKI_THEME_LIGHT: ThemeRegistration = {
  ...baseThemeLight,
  bg: 'transparent',
}

export const useShikiTheme = () => {
  const { resolvedTheme } = useTheme()

  return useMemo(() => {
    if (resolvedTheme === 'dark') {
      return SHIKI_THEME_DARK
    }
    return SHIKI_THEME_LIGHT
  }, [resolvedTheme])
}
