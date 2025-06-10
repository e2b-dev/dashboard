'use client'

import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

// Add this before the Button component
const LOADER_VARIANTS = {
  line: ['|', '/', '─', '\\'],
  progress: ['▰▱▱▱▱▱', '▰▰▱▱▱▱', '▰▰▰▱▱▱', '▰▰▰▰▱▱', '▰▰▰▰▰▱', '▰▰▰▰▰▰'],
  compute: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
  dots: ['.  ', '.. ', '...', ' ..', '  .', '   '],
  clock: [
    '🕐',
    '🕑',
    '🕒',
    '🕓',
    '🕔',
    '🕕',
    '🕖',
    '🕗',
    '🕘',
    '🕙',
    '🕚',
    '🕛',
  ],
  bounce: ['⠁', '⠂', '⠄', '⠂'],
  wave: ['⠀', '⠄', '⠆', '⠇', '⠋', '⠙', '⠸', '⠰', '⠠', '⠀'],
  square: ['◰', '◳', '◲', '◱'],
  pulse: ['□', '◊', '○', '◊'],
} as const

export const Loader = ({
  variant = 'square',
  interval = 150,
  className,
}: {
  variant?: keyof typeof LOADER_VARIANTS
  interval?: number
  className?: string
}) => {
  const [index, setIndex] = useState(0)
  const chars = LOADER_VARIANTS[variant]

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % chars.length)
    }, interval)
    return () => clearInterval(timer)
  }, [chars, interval])

  return <span className={cn('font-mono', className)}>{chars[index]}</span>
}
