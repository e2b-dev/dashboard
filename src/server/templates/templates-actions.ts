'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { authActionClient } from '@/lib/clients/action'
import { handleDefaultInfraError, returnServerError } from '@/lib/utils/action'
import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { infra } from '@/lib/clients/api'
import { logError } from '@/lib/clients/logger'
import { ERROR_CODES } from '@/configs/logs'

const DeleteTemplateParamsSchema = z.object({
  templateId: z.string(),
})

export const deleteTemplateAction = authActionClient
  .schema(DeleteTemplateParamsSchema)
  .metadata({ actionName: 'deleteTemplate' })
  .action(async ({ parsedInput, ctx }) => {
    const { templateId } = parsedInput

    const res = await infra.DELETE('/templates/{templateID}', {
      params: {
        path: {
          templateID: templateId,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(ctx.session.access_token),
      },
    })

    if (res.error) {
      const status = res.response.status
      logError(
        ERROR_CODES.INFRA,
        '/templates/{templateID}',
        status,
        res.error,
        res.data
      )

      if (status === 404) {
        return returnServerError('Template not found')
      }

      if (
        status === 400 &&
        res.error?.message?.includes(
          'because there are paused sandboxes using it'
        )
      ) {
        return returnServerError(
          'Cannot delete template because there are paused sandboxes using it'
        )
      }

      return handleDefaultInfraError(status)
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/templates`, 'page')
  })

const UpdateTemplateParamsSchema = z.object({
  templateId: z.string(),
  props: z
    .object({
      Public: z.boolean(),
    })
    .partial(),
})

export const updateTemplateAction = authActionClient
  .schema(UpdateTemplateParamsSchema)
  .metadata({ actionName: 'updateTemplate' })
  .action(async ({ parsedInput, ctx }) => {
    const { templateId, props } = parsedInput
    const { session } = ctx

    const res = await infra.PATCH('/templates/{templateID}', {
      body: {
        public: props.Public,
      },
      params: {
        path: {
          templateID: templateId,
        },
      },
      headers: {
        ...SUPABASE_AUTH_HEADERS(session.access_token),
      },
    })

    if (res.error) {
      const status = res.response.status
      logError(
        ERROR_CODES.INFRA,
        '/templates/{templateID}',
        status,
        res.error,
        res.data
      )

      if (status === 404) {
        return returnServerError('Template not found')
      }

      return handleDefaultInfraError(status)
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/templates`, 'page')
  })
