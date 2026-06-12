import { normalizeTerminalEnvVarName } from './env-vars'

const terminalEnvVarsBySandboxId = new Map<string, Record<string, string>>()

export function setTerminalEnvVar({
  name,
  sandboxId,
  value,
}: {
  name: string
  sandboxId: string
  value: string
}) {
  const normalizedName = normalizeTerminalEnvVarName(name)
  if (!normalizedName) return null

  const envVars = terminalEnvVarsBySandboxId.get(sandboxId) ?? {}
  envVars[normalizedName] = value
  terminalEnvVarsBySandboxId.set(sandboxId, envVars)

  return normalizedName
}

export function getTerminalEnvVars(sandboxId: string) {
  return {
    ...(terminalEnvVarsBySandboxId.get(sandboxId) ?? {}),
  }
}
