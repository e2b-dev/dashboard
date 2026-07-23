'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useTRPC } from '@/trpc/client'
import { type TagDialogStage, tagDialogStageFromMutation } from './helpers'
import { trackTagTableInteraction } from './table-config'

export type TagOperation = 'assign' | 'reassign' | 'rollback'

interface UseTagAssignmentMutationOptions {
  templateId: string
  operation: TagOperation
  analyticsContext?: Record<string, unknown>
  onSuccess?: () => void | Promise<void>
}

export function useTagAssignmentMutation({
  templateId,
  operation,
  analyticsContext,
  onSuccess,
}: UseTagAssignmentMutationOptions) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: trpc.templates.getTagGroups.infiniteQueryOptions({
        templateId,
      }).queryKey,
    })
    queryClient.invalidateQueries({
      queryKey: trpc.templates.getTagCount.queryOptions({
        templateId,
      }).queryKey,
    })
  }, [queryClient, trpc, templateId])

  const mutation = useMutation(
    trpc.templates.assignTag.mutationOptions({
      onSuccess: () => {
        invalidate()
        trackTagTableInteraction(
          `${operation} succeeded`,
          analyticsContext ?? {}
        )
        void onSuccess?.()
      },
      onError: (error) => {
        trackTagTableInteraction(`${operation} failed`, {
          ...analyticsContext,
          error_status: error.data?.httpStatus ?? null,
          error_code: error.data?.code ?? null,
        })
      },
    })
  )

  const stage: TagDialogStage = tagDialogStageFromMutation(mutation)

  return { mutation, stage }
}
