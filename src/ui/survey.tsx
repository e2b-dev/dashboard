import { cn } from '@/lib/utils'
import { Loader } from '@/ui/loader'
import { Button } from '@/ui/primitives/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { Textarea } from '@/ui/primitives/textarea'
import { SurveyQuestion as PostHogSurveyQuestion, Survey } from 'posthog-js'
import { useCallback, useMemo, useState } from 'react'
import {
  PiSmileyAngryFill,
  PiSmileyFill,
  PiSmileyMehFill,
  PiSmileySadFill,
} from 'react-icons/pi'
import { PiSmileyStarEyesFill } from './icons'

const EMOJI_SIZE = '38px'

const EMOJIS_3 = [
  <PiSmileySadFill size={EMOJI_SIZE} key="emoji-icon-1" />,
  <PiSmileyMehFill size={EMOJI_SIZE} key="emoji-icon-1" />,
  <PiSmileyFill size={EMOJI_SIZE} key="emoji-icon-3" />,
]

const EMOJIS_5 = [
  <PiSmileyAngryFill size={EMOJI_SIZE} key="emoji-icon-0" />,
  <PiSmileySadFill size={EMOJI_SIZE} key="emoji-icon-1" />,
  <PiSmileyMehFill size={EMOJI_SIZE} key="emoji-icon-2" />,
  <PiSmileyFill size={EMOJI_SIZE} key="emoji-icon-3" />,
  <PiSmileyStarEyesFill size={EMOJI_SIZE} key="emoji-icon-4" />,
]

interface SurveyContentProps {
  survey: Survey | null
  isLoading: boolean
  onSubmit: (responses: Record<number, string>) => void
}

export function SurveyContent({
  survey,
  isLoading,
  onSubmit,
}: SurveyContentProps) {
  const [responses, setResponses] = useState<Record<number, string>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)

  const currentQuestion = useMemo(() => {
    if (!survey) return null
    return survey.questions[currentQuestionIndex]
  }, [survey, currentQuestionIndex])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(responses)
    // Reset state
    setResponses({})
    setCurrentQuestionIndex(0)
  }

  const renderQuestion = useCallback(
    (question: PostHogSurveyQuestion) => {
      switch (question.type) {
        case 'rating':
          return (
            <div className="flex justify-between">
              {question.display === 'emoji'
                ? // Emoji ratings
                  (question.scale === 3 ? EMOJIS_3 : EMOJIS_5).map(
                    (emoji, emojiIndex) => (
                      <Button
                        key={emojiIndex}
                        type="button"
                        variant={'ghost'}
                        size="iconLg"
                        className={cn(
                          'text-fg-500 hover:text-fg-300 size-14 rounded-xl hover:scale-[1.03]',
                          {
                            'bg-bg-300 border-border-200 text-fg border':
                              responses[currentQuestionIndex] ===
                              String(emojiIndex + 1),
                          }
                        )}
                        onClick={() =>
                          setResponses((prev) => ({
                            ...prev,
                            [currentQuestionIndex]: String(emojiIndex + 1),
                          }))
                        }
                      >
                        {emoji}
                      </Button>
                    )
                  )
                : // Numeric ratings
                  Array.from({ length: question.scale }, (_, i) => i + 1).map(
                    (num) => (
                      <Button
                        key={num}
                        type="button"
                        variant={
                          responses[currentQuestionIndex] === String(num)
                            ? 'default'
                            : 'outline'
                        }
                        size="iconLg"
                        onClick={() =>
                          setResponses((prev) => ({
                            ...prev,
                            [currentQuestionIndex]: String(num),
                          }))
                        }
                      >
                        {num}
                      </Button>
                    )
                  )}
            </div>
          )

        case 'open':
          return (
            <Textarea
              placeholder={survey?.appearance?.placeholder}
              value={responses[currentQuestionIndex] || ''}
              className="min-h-28"
              onChange={(e) =>
                setResponses((prev) => ({
                  ...prev,
                  [currentQuestionIndex]: e.target.value,
                }))
              }
            />
          )

        default:
          return null
      }
    },
    [responses, currentQuestionIndex, survey?.appearance?.placeholder]
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (!survey) {
    return (
      <p className="text-fg-500 text-center">No active surveys available</p>
    )
  }

  return (
    <div>
      <CardHeader>
        <CardTitle className="font-sans text-xl normal-case">
          {currentQuestion?.question}
        </CardTitle>
        {currentQuestion?.description && (
          <CardDescription className="text-md">
            {currentQuestion?.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {currentQuestion && renderQuestion(currentQuestion)}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
              disabled={currentQuestionIndex === 0}
            >
              Back
            </Button>
            {currentQuestionIndex === survey.questions.length - 1 ? (
              <Button type="submit">{currentQuestion?.buttonText}</Button>
            ) : (
              <Button
                type="button"
                disabled={responses[currentQuestionIndex] === undefined}
                onClick={(e) => {
                  e.preventDefault()
                  setCurrentQuestionIndex((i) =>
                    Math.min(survey.questions.length - 1, i + 1)
                  )
                }}
              >
                {currentQuestion?.buttonText}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </div>
  )
}
