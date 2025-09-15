import { ReactNode } from 'react'
import SandboxesTabs from './tabs'

interface SandboxesLayoutProps {
  children: ReactNode
  monitoring: ReactNode
  list: ReactNode
  params: Promise<{ teamIdOrSlug: string }>
}

export default async function SandboxesLayout({
  children,
  monitoring,
  list,
}: SandboxesLayoutProps) {
  return (
    <SandboxesTabs>
      {monitoring}
      {list}
      {children}
    </SandboxesTabs>
  )
}
