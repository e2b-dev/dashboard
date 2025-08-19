interface ConcurrentSandboxesBodyProps {
  concurrentSandboxes: number
}

export const ConcurrentSandboxesBody = ({
  concurrentSandboxes,
}: ConcurrentSandboxesBodyProps) => {
  return <span className="prose-value-big">{concurrentSandboxes}</span>
}

interface SandboxesStartRateBodyProps {
  sandboxesStartRate: number
}

export const SandboxesStartRateBody = ({
  sandboxesStartRate,
}: SandboxesStartRateBodyProps) => {
  return <span className="prose-value-big">{sandboxesStartRate}</span>
}
