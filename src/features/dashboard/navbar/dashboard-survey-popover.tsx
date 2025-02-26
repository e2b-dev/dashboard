'use client'

import { usePostHog } from 'posthog-js/react'
import { useState, useEffect } from 'react'
import { Survey } from 'posthog-js'
import { useToast } from '@/lib/hooks/use-toast'
import { Popover, PopoverContent } from '@/ui/primitives/popover'
import { PopoverTrigger } from '@radix-ui/react-popover'
import { Button } from '@/ui/primitives/button'
import { MessageSquarePlus } from 'lucide-react'
import { SurveyContent } from '@/ui/survey'

export function DashboardSurveyPopover() {
  const posthog = usePostHog()
  const { toast } = useToast()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [wasSubmitted, setWasSubmitted] = useState(false)

  useEffect(() => {
    if (!survey) {
      setIsLoading(true)
      posthog.getSurveys((surveys) => {
        const survey = surveys.find((survey) =>
          survey.name.includes('Dashboard')
        )
        if (!survey) return

        setSurvey(survey)

        setIsLoading(false)
      })
    }
  }, [posthog, survey])

  const handleSubmit = (responses: Record<number, string>) => {
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
      title: 'Thank you for your feedback!',
      description: 'Your response has been recorded.',
    })

    // Reset states
    setIsOpen(false)
    setTimeout(() => {
      setWasSubmitted(false)
    }, 100)
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
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
      <PopoverTrigger asChild>
        <Button size="sm" className="gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Feedback
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px]"
        collisionPadding={20}
        sideOffset={25}
      >
        <SurveyContent
          survey={survey}
          isLoading={isLoading}
          onSubmit={handleSubmit}
        />
      </PopoverContent>
    </Popover>
  )
}
