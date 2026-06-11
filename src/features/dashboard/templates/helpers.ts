import type { Template } from '@/core/modules/templates/models'

export function getTemplateDisplayName(
  template: Pick<Template, 'names' | 'templateID'>
): string {
  return (
    template.names.find((n) => !n.includes('/')) ??
    template.names[0] ??
    template.templateID
  )
}
