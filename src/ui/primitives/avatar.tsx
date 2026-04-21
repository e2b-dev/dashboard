'use client'

import * as AvatarPrimitive from '@radix-ui/react-avatar'
import * as React from 'react'
import { useId } from 'react'
import { cn } from '@/lib/utils'

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex h-9 w-9 shrink-0 overflow-hidden  border',
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn(
      'aspect-square h-full w-full object-cover object-center',
      className
    )}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'bg-bg-1 flex h-full w-full items-center justify-center ',
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

const PATTERN_COLUMN_COUNT = 16
const PATTERN_ROW_COUNT = 16
const PATTERN_CELL_SIZE = 8
const PATTERN_FONT_SIZE = 10

const patternCells = Array.from(
  { length: PATTERN_ROW_COUNT * PATTERN_COLUMN_COUNT },
  (_, index) => {
    const row = Math.floor(index / PATTERN_COLUMN_COUNT)
    const col = index % PATTERN_COLUMN_COUNT
    const glyph = (row + col * 2) % 5 === 0 ? '-' : '*'
    const isAccent = (row * 5 + col * 3) % 11 === 0

    return {
      col,
      glyph,
      isAccent,
      row,
      x: 8 + col * PATTERN_CELL_SIZE,
      y: 14 + row * PATTERN_CELL_SIZE,
    }
  }
)

interface PatternAvatarProps {
  className?: string
  letter: string
}

const PatternAvatar = ({ className, letter }: PatternAvatarProps) => {
  const clipPathId = useId().replaceAll(':', '')
  const normalizedLetter = letter.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      className={cn(
        'relative size-full overflow-hidden border border-stroke bg-bg text-fg',
        className
      )}
    >
      <svg
        viewBox="0 0 144 144"
        className="size-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipPathId}>
            <text
              x="72"
              y="78"
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="IBM Plex Sans, sans-serif"
              fontSize="110"
              fontWeight="500"
            >
              {normalizedLetter}
            </text>
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipPathId})`}>
          {patternCells.map((cell) => (
            <text
              key={`${cell.row}-${cell.col}`}
              x={cell.x}
              y={cell.y}
              fontFamily="IBM Plex Mono, monospace"
              fontSize={PATTERN_FONT_SIZE}
              fontWeight="600"
              letterSpacing="-0.4"
              className={
                cell.isAccent
                  ? 'fill-current text-accent-main-highlight'
                  : 'fill-current text-fg'
              }
            >
              {cell.glyph}
            </text>
          ))}
        </g>
      </svg>
    </div>
  )
}

export { Avatar, AvatarFallback, AvatarImage, PatternAvatar }
