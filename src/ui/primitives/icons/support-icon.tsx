import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const SupportIcon = (props: IconProps) => (
  <Icon name="Support" viewBox="0 0 16 16" {...props}>
    <path
      d="M3.33333 6.66667V6.5C3.33333 4.01472 5.49729 2 8.16667 2C10.8361 2 13 4.01472 13 6.5V6.66667M8 12.6667V14H10.1667C11.8235 14 13.1667 12.6569 13.1667 11M3 6.66667H4V11H3C2.44771 11 2 10.5523 2 10V7.66667C2 7.1144 2.44771 6.66667 3 6.66667ZM12.3333 6.66667H13.3333C13.8856 6.66667 14.3333 7.1144 14.3333 7.66667V10C14.3333 10.5523 13.8856 11 13.3333 11H12.3333V6.66667Z"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </Icon>
)
