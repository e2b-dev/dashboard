'use client'

import { l } from '@/lib/clients/logger/logger'
import { useToast } from '@/lib/hooks/use-toast'
import { Popover, PopoverContent } from '@/ui/primitives/popover'
import { SurveyContent } from '@/ui/survey'
import { PopoverTrigger } from '@radix-ui/react-popover'
import { Survey } from 'posthog-js'
import { usePostHog } from 'posthog-js/react'
import { useCallback, useState } from 'react'
import useSWR from 'swr'

interface DashboardSurveyPopoverProps {
  trigger: React.ReactNode
}

function DashboardSurveyPopover({ trigger }: DashboardSurveyPopoverProps) {
  const posthog = usePostHog()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [wasSubmitted, setWasSubmitted] = useState(false)

  const { data: survey, isLoading } = useSWR<Survey | undefined>(
    ['dashboard-feedback-survey', posthog.__loaded],
    () => {
      return new Promise<Survey | undefined>((resolve) => {
        posthog.getSurveys((surveys) => {
          for (const survey of surveys) {
            if (
              survey.id ===
              process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_FEEDBACK_SURVEY_ID
            ) {
              resolve(survey)
              return
            }
          }
          resolve(undefined)
        })
      })
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      revalidateIfStale: false,
      dedupingInterval: Infinity,
      shouldRetryOnError: false,
    }
  )

  const handleSubmit = useCallback(
    (responses: Record<number, string>) => {
      if (!survey) return

      const responseData = Object.entries(responses).reduce(
        (acc, [index, response]) => ({
          ...acc,
          [`$survey_response${index === '0' ? '' : '_' + index}`]: response,
        }),
        {}
      )

      posthog.capture('survey sent', {
        $survey_id: survey.id,
        ...responseData,
      })

      setWasSubmitted(true)

      toast({
        title: 'Thank you!',
        description: 'Your feedback has been recorded.',
      })

      // reset states
      setIsOpen(false)
      setTimeout(() => {
        setWasSubmitted(false)
      }, 100)
    },
    [survey, posthog, toast]
  )

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (!survey) {
          l.error(
            {
              key: 'dashboard_survey_popover:survey_not_found',
              context: {
                survey_id:
                  process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_FEEDBACK_SURVEY_ID,
              },
            },
            'Tried to open survey popover but survey was not found.'
          )
          return
        }

        if (!open && !wasSubmitted && survey) {
          posthog.capture('survey dismissed', {
            $survey_id: survey.id,
          })
        }
        if (open && survey) {
          posthog.capture('survey shown', {
            $survey_id: survey.id,
          })
        }
        setIsOpen(open)
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>

      <PopoverContent
        className="w-[400px]"
        collisionPadding={20}
        sideOffset={25}
      >
        {survey && (
          <SurveyContent
            survey={survey}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}

export default function DashboardSurveyPopoverResolver(
  props: DashboardSurveyPopoverProps
) {
  if (
    !process.env.NEXT_PUBLIC_POSTHOG_DASHBOARD_FEEDBACK_SURVEY_ID ||
    !process.env.NEXT_PUBLIC_POSTHOG_KEY
  ) {
    return null
  }

  return <DashboardSurveyPopover {...props} />
}
