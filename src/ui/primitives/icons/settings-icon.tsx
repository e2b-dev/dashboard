import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const SettingsIcon = (props: IconProps) => (
  <Icon name="Settings" viewBox="0 0 20 20" {...props}>
    <path
      d="M7.75 4.75L5.3125 4.1875L4.1875 5.3125L4.75 7.75L2.5 9.25V10.75L4.75 12.25L4.1875 14.6875L5.3125 15.8125L7.75 15.25L9.25 17.5H10.75L12.25 15.25L14.6875 15.8125L15.8125 14.6875L15.25 12.25L17.5 10.75V9.25L15.25 7.75L15.8125 5.3125L14.6875 4.1875L12.25 4.75L10.75 2.5H9.25L7.75 4.75Z"
      stroke="currentColor"
      strokeWidth="1.66667"
    />
    <path
      d="M12.5 10C12.5 11.3807 11.3807 12.5 10 12.5C8.61925 12.5 7.5 11.3807 7.5 10C7.5 8.61925 8.61925 7.5 10 7.5C11.3807 7.5 12.5 8.61925 12.5 10Z"
      stroke="currentColor"
      strokeWidth="1.66667"
    />
  </Icon>
)
