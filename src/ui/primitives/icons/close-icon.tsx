import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const CloseIcon = (props: IconProps) => (
  <Icon name="Close" viewBox="0 0 16 16" {...props}>
    <path
      d="M3.16602 3.3335L12.4993 12.6668M12.4993 3.3335L3.16602 12.6668"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </Icon>
)
