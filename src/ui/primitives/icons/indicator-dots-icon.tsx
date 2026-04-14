import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const IndicatorDotsIcon = (props: IconProps) => (
  <Icon name="Indicator Dots" viewBox="0 0 16 16" {...props}>
    <path
      d="M6.83398 2H8.16732V3.33333H6.83398V2Z"
      stroke="currentColor"
      strokeWidth="1.33333"
    />
    <path
      d="M8.16732 7.3335H6.83398V8.66683H8.16732V7.3335Z"
      stroke="currentColor"
      strokeWidth="1.33333"
    />
    <path
      d="M6.83398 12.6665H8.16732V13.9998H6.83398V12.6665Z"
      stroke="currentColor"
      strokeWidth="1.33333"
    />
  </Icon>
)
