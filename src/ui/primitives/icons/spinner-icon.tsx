import { Icon, type IconProps } from './icon'

/**
 * ![SpinnerIcon](data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBvcGFjaXR5PSIwLjMiIGQ9Ik0xNCA4QzE0IDExLjMxMzcgMTEuMzEzNyAxNCA4IDE0QzQuNjg2MjkgMTQgMiAxMS4zMTM3IDIgOEMyIDQuNjg2MjkgNC42ODYyOSAyIDggMkMxMS4zMTM3IDIgMTQgNC42ODYyOSAxNCA4WiIgc3Ryb2tlPSIjODg4ODg4IiBzdHJva2Utd2lkdGg9IjEuMzMzMzMiLz48cGF0aCBkPSJNMTQgOEMxNCAxMS4zMTM3IDExLjMxMzcgMTQgOCAxNCIgc3Ryb2tlPSIjODg4ODg4IiBzdHJva2Utd2lkdGg9IjEuMzMzMzMiLz48L3N2Zz4=)
 *
 * Synced from Figma `Icon/16px/Spinner`.
 */
export const SpinnerIcon = (props: IconProps) => (
  <Icon fill="none" viewBox="0 0 16 16" {...props}>
    <path
      d="M14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8Z"
      stroke="currentColor"
      strokeWidth="1.33333"
      opacity="0.3"
    />
    <path
      d="M14 8C14 11.3137 11.3137 14 8 14"
      stroke="currentColor"
      strokeWidth="1.33333"
    />
  </Icon>
)
