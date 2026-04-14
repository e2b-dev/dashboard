import type React from 'react'
import { cn } from '@/lib/utils/index'

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
  fontSize: '3.802px',
  fontFamily: 'var(--font-mono)',
  fontWeight: 600,
  letterSpacing: '-0.038px',
  lineHeight: '4px',
  fontFeatureSettings: "'ss03' 1",
}

export const AlertAsciiIcon = ({ className }: { className?: string }) => (
  <div className={cn('relative size-[72px]', className)}>
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-fg uppercase"
      style={TEXT_STYLE}
    >
      {LINES.map((line, i) => (
        <p key={i} className="m-0 whitespace-pre">
          {line}
        </p>
      ))}
    </div>
  </div>
)
