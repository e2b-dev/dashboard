import { Icon, type IconProps } from './icon'

export const DotIcon = (props: IconProps) => (
  <Icon fill="none" viewBox="0 0 12 12" {...props}>
    <circle cx="6" cy="6" r="2.5" fill="currentColor" />
  </Icon>
)
