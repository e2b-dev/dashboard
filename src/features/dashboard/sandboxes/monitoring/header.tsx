import {
  ConcurrentSandboxesClient,
  SandboxesStartRateClient,
} from './header.client'

const BaseCard = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="p-3 md:p-6 max-md:not-last:border-b md:not-last:border-r h-full flex-1 w-full flex flex-col justify-center items-center gap-3 relative">
      {children}
    </div>
  )
}

const BaseSubtitle = ({ children }: { children: React.ReactNode }) => {
  return <span className="label-tertiary">{children}</span>
}

export default function SandboxesMonitoringHeader() {
  return (
    <div className="flex md:flex-row flex-col items-center border-b w-full min-h-52">
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

// SHELLS

export const ConcurrentSandboxesShell = () => {
  return <ConcurrentSandboxesClient concurrentSandboxes={100} />
}

export const SandboxesStartRateShell = () => {
  return <SandboxesStartRateClient sandboxesStartRate={0.2} />
}
