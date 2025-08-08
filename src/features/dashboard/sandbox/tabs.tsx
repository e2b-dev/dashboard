'use client'

import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import SandboxInspectIncompatible from './inspect/incompatible'

interface SandboxDetailsTabsProps {
  tabs: string[]
  children: ReactNode
  isEnvdVersionIncompatibleForInspect: boolean
  templateNameOrId: string
  teamIdOrSlug: string
}

export default function SandboxDetailsTabs({
  tabs,
  children,
  isEnvdVersionIncompatibleForInspect,
  templateNameOrId,
  teamIdOrSlug,
}: SandboxDetailsTabsProps) {
  const pathname = usePathname()
  const tab = pathname.split('/').pop() || tabs[0]

  const showInspectTab =
    tab === 'inspect' && isEnvdVersionIncompatibleForInspect

  return (
    <Tabs defaultValue={tab} value={tab} className="min-h-0 w-full flex-1">
      <TabsList className="bg-bg z-30 w-full justify-start pl-4">
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
          className={cn('flex flex-1 flex-col md:overflow-hidden')}
        >
          {showInspectTab ? (
            children
          ) : (
            <SandboxInspectIncompatible
              templateNameOrId={templateNameOrId}
              teamIdOrSlug={teamIdOrSlug}
            />
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}
