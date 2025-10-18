import { cn } from '@/lib/utils'
import { Drawer, DrawerContent, DrawerTrigger } from '@/ui/primitives/drawer'
import { Sidebar as SidebarIcon } from 'lucide-react'
import Sidebar from './sidebar'

interface SidebarMobileProps {
  params: Promise<{ teamIdOrSlug: string }>
  className?: string
}

export default function SidebarMobile({
  params,
  className,
}: SidebarMobileProps) {
  return (
    <Drawer>
      <DrawerTrigger className={cn(className)}>
        <SidebarIcon className="size-5" />
      </DrawerTrigger>
      <DrawerContent>
        <Sidebar className="h-full w-full" params={params} />
      </DrawerContent>
    </Drawer>
  )
}
