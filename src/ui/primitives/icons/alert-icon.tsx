import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const AlertIcon = (props: IconProps) => (
  <Icon name="Alert" viewBox="0 0 16 16" {...props}>
    <path
      d="M3.20486 6.30867C3.46741 3.85821 5.53535 2 7.99984 2C10.4643 2 12.5322 3.85821 12.7948 6.30867L13.3332 11.3333H2.6665L3.20486 6.30867Z"
      stroke="currentColor"
      strokeWidth="1.33333"
    />
    <path
      d="M10.6668 11.3334C10.6668 12.8061 9.4729 14 8.00016 14C6.5274 14 5.3335 12.8061 5.3335 11.3334"
      stroke="currentColor"
      strokeWidth="1.33333"
    />
  </Icon>
)
