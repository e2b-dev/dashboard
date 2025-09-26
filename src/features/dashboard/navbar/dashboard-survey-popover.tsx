'use client'

import { useAppPostHogProvider } from '@/features/posthog-provider'
import { l } from '@/lib/clients/logger/logger'
import { Popover, PopoverContent } from '@/ui/primitives/popover'
import { SurveyContent } from '@/ui/survey'
import { PopoverTrigger } from '@radix-ui/react-popover'
import { usePostHog } from 'posthog-js/react'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

interface DashboardSurveyPopoverProps {
  trigger: React.ReactNode
}

function DashboardSurveyPopover({ trigger }: DashboardSurveyPopoverProps) {
  const posthog = usePostHog()
  const [isOpen, setIsOpen] = useState(false)
  const [wasSubmitted, setWasSubmitted] = useState(false)

  const { dashboardFeedbackSurvey, isInitialized } = useAppPostHogProvider()

  const handleSubmit = useCallback(
    (responses: Record<number, string>) => {
      if (!dashboardFeedbackSurvey) return

      const responseData = Object.entries(responses).reduce(
        (acc, [index, response]) => ({
          ...acc,
          [`$survey_response${index === '0' ? '' : '_' + index}`]: response,
        }),
        {}
      )

      posthog.capture('survey sent', {
        $survey_id: dashboardFeedbackSurvey.id,
        ...responseData,
      })

      setWasSubmitted(true)

      toast.success('Thank you! Your feedback has been recorded.')

      // reset states
      setIsOpen(false)
      setTimeout(() => {
        setWasSubmitted(false)
      }, 100)
    },
    [dashboardFeedbackSurvey, posthog]
  )

  // we will optimistically render the button on first render.
  // if we can't resolve the survey on the client side, we hide the button.
  if (!dashboardFeedbackSurvey && isInitialized) {
    return null
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (!dashboardFeedbackSurvey) {
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

        if (!open && !wasSubmitted && dashboardFeedbackSurvey) {
          posthog.capture('survey dismissed', {
            $survey_id: dashboardFeedbackSurvey.id,
          })
        }
        if (open && dashboardFeedbackSurvey) {
          posthog.capture('survey shown', {
            $survey_id: dashboardFeedbackSurvey.id,
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
        {dashboardFeedbackSurvey && (
          <SurveyContent
            survey={dashboardFeedbackSurvey}
            isLoading={!isInitialized}
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
