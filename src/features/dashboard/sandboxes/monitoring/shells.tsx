import { ConcurrentSandboxesBody, SandboxesStartRateBody } from './bodies'

export const ConcurrentSandboxesShell = async () => {
  return <ConcurrentSandboxesBody concurrentSandboxes={100} />
}

export const SandboxesStartRateShell = async () => {
  return <SandboxesStartRateBody sandboxesStartRate={0.2} />
}
