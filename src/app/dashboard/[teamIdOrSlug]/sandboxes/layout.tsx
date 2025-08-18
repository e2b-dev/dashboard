import SandboxesTabs from '@/features/dashboard/sandboxes/tabs'

export default function SandboxesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SandboxesTabs>{children}</SandboxesTabs>
}
