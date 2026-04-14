import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const ChevronRightIcon = (props: IconProps) => (
  <Icon name="Chevron Right" viewBox="0 0 16 16" {...props}>
    <path
      d="M6 11L11 8L6 5"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="1.33333"
    />
  </Icon>
)
