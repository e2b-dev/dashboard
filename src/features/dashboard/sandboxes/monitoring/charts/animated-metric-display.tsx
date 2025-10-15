'use client'

import { AnimatedNumber } from '@/ui/primitives/animated-number'
import { AnimatePresence, motion } from 'motion/react'
import { memo } from 'react'

interface AnimatedMetricDisplayProps {
  value: string | number
  label: string
  mobileLabel?: string
  timestamp?: string | null
}

function AnimatedMetricDisplayComponent({
  value,
  label,
  mobileLabel,
  timestamp,
}: AnimatedMetricDisplayProps) {
  return (
    <div className="inline-flex items-end gap-2 md:gap-3">
      <AnimatedNumber
        value={value}
        className="prose-value-big max-md:text-2xl"
      />

      <span className="text-fg-tertiary prose-label uppercase max-md:text-xs">
        <span className="max-md:hidden">{label}</span>
        <span className="md:hidden">{mobileLabel || label}</span>
      </span>

      <AnimatePresence>
        {timestamp && (
          <motion.span
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.1, ease: 'easeInOut' }}
            className="text-fg prose-label-small"
          >
            {timestamp}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

export const AnimatedMetricDisplay = memo(
  AnimatedMetricDisplayComponent,
  (prev, next) =>
    prev.value === next.value &&
    prev.label === next.label &&
    prev.mobileLabel === next.mobileLabel &&
    prev.timestamp === next.timestamp
  // explicitly exclude formatValue from comparison
)
