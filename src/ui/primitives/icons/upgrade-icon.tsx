import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const UpgradeIcon = (props: IconProps) => (
  <Icon name="Upgrade" viewBox="0 0 16 16" {...props}>
    <path
      d="M4.66667 8.66667H2.33333L4 5.33333H7.5M4.66667 8.66667L7.33333 11.3333M4.66667 8.66667L7.5 5.33333M7.5 5.33333C9.33333 3.33333 11.3333 2 14 2C14 4.66667 12.6667 6.66667 10.6667 8.5M7.33333 11.3333V13.6667L10.6667 12V8.5M7.33333 11.3333L10.6667 8.5M3.33333 14H2V12.6667C2 11.9303 2.59695 11.3333 3.33333 11.3333C4.06971 11.3333 4.66667 11.9303 4.66667 12.6667C4.66667 13.4031 4.06971 14 3.33333 14Z"
      stroke="currentColor"
      strokeWidth="1.33333"
    />
  </Icon>
)
