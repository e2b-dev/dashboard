import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const BlockIcon = (props: IconProps) => (
  <Icon name="Block" viewBox="0 0 16 16" {...props}>
    <path
      d="M4 12L12 4M14 8C14 11.3137 11.3137 14 8 14C6.34315 14 4.84315 13.3284 3.75736 12.2427C2.67157 11.1569 2 9.65687 2 8C2 4.68629 4.68629 2 8 2C9.65687 2 11.1569 2.67157 12.2427 3.75736C13.3284 4.84315 14 6.34315 14 8Z"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </Icon>
)
