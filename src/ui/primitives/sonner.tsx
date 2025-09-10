'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ toastOptions, ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      style={
        {
          '--normal-bg': 'var(--bg-1)',
          '--normal-text': 'var(--fg)',
          '--normal-border': 'var(--stroke)',
        } as React.CSSProperties
      }
      toastOptions={{
        className: '!rounded-none !py-3 !px-4 !gap-1.5',
        ...toastOptions,
      }}
      {...props}
    />
  )
}

export { Toaster }
