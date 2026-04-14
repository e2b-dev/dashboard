import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const PausedIcon = (props: IconProps) => (
  <Icon name="Paused" viewBox="0 0 12 12" {...props}>
    <path
      d="M2.5 2H4.5V10H2.5V2Z"
      stroke="currentColor"
      strokeWidth="1.33333"
    />
    <path
      d="M7.5 2H9.5V10H7.5V2Z"
      stroke="currentColor"
      strokeWidth="1.33333"
    />
  </Icon>
)
