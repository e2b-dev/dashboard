'use client'

interface ConcurrentSandboxesClientProps {
  concurrentSandboxes: number
}

export const ConcurrentSandboxesClient = ({
  concurrentSandboxes,
}: ConcurrentSandboxesClientProps) => {
  return <span className="prose-value-big">{concurrentSandboxes}</span>
}

interface SandboxesStartRateClientProps {
  sandboxesStartRate: number
}

export const SandboxesStartRateClient = ({
  sandboxesStartRate,
}: SandboxesStartRateClientProps) => {
  return <span className="prose-value-big">{sandboxesStartRate}</span>
}
