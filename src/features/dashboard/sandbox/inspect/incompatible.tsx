'use client'

import {
  AlertTriangle,
  ArrowLeft,
  CircleAlert,
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
import CopyButton from '@/ui/copy-button'

interface StepCardProps {
  step: number
  description: string
  children: React.ReactNode
}

function StepCard({ step, description, children }: StepCardProps) {
  return (
    <div className="flex gap-3">
      <div className="text-fg bg-bg-300 flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium">
        {step}
      </div>
      <div className="flex-1 space-y-2 pt-1">
        <p className="text-fg font-bold">{description}</p>
        <div className="text-fg-600 text-sm">{children}</div>
      </div>
    </div>
  )
}

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
        <Card className="bg-bg-100 w-full border shadow-lg">
          <CardHeader>
            <div className="flex gap-3 max-md:flex-col md:items-center">
              <div className="bg-warning/10 flex h-10 w-10 items-center justify-center rounded-full">
                <AlertTriangle className="text-warning h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  Incompatible Template Version
                </CardTitle>
                <CardDescription className="text-fg-500 text-sm">
                  This Sandbox uses an outdated Template.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <p className="text-fg-500">
              The underlying template of this Sandbox is incompatible with the
              filesystem inspector. To view accurate filesystem data, you need
              to <b className="text-fg">rebuild the Template</b>.
            </p>

            {templateNameOrId && (
              <div className="space-y-8 pl-1">
                <StepCard
                  step={1}
                  description="Navigate to your Template folder"
                >
                  <div className="relative mt-2 space-y-2">
                    <p className="text-fg-300 gap-1.5 text-xs">
                      Go to your Template folder
                    </p>
                    <div className="flex w-fit items-center justify-between gap-2">
                      <code className="text-fg bg-bg-300 rounded border px-2 py-1 text-xs">
                        cd
                        {' your-template-folder'}
                      </code>
                      <CopyButton
                        variant="ghost"
                        size="iconSm"
                        value={`cd your-template-folder`}
                        className="text-fg-300 size-5"
                      />
                    </div>
                    <p className="text-fg-300 inline-flex gap-1.5 text-xs">
                      Your Template folder should contain an{' '}
                      <code className="text-accent">e2b.toml</code> file.
                    </p>
                  </div>
                </StepCard>

                <StepCard step={2} description="Build the template">
                  <div className="group relative mt-2">
                    <p className="text-fg-500 text-xs">
                      Optional: Add{' '}
                      <code className="text-fg-800 bg-bg-200 rounded px-1 text-xs">
                        -c "start.sh"
                      </code>{' '}
                      to specify a custom start command
                    </p>
                    <div className="flex items-center justify-between">
                      <code className="text-fg-800 bg-bg-200 rounded px-2 py-1 font-mono text-sm">
                        <span className="text-fg-500">$</span> e2b template
                        build
                      </code>
                      <CopyButton
                        variant="ghost"
                        size="iconSm"
                        value="e2b template build"
                        className="opacity-0 transition-opacity group-hover:opacity-100"
                      />
                    </div>
                  </div>
                </StepCard>
              </div>
            )}

            <div className="flex flex-col gap-2 md:flex-row">
              <Button asChild variant="outline" className="w-full">
                <Link href={PROTECTED_URLS.DASHBOARD + '?tab=sandboxes'}>
                  <ArrowLeft className="text-fg-500 h-4 w-4" />
                  Go to Sandboxes
                </Link>
              </Button>
              <Button asChild className="w-full">
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
