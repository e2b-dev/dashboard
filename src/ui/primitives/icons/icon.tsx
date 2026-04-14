import { cn } from '@/lib/utils/index'
import type { IconProps } from '@/ui/primitives/icons/types'

export const Icon = ({ className, children, name, ...props }: IconProps) => (
  <svg
    aria-hidden
    className={cn('size-6', className)}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>{name}</title>
    {children}
  </svg>
)
