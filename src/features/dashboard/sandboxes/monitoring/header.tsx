import { ConcurrentSandboxesShell, SandboxesStartRateShell } from './shells'

const BaseCard = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="p-3 md:p-6 max-md:not-last:border-b md:not-last:border-r min-h-42 flex-1 w-full flex flex-col justify-center items-center gap-3 relative">
      {children}
    </div>
  )
}

const BaseSubtitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="prose-label uppercase text-fg-tertiary">{children}</span>
  )
}

export default function SandboxesMonitoringHeader() {
  return (
    <div className="flex md:flex-row flex-col items-center border-b w-full">
      <BaseCard>
        <ConcurrentSandboxesShell />
        <BaseSubtitle>Concurrent Sandboxes</BaseSubtitle>
      </BaseCard>
      <BaseCard>
        <SandboxesStartRateShell />
        <BaseSubtitle>Created Sandboxes Per Second</BaseSubtitle>
      </BaseCard>
    </div>
  )
}
