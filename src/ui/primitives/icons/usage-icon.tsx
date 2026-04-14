import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const UsageIcon = (props: IconProps) => (
  <Icon name="Usage" viewBox="0 0 20 20" {...props}>
    <path
      d="M2.5 14.1665V15.8332M7.5 10.8332V15.8332M12.5 7.49984V15.8332M17.5 4.1665V15.8332"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.66667"
    />
  </Icon>
)
