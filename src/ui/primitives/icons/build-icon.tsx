import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const BuildIcon = (props: IconProps) => (
  <Icon name="Build" viewBox="0 0 16 16" {...props}>
    <path
      d="M3.99982 10.3333L1.1665 7.5L6.66649 2H9.6665L10.9998 3.33331L3.99982 10.3333Z"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
    <path
      d="M6.3335 8.33337L11.6668 13.6667L13.6668 11.6667L8.3335 6.33337"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </Icon>
)
