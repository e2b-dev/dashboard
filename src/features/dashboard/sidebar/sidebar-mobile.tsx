import { cn } from '@/lib/utils'
import { Drawer, DrawerContent, DrawerTrigger } from '@/ui/primitives/drawer'
import { MenuIcon } from '@/ui/primitives/icons'
import Sidebar from './sidebar'

interface SidebarMobileProps {
  className?: string
}

export default function SidebarMobile({ className }: SidebarMobileProps) {
  return (
    <Drawer>
      <DrawerTrigger className={cn(className)}>
        <MenuIcon className="size-5" />
      </DrawerTrigger>
      <DrawerContent>
        <Sidebar className="h-full w-full" />
      </DrawerContent>
    </Drawer>
  )
}
