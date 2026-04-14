import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const ChevronLeftIcon = (props: IconProps) => (
  <Icon name="Chevron Left" viewBox="0 0 16 16" {...props}>
    <path
      d="M10 11L5 8L10 5"
      stroke="currentColor"
      strokeLinecap="square"
      strokeLinejoin="round"
      strokeWidth="1.33333"
    />
  </Icon>
)
