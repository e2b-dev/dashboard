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
import { PROTECTED_URLS } from '@/configs/urls'
import Link from 'next/link'
import { CodeBlock } from '@/ui/code-block'
import { Badge } from '@/ui/primitives/badge'
import ExternalIcon from '@/ui/external-icon'

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className="w-full max-w-md"
      >
        <Card className="w-full">
          <CardHeader className="px-0 pb-10">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-warning h-5 w-5" />
              <CardTitle className="text-lg">Incompatible Template</CardTitle>
            </div>
            <CardDescription className="text-fg-300 space-y-3 leading-5">
              <p>
                This Sandbox uses a Template, which is incompatible with the
                filesystem inspector.
              </p>
              <p>
                To view filesystem data, you need to{' '}
                <span className="text-fg font-medium">
                  rebuild the Template
                </span>
                .
              </p>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {templateNameOrId && (
              <ol className="ml-4 list-decimal space-y-6.5 font-sans leading-5">
                <li className="text-fg flex-col space-y-3 marker:font-semibold">
                  <p className="font-semibold">
                    Navigate to your Template's folder
                  </p>
                  <CodeBlock className="-ml-4" title="" lang="bash">
                    {`cd your-template-folder`}
                  </CodeBlock>
                  <p className="text-fg-300 -ml-4">
                    The folder should contain an{' '}
                    <Badge
                      className="mx-1 h-5.5 rounded-none"
                      variant="outline"
                    >
                      e2b.toml
                    </Badge>{' '}
                    file.
                  </p>
                </li>

                <li className="text-fg flex-col space-y-3 marker:font-semibold">
                  <p className="font-semibold">Build the template</p>
                  <CodeBlock className="-ml-4" title="" lang="bash">
                    {`e2b template build # -c "start.sh"`}
                  </CodeBlock>
                  <p className="text-fg-300 -ml-4">
                    Add{' '}
                    <Badge
                      className="mx-1 h-5.5 rounded-none"
                      variant="outline"
                    >
                      -c "your start command"
                    </Badge>{' '}
                    to specify a start command. (optional)
                  </p>
                </li>
              </ol>
            )}
          </CardContent>
          <CardFooter className="justify-between border-none px-0 pt-10">
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
              variant="outline"
              className="pr-3 font-sans normal-case"
            >
              Documentation{' '}
              <ArrowUpRight className="text-fg-500 size-5 !stroke-[1px]" />
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
