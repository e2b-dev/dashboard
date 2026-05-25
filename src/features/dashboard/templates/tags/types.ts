import type { TemplateTagAssignment } from '@/core/modules/templates/models'

export interface TagGroup {
  tag: string
  primaryAssignment: TemplateTagAssignment
  assignments: TemplateTagAssignment[]
  hasMore: boolean
}
