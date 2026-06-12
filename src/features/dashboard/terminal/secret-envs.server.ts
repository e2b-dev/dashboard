import {
  getDefaultTerminalEnvVarNames,
  mergeTerminalEnvVarNames,
} from './env-vars'

export function getTerminalSecretEnvs(template: string) {
  const envNames = getTerminalEnvVarNames(template)

  return Object.fromEntries(
    envNames.flatMap((name) => {
      const value = process.env[name]
      return value ? [[name, value]] : []
    })
  )
}

export function getTerminalEnvVarNames(template: string) {
  const configuredNames =
    readEnvNameList(process.env[getTemplateSecretEnvConfigName(template)]) ??
    readEnvNameList(process.env.DASHBOARD_TERMINAL_SECRET_ENVS)

  if (configuredNames) return configuredNames

  return getDefaultTerminalEnvVarNames(template)
}

function getTemplateSecretEnvConfigName(template: string) {
  const templateKey = template.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
  return `DASHBOARD_TERMINAL_SECRET_ENVS_${templateKey}`
}

function readEnvNameList(value: string | undefined) {
  if (value === undefined) return undefined

  const names = value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)

  return mergeTerminalEnvVarNames(names)
}
