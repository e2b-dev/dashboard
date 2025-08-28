'use server'

import { SUPABASE_AUTH_HEADERS } from '@/configs/api'
import { authActionClient } from '@/lib/clients/action'
import { infra } from '@/lib/clients/api'
import { l } from '@/lib/clients/logger'
import { handleDefaultInfraError, returnServerError } from '@/lib/utils/action'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

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

      l.error(
        {
          key: 'DELETE_TEMPLATE_ACTION:INFRA_ERROR',
          error: res.error,
          user_id: ctx.session.user.id,
          template_id: templateId,
          context: {
            status,
          },
        },
        `Failed to delete template: ${res.error.message}`
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

      l.error(
        {
          key: 'update_template_action:infra_error',
          error: res.error,
          user_id: ctx.session.user.id,
          template_id: templateId,
          context: {
            status,
          },
        },
        `Failed to update template: ${res.error.message}`
      )

      if (status === 404) {
        return returnServerError('Template not found')
      }

      return handleDefaultInfraError(status)
    }

    revalidatePath(`/dashboard/[teamIdOrSlug]/templates`, 'page')
  })
