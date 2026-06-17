'use client'

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import type { TemplateTagAssignment } from '@/core/modules/templates/models'
import ReassignTagDialog from './reassign-dialog'
import RollbackTagDialog, { type RollbackSurface } from './rollback-dialog'
import type { TagGroup } from './types'

interface ReassignData {
  tag: string
  currentBuildId: string
}

interface RollbackData {
  tag: string
  currentBuildId: string
  targetBuildId: string
  surface: RollbackSurface
}

interface TagDialogActions {
  openReassign: (group: TagGroup) => void
  openRollback: (
    group: TagGroup,
    target: TemplateTagAssignment,
    surface: RollbackSurface
  ) => void
}

interface TagDialogContextValue {
  actions: TagDialogActions
}

const TagDialogContext = createContext<TagDialogContextValue | undefined>(
  undefined
)

interface TagDialogProviderProps {
  teamSlug: string
  templateId: string
  templateName: string
  children: ReactNode
}

const INITIAL_REASSIGN_DATA: ReassignData = {
  tag: '',
  currentBuildId: '',
}

const INITIAL_ROLLBACK_DATA: RollbackData = {
  tag: '',
  currentBuildId: '',
  targetBuildId: '',
  surface: 'tags-tab',
}

export function TagDialogProvider({
  teamSlug,
  templateId,
  templateName,
  children,
}: TagDialogProviderProps) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignData, setReassignData] = useState<ReassignData>(
    INITIAL_REASSIGN_DATA
  )

  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [rollbackData, setRollbackData] = useState<RollbackData>(
    INITIAL_ROLLBACK_DATA
  )

  const openReassign = useCallback((group: TagGroup) => {
    setReassignData({
      tag: group.tag,
      currentBuildId: group.primaryAssignment.buildId,
    })
    setReassignOpen(true)
  }, [])

  const openRollback = useCallback(
    (
      group: TagGroup,
      target: TemplateTagAssignment,
      surface: RollbackSurface
    ) => {
      setRollbackData({
        tag: group.tag,
        currentBuildId: group.primaryAssignment.buildId,
        targetBuildId: target.buildId,
        surface,
      })
      setRollbackOpen(true)
    },
    []
  )

  const value = useMemo<TagDialogContextValue>(
    () => ({ actions: { openReassign, openRollback } }),
    [openReassign, openRollback]
  )

  return (
    <TagDialogContext.Provider value={value}>
      {children}
      <ReassignTagDialog
        open={reassignOpen}
        onOpenChange={setReassignOpen}
        tag={reassignData.tag}
        currentBuildId={reassignData.currentBuildId}
        teamSlug={teamSlug}
        templateId={templateId}
        templateName={templateName}
        surface="tags-tab"
      />
      <RollbackTagDialog
        open={rollbackOpen}
        onOpenChange={setRollbackOpen}
        tag={rollbackData.tag}
        currentBuildId={rollbackData.currentBuildId}
        targetBuildId={rollbackData.targetBuildId}
        teamSlug={teamSlug}
        templateId={templateId}
        templateName={templateName}
        surface={rollbackData.surface}
      />
    </TagDialogContext.Provider>
  )
}

export function useTagDialog() {
  const ctx = useContext(TagDialogContext)
  if (!ctx) {
    throw new Error('useTagDialog must be used within TagDialogProvider')
  }
  return ctx
}
