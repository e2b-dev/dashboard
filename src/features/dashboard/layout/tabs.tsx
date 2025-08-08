import { Tabs, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { usePathname } from 'next/navigation'

interface DashboardLayoutTabsProps {
  tabs: string[]
}

export default function DashboardLayoutTabs({
  tabs,
}: DashboardLayoutTabsProps) {
  const pathname = usePathname()
  const tab = pathname.split('/').pop() || tabs[0]

  return (
    <Tabs defaultValue={tab} value={tab} className="min-h-0 w-full flex-1">
      <TabsList className="bg-bg z-30 w-full justify-start pl-4">
        {tabs.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="w-fit flex-none">
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
