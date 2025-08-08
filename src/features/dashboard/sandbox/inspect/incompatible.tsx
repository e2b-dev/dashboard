'use client'

import { HELP_URLS, PROTECTED_URLS } from '@/configs/urls'
import { useSandboxInspectAnalytics } from '@/lib/hooks/use-analytics'
import { CodeBlock } from '@/ui/code-block'
import { AsciiBackgroundPattern } from '@/ui/patterns'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { AlertTriangle, ArrowUpRight, ChevronLeft } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useEffect } from 'react'

interface SandboxInspectIncompatibleProps {
  templateNameOrId?: string
  teamIdOrSlug: string
}

export default function SandboxInspectIncompatible({
  templateNameOrId,
  teamIdOrSlug,
}: SandboxInspectIncompatibleProps) {
  const codeClassNames = 'mx-0.5 h-5.5 rounded-none align-middle'
  const { trackInteraction } = useSandboxInspectAnalytics()

  useEffect(() => {
    if (!templateNameOrId || !teamIdOrSlug) return

    trackInteraction('viewed_incompatible', {
      team_id: teamIdOrSlug,
      template_name_or_id: templateNameOrId,
    })
  }, [trackInteraction, teamIdOrSlug])

  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4 md:justify-center">
      <div className="text-fill-highlight pointer-events-none absolute -top-30 -right-100 -z-10 flex overflow-hidden">
        <AsciiBackgroundPattern className="w-1/2" />
        <AsciiBackgroundPattern className="mi w-1/2 -scale-x-100" />
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="relative z-10 h-fit w-fit"
      >
        <Card className="bg-bg flex h-full min-h-160 w-full max-w-150 flex-col justify-between border p-7">
          <CardHeader className="px-0 pt-0 pb-7">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-accent-warning-highlight h-5 w-5" />
              <CardTitle>Incompatible template</CardTitle>
            </div>
            <CardDescription className="text-fg-secondary leading-5">
              This sandbox used a template that is incompatible with the
              filesystem inspector. To use the inspector in any new sandbox you
              launch, <span className="text-fg ">rebuild the template</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-auto flex-1 p-0">
            {templateNameOrId && (
              <ol className="ml-4 list-decimal space-y-6 font-sans leading-5">
                <li className="text-fg flex-col space-y-3 marker:">
                  <p className="">Navigate to your template's folder</p>
                  <CodeBlock className="-ml-4" lang="bash">
                    {`cd path/to/your/template`}
                  </CodeBlock>
                  <div className="text-fg-secondary -ml-4 inline-block">
                    The folder should contain an{' '}
                    <Badge className={codeClassNames} variant="code">
                      e2b.toml
                    </Badge>{' '}
                    file.
                  </div>
                </li>

                <li className="text-fg flex-col space-y-3 marker:">
                  <p className="">Rebuild the template</p>
                  <div className="text-fg-secondary -ml-4 inline-block leading-6">
                    Use{' '}
                    <Badge className={codeClassNames} variant="code">
                      e2b template build
                    </Badge>{' '}
                    along with custom{' '}
                    <Link
                      className="text-fg underline"
                      href={HELP_URLS.START_COMMAND}
                      target="_blank"
                    >
                      start commands
                    </Link>{' '}
                    and any other arguments to rebuild. For example:
                    <Badge className={codeClassNames} variant="code">
                      -c "start.sh"
                    </Badge>
                  </div>
                </li>

                <li className="text-fg flex-col space-y-3 marker:">
                  <p className="">New sandboxes have filesystem inspector</p>
                  <div className="text-fg-secondary -ml-4 inline-block leading-6">
                    Any new sandbox you launch will have filesystem inspector
                    enabled.{' '}
                    <b>This won&apos;t affect already started sandboxes.</b>
                  </div>
                </li>
              </ol>
            )}
          </CardContent>
          <CardFooter className="pt-auto justify-between border-none px-0 pb-0 max-md:flex-col max-md:gap-4">
            <Button
              variant="ghost"
              size="slate"
              className="text-fg-tertiary hover:text-fg font-sans normal-case max-md:w-full max-md:justify-start"
              asChild
            >
              <Link href={PROTECTED_URLS.SANDBOXES(teamIdOrSlug)}>
                <ChevronLeft className="size-5" />
                Back to Sandboxes
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="pr-3 font-sans normal-case max-md:w-full"
              asChild
            >
              <Link href={HELP_URLS.BUILD_TEMPLATE} target="_blank">
                Documentation{' '}
                <ArrowUpRight className="text-fill-highlight size-5 !stroke-[1px]" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
