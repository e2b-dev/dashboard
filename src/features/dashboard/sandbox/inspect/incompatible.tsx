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
import CopyButton from '@/ui/copy-button'

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
          <CardHeader className="pb-4">
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
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-fg-500 text-sm">
                The underlying template of this Sandbox is incompatible with the
                filesystem inspector. To view accurate filesystem data, you need
                to <b className="text-fg">rebuild the Template</b>.
              </p>
            </div>

            {templateNameOrId && (
              <div className="bg-bg-200 relative rounded-md p-3">
                <p className="text-fg-500 mb-1 text-xs font-medium">
                  Template to Update:
                </p>
                <CopyButton
                  variant="ghost"
                  size="iconSm"
                  value={templateNameOrId}
                  className="absolute top-2 right-2"
                />
                <code className="text-fg-800 w-full font-mono text-sm">
                  {templateNameOrId}
                </code>
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
                  Build a Template
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
