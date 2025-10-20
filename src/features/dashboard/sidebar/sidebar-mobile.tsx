import { cn } from '@/lib/utils'
import { Drawer, DrawerContent, DrawerTrigger } from '@/ui/primitives/drawer'
import { Sidebar as SidebarIcon } from 'lucide-react'
import Sidebar from './sidebar'

interface SidebarMobileProps {
  className?: string
}

export default function SidebarMobile({ className }: SidebarMobileProps) {
  return (
    <Drawer>
      <DrawerTrigger className={cn(className)}>
        <SidebarIcon className="size-5" />
      </DrawerTrigger>
      <DrawerContent>
        <Sidebar className="h-full w-full" />
      </DrawerContent>
    </Drawer>
  )
}
