import { Icon } from '@/ui/primitives/icons/icon'
import type { IconProps } from '@/ui/primitives/icons/types'

export const TrendIcon = (props: IconProps) => (
  <Icon name="Trend" viewBox="0 0 16 16" {...props}>
    <path
      d="M2 8.66663L3.33333 6.66663L5.33333 9.99996L8.66667 2.66663L12 13.3333L14 9.33329"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.33333"
    />
  </Icon>
)
