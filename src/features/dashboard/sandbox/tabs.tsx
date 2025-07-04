'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface SandboxDetailsTabsProps {
  tabs: string[]
  children: ReactNode
}

export default function SandboxDetailsTabs({
  tabs,
  children,
}: SandboxDetailsTabsProps) {
  const pathname = usePathname()
  const tab = pathname.split('/').pop() || tabs[0]

  return (
    <Tabs defaultValue={tab} value={tab} className="min-h-0 w-full flex-1">
      <TabsList className="w-full justify-start pl-4">
        {tabs.map((tab) => (
          <TabsTrigger key={tab} value={tab} className="w-fit flex-none">
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent
          key={tab}
          value={tab}
          className="flex min-h-0 flex-1 flex-col"
        >
          {children}
        </TabsContent>
      ))}
    </Tabs>
  )
}
