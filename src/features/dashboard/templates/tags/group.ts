import type {
  TemplateTag,
  TemplateTagAssignment,
} from '@/core/modules/templates/models'
import type { TagGroup } from './types'

export function groupTagsByName(tags: TemplateTag[]): TagGroup[] {
  const byTag = new Map<string, TemplateTagAssignment[]>()

  for (const tag of tags) {
    const assignments = byTag.get(tag.tag) ?? []
    assignments.push(templateTagToAssignment(tag))
    byTag.set(tag.tag, assignments)
  }

  const groups: TagGroup[] = []
  for (const [tag, assignments] of byTag.entries()) {
    assignments.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))
    const primaryAssignment = assignments[0]
    if (!primaryAssignment) continue
    groups.push({ tag, primaryAssignment, assignments, hasMore: false })
  }

  groups.sort((a, b) =>
    b.primaryAssignment.assignedAt.localeCompare(a.primaryAssignment.assignedAt)
  )

  return groups
}

export const injectDevDebugBuilds = (groups: TagGroup[]) => groups

function templateTagToAssignment(tag: TemplateTag): TemplateTagAssignment {
  return {
    assignmentId: tag.buildID,
    buildId: tag.buildID,
    assignedAt: tag.createdAt,
    buildCreatedAt: tag.createdAt,
    buildFinishedAt: null,
  }
}
