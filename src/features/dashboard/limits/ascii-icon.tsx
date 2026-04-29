import { type CSSProperties, Fragment } from 'react'
import { cn } from '@/lib/utils'

type AsciiLineSegment = {
  className?: string
  text: string
}

type AsciiLine = string | readonly AsciiLineSegment[]

const TEXT_STYLE = {
  fontFamily: 'var(--font-mono)',
  fontFeatureSettings: "'ss03' 1",
  fontSize: '3.802px',
  fontWeight: 600,
  letterSpacing: '-0.038px',
  lineHeight: '4px',
} satisfies CSSProperties

interface AsciiIconProps {
  className?: string
  lines: readonly AsciiLine[]
}

const renderAsciiLine = (line: AsciiLine) => {
  if (typeof line === 'string') return line

  return line.map((segment, index) => (
    <Fragment key={`${segment.text}-${index}`}>
      {segment.className ? (
        <span className={segment.className}>{segment.text}</span>
      ) : (
        segment.text
      )}
    </Fragment>
  ))
}

export const AsciiIcon = ({ className, lines }: AsciiIconProps) => (
  <div className={cn('relative size-[72px]', className)}>
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-fg uppercase"
      style={TEXT_STYLE}
    >
      {lines.map((line, index) => (
        <p key={index} className="m-0 whitespace-pre">
          {renderAsciiLine(line)}
        </p>
      ))}
    </div>
  </div>
)
