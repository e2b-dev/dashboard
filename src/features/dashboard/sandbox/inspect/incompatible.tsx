'use client'

import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { PROTECTED_URLS } from '@/configs/urls'
import Link from 'next/link'
import { CodeBlock } from '@/ui/code-block'
import { Badge } from '@/ui/primitives/badge'

interface SandboxInspectIncompatibleProps {
  templateNameOrId?: string
}

export default function SandboxInspectIncompatible({
  templateNameOrId,
}: SandboxInspectIncompatibleProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center p-4 md:justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Card className="w-full">
          <CardHeader>
            <div className="flex gap-3 max-md:flex-col md:items-center">
              <AlertTriangle className="text-warning h-5 w-5" />
              <CardTitle className="text-lg">Incompatible Template</CardTitle>
            </div>
            <CardDescription>
              This Sandbox uses a Template, which is incompatible with the
              filesystem inspector.
              <br />
              <br />
              To view filesystem data, you need to{' '}
              <span className="text-fg font-medium">rebuild the Template</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-10">
            {templateNameOrId && (
              <ol className="ml-4 list-decimal space-y-8 font-sans">
                <li className="flex-col space-y-3">
                  <p className="font-semibold">
                    Navigate to your Template's folder
                  </p>
                  <CodeBlock className="-ml-4" title="" lang="bash">
                    {`cd your-template-folder`}
                  </CodeBlock>
                  <p className="-ml-4">
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

                <li className="space-y-3">
                  <p className="font-semibold">Build the template</p>
                  <CodeBlock className="-ml-4" title="" lang="bash">
                    {`e2b template build # -c "start.sh"`}
                  </CodeBlock>
                  <p className="-ml-4">
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

            <div className="flex flex-col justify-stretch gap-2 md:flex-row md:justify-between">
              <Button
                asChild
                variant="ghost"
                size="slate"
                className="text-fg-500 hover:text-fg font-sans font-medium normal-case"
              >
                <Link href={PROTECTED_URLS.DASHBOARD + '?tab=sandboxes'}>
                  <ChevronLeft className="text-fg-500 h-4 w-4" />
                  Back to Sandboxes
                </Link>
              </Button>
              <Button asChild variant="outline" className="">
                <Link
                  href={
                    'https://e2b.dev/docs/sandbox-template#3-customize-e2b-dockerfile'
                  }
                  target="_blank"
                >
                  Documentation
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
