import { SandboxProvider } from '@/features/dashboard/sandbox/context'
import SandboxDetailsControls from '@/features/dashboard/sandbox/header/controls'
import SandboxDetailsHeader from '@/features/dashboard/sandbox/header/header'
import SandboxLayoutClient from '@/features/dashboard/sandbox/layout'

interface SandboxLayoutProps {
  children: React.ReactNode
  params: Promise<{ teamSlug: string; sandboxId: string }>
}

export default async function SandboxLayout({
  children,
  params,
}: SandboxLayoutProps) {
  await params

  return (
    <SandboxProvider>
      <SandboxLayoutClient
        tabsHeaderAccessory={<SandboxDetailsControls />}
        header={<SandboxDetailsHeader />}
      >
        {children}
      </SandboxLayoutClient>
    </SandboxProvider>
  )
}
