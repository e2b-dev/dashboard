import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const ArrowDownIcon = (props: IconProps) => (
  <Icon name="Arrow Down" viewBox="0 0 12 12" {...props}>
    <path
      d="M9.5 6L6 9.5L2.5 6M6 8.91667V2.5"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </Icon>
)
