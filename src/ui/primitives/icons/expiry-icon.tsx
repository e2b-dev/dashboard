import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const ExpiryIcon = (props: IconProps) => (
  <Icon name="Expiry" viewBox="0 0 16 16" {...props}>
    <path
      d="M13.3332 5.66667V3.33333H2.6665V13.3333H5.6665M5.33317 3.33333V2M10.6665 3.33333V2"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
    <path
      d="M11.3333 14.6667C13.1743 14.6667 14.6667 13.1743 14.6667 11.3333C14.6667 9.49238 13.1743 8 11.3333 8C9.49238 8 8 9.49238 8 11.3333C8 13.1743 9.49238 14.6667 11.3333 14.6667Z"
      stroke="currentColor"
      strokeWidth="1.33333"
    />
    <path
      d="M11.3335 10V11.3331L12.3335 12.3333"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </Icon>
)
