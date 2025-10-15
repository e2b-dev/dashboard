'use client'

import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'motion/react'
import { memo, useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: string | number
  className?: string
  /**
   * Minimum time (ms) between animations to prevent jittery updates
   * @default 300
   */
  throttleMs?: number
}

function AnimatedNumberComponent({
  value,
  className,
  throttleMs = 300,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const lastUpdateRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const pendingValueRef = useRef<string | number | undefined>(undefined)

  // throttles the updates to the display value to prevent jittery updates
  useEffect(() => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateRef.current

    // clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // if enough time has passed since last update, update immediately
    if (timeSinceLastUpdate >= throttleMs) {
      setDisplayValue(value)
      lastUpdateRef.current = now
      pendingValueRef.current = undefined
    } else {
      // otherwise, schedule the update for later
      pendingValueRef.current = value
      const delay = throttleMs - timeSinceLastUpdate

      timeoutRef.current = setTimeout(() => {
        setDisplayValue(value)
        lastUpdateRef.current = Date.now()
        pendingValueRef.current = undefined
      }, delay)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, throttleMs])

  const stringValue = String(displayValue)
  const characters = stringValue.split('')

  return (
    <div className={cn('flex flex-row', className)}>
      {characters.map((char, index) => (
        <div key={index} className="relative inline-block overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${index}-${char}`}
              initial={{ y: '50%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              exit={{ y: '-50%', opacity: 0 }}
              transition={{
                duration: 0.2,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="inline-block absolute inset-0"
              style={{ minWidth: char === ' ' ? '0.25em' : undefined }}
            >
              {char}
            </motion.span>
          </AnimatePresence>
          <span className="inline-block opacity-0" aria-hidden="true">
            {char}
          </span>
        </div>
      ))}
    </div>
  )
}

export const AnimatedNumber = memo(
  AnimatedNumberComponent,
  (prev, next) => prev.value === next.value
)
