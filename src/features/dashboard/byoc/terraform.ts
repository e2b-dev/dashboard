const GCP_PROJECT_ID_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/

export function isValidGcpProjectId(projectId: string) {
  return GCP_PROJECT_ID_PATTERN.test(projectId)
}

export function renderByocSetupTemplate({
  principal,
  projectId,
  region,
  template,
}: {
  principal: string
  projectId: string
  region: string
  template: string
}) {
  return template
    .replaceAll('{{PROJECT_ID}}', projectId)
    .replaceAll('{{REGION}}', region)
    .replaceAll('{{E2B_PRINCIPAL}}', principal)
}
