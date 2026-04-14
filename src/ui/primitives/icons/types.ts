import type React from 'react'

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
  height?: number
  width?: number
  name?: string
}
