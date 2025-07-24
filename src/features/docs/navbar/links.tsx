'use client'

import { Button } from '@/ui/primitives/button'
import { useSidebar } from 'fumadocs-ui/provider'
import { MenuIcon } from 'lucide-react'
import Link from 'next/link'
import { useCallback } from 'react'

export default function DocsNavLinks() {
  const { open, setOpen } = useSidebar()

  const handleSidebarOpen = useCallback(() => {
    setOpen(!open)
  }, [open, setOpen])

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={handleSidebarOpen}
      >
        <MenuIcon className="h-4 w-4" />
      </Button>
      <Button size="sm" asChild>
        <Link prefetch={true} href="/dashboard">
          Dashboard
        </Link>
      </Button>
    </div>
  )
}
