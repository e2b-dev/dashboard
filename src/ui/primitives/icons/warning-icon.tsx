import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const WarningIcon = (props: IconProps) => (
  <Icon name="Warning" viewBox="0 0 16 16" {...props}>
    <path
      d="M7.99984 10.6667V10.66M7.99984 6.66667V8.66667M7.99984 2L1.6665 12.6667H14.3332L7.99984 2Z"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </Icon>
)
