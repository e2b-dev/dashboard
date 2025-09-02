import SandboxesTabs from './tabs'

interface SandboxesLayoutProps {
  children: React.ReactNode
  monitoring: React.ReactNode
  list: React.ReactNode
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
