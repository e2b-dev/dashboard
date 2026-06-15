import * as React from 'react'

const DEFAULT_ICON_SIZE = 24

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  title?: string
  titleId?: string
}

export const Icon = ({
  className,
  size,
  title,
  titleId,
  children,
  role,
  'aria-hidden': ariaHidden,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: IconProps) => {
  const generatedTitleId = React.useId()
  const resolvedTitleId = title ? (titleId ?? generatedTitleId) : undefined
  const labelledBy = ariaLabelledBy ?? resolvedTitleId
  const isDecorative = !title && !ariaLabel && !ariaLabelledBy

  return (
    <svg
      aria-hidden={ariaHidden ?? (isDecorative ? true : undefined)}
      aria-label={ariaLabel}
      aria-labelledby={labelledBy}
      className={className}
      height={props.height ?? size ?? DEFAULT_ICON_SIZE}
      role={role ?? (isDecorative ? undefined : 'img')}
      width={props.width ?? size ?? DEFAULT_ICON_SIZE}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title ? <title id={resolvedTitleId}>{title}</title> : null}
      {children}
    </svg>
  )
}

export type Icon = typeof Icon
