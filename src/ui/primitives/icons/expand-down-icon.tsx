import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const ExpandDownIcon = (props: IconProps) => (
  <Icon name="Expand Down" viewBox="0 0 16 16" {...props}>
    <path
      d="M12.8333 14H3.5"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
    <path
      d="M11.0007 8.50016L8.16732 11.3335L5.33398 8.50016"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
    <path
      d="M8.16699 1.99996V10.6666"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </Icon>
)
