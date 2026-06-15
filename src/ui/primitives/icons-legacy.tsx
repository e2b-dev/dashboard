import type React from 'react'
import { cn } from '@/lib/utils/ui'

/**
 * Legacy icons that have no equivalent in the e2b Figma icon registry
 * (`@/ui/primitives/icons`). Kept here verbatim so the build stays green;
 * migrate each consumer to an upstream glyph (or keep) as a follow-up.
 */

const DEFAULT_CLASS_NAMES = 'size-4'

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
  height?: number
  width?: number
}

export const InvoiceIcon = ({ className, ...props }: IconProps) => (
  <svg
    className={cn(DEFAULT_CLASS_NAMES, className)}
    fill="none"
    viewBox="0 0 11 14"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M3.33341 3.99996H7.33341M3.33341 6.66663H4.66675M0.666748 0.666626H10.0001V12.4L8.44455 11.3333L6.88895 12.6666L5.33341 11.3333L3.77786 12.6666L2.2223 11.3333L0.666748 12.4V0.666626Z"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </svg>
)
