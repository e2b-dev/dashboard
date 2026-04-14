import type React from 'react'
import { cn } from '@/lib/utils/index'
import type { IconProps } from '@/ui/primitives/icons/types'

const LINES = [
  '                                ',
  '                                ',
  '                                ',
  '                                ',
  '           -********-           ',
  '          -*--     -*-          ',
  '         -*-        -*-         ',
  '         **-        -**         ',
  '        -*-          -*-        ',
  '        -**----------**-        ',
  '        ----**----**----        ',
  '            -******-            ',
  '                                ',
  '                                ',
  '                                ',
  '                                ',
]

const TEXT_STYLE: React.CSSProperties = {
  fontSize: '3.8px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 600,
  letterSpacing: '-0.038px',
  fontFeatureSettings: "'ss03' 1",
}

export const AlertAsciiIcon = ({ className, ...props }: IconProps) => (
  <svg
    aria-hidden
    className={cn('size-[72px]', className)}
    preserveAspectRatio="xMidYMid meet"
    role="none"
    viewBox="0 0 74 68"
    {...props}
  >
    <title>Alert Ascii</title>
    {LINES.map((line, i) => (
      <text
        key={i}
        className="fill-fg"
        style={TEXT_STYLE}
        textAnchor="middle"
        x="37"
        y={4 + i * 4}
      >
        {line}
      </text>
    ))}
  </svg>
)
