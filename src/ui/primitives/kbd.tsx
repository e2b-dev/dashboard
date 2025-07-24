'use client'

import { cn } from '@/lib/utils'
import * as React from 'react'
import { useEffect, useState } from 'react'
import ClientOnly, { ClientOnlyProps } from '../client-only'
import { Badge, BadgeProps } from './badge'

export interface KbdProps {
  keys: string[]
  className?: string
  badgeProps?: BadgeProps
  clientOnlyProps?: Omit<ClientOnlyProps, 'children'>
}

export function Kbd({
  keys,
  className,
  badgeProps,
  clientOnlyProps,
}: KbdProps) {
  const [isMac, setIsMac] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check platform
    setIsMac(navigator.platform.toLowerCase().includes('mac'))
    // Basic mobile detection
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  if (isMobile) {
    return null
  }

  const formatKey = (key: string) => {
    switch (key.toLowerCase()) {
      case 'cmd':
      case 'command':
        return isMac ? '⌘' : 'Ctrl'
      case 'option':
      case 'alt':
        return isMac ? '⌥' : 'Alt'
      case 'shift':
        return isMac ? '⇧' : 'Shift'
      default:
        return key.toUpperCase()
    }
  }

  const isSymbolKey = (key: string) => {
    const symbolKeys = ['cmd', 'command', 'option', 'alt', 'shift']
    return symbolKeys.includes(key.toLowerCase())
  }

  // if the key is a symbol key, we scale it up
  return (
    <ClientOnly
      className={cn('pointer-events-none', className)}
      {...clientOnlyProps}
    >
      <Badge variant="muted" {...badgeProps}>
        {keys.map((key, index) => {
          const formattedKey = formatKey(key)
          return (
            <React.Fragment key={key}>
              {index > 0 && '+'}
              {isMac && isSymbolKey(key) ? (
                <span className="scale-[1.4]">{formattedKey}</span>
              ) : (
                formattedKey
              )}
            </React.Fragment>
          )
        })}
      </Badge>
    </ClientOnly>
  )
}
