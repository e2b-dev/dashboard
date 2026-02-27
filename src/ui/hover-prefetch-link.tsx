'use client'

import Link, { type LinkProps } from 'next/link'
import { forwardRef, useState } from 'react'

export const HoverPrefetchLink = forwardRef<
  HTMLAnchorElement,
  Omit<LinkProps, 'prefetch' | 'onMouseEnter'> & { children: React.ReactNode }
>(function HoverPrefetchLink({ href, children, ...props }, ref) {
  const [active, setActive] = useState(false)

  return (
    <Link
      ref={ref}
      href={href}
      prefetch={active ? true : false}
      onMouseEnter={() => setActive(true)}
      {...props}
    >
      {children}
    </Link>
  )
})

HoverPrefetchLink.displayName = 'HoverPrefetchLink'
