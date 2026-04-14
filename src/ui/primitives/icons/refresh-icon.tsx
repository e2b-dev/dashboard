import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const RefreshIcon = (props: IconProps) => (
  <Icon name="Refresh" viewBox="0 0 16 16" {...props}>
    <path
      d="M11.1667 14L13.1667 12L11.1667 10M4.5 2L2.5 4L4.5 6M3.16667 4H13.1667V7.33333M2.5 8.66667V12H12.5"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </Icon>
)
