'use client'

import {
  AlertTriangle,
  ArrowUpRight,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { HELP_URLS, PROTECTED_URLS } from '@/configs/urls'
import Link from 'next/link'
import { CodeBlock } from '@/ui/code-block'
import { Badge } from '@/ui/primitives/badge'
import { AsciiBackgroundPattern } from '@/ui/patterns'

interface SandboxInspectIncompatibleProps {
  templateNameOrId?: string
  teamIdOrSlug: string
}

export default function SandboxInspectIncompatible({
  templateNameOrId,
  teamIdOrSlug,
}: SandboxInspectIncompatibleProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4 md:justify-center">
      <div className="text-border-300 pointer-events-none absolute -top-30 -right-100 -z-10 flex overflow-hidden">
        <AsciiBackgroundPattern className="w-1/2" />
        <AsciiBackgroundPattern className="mi w-1/2 -scale-x-100" />
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="bg-bg w-full border">
          <CardHeader className="pb-10">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-warning h-5 w-5" />
              <CardTitle className="text-lg">Incompatible template</CardTitle>
            </div>
            <CardDescription className="text-fg-300 flex flex-col gap-3 leading-5">
              <span>
                This sandbox uses a template, which is incompatible with the
                filesystem inspector.
              </span>
              <span>
                To view filesystem data, you need to{' '}
                <span className="text-fg font-medium">
                  rebuild the template
                </span>
                .
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="py-0">
            {templateNameOrId && (
              <ol className="ml-4 list-decimal space-y-6.5 font-sans leading-5">
                <li className="text-fg flex-col space-y-3 marker:font-semibold">
                  <p className="font-semibold">
                    Navigate to your template's folder
                  </p>
                  <CodeBlock className="-ml-4" title="" lang="bash">
                    {`cd your-template-folder`}
                  </CodeBlock>
                  <div className="text-fg-300 -ml-4 inline-block">
                    The folder should contain an{' '}
                    <Badge
                      className="mx-1 h-5.5 rounded-none"
                      variant="outline"
                    >
                      e2b.toml
                    </Badge>{' '}
                    file.
                  </div>
                </li>

                <li className="text-fg flex-col space-y-3 marker:font-semibold">
                  <p className="font-semibold">Build the template</p>
                  <CodeBlock className="-ml-4" title="" lang="bash">
                    {`e2b template build # -c "start.sh"`}
                  </CodeBlock>
                  <div className="text-fg-300 -ml-4 inline-block">
                    Add{' '}
                    <Badge
                      className="mx-1 h-5.5 rounded-none"
                      variant="outline"
                    >
                      -c "your start command"
                    </Badge>{' '}
                    to specify a start command. (optional)
                  </div>
                </li>
              </ol>
            )}
          </CardContent>
          <CardFooter className="justify-between border-none pt-10">
            <Button
              variant="ghost"
              size="slate"
              className="text-fg-500 hover:text-fg font-sans normal-case"
              asChild
            >
              <Link href={PROTECTED_URLS.SANDBOXES(teamIdOrSlug)}>
                <ChevronLeft className="size-5" />
                Back to Sandboxes
              </Link>
            </Button>
            <Button
              size="lg"
              variant="warning"
              className="pr-3 font-sans normal-case"
              asChild
            >
              <Link href={HELP_URLS.BUILD_TEMPLATE} target="_blank">
                Documentation <ArrowUpRight className="size-5 !stroke-[1px]" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
