'use client'

import Link, { LinkProps } from 'next/link'
import { useState } from 'react'

export function HoverPrefetchLink({
  href,
  children,
  ...props
}: Omit<LinkProps, 'prefetch' | 'onMouseEnter'> & {
  children: React.ReactNode
}) {
  const [active, setActive] = useState(false)

  return (
    <Link
      href={href}
      prefetch={active ? true : false}
      onMouseEnter={() => setActive(true)}
      {...props}
    >
      {children}
    </Link>
  )
}
