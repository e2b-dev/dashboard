'use client'

import Link from 'next/link'
import { PROTECTED_URLS } from '@/configs/urls'
import { AsciiBackgroundPattern } from '@/ui/patterns'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/ui/primitives/card'
import {
  ArrowLeftIcon,
  HomeIcon,
  PersonsIcon,
  ShieldXIcon,
} from '@/ui/primitives/icons'

export default function Unauthorized() {
  return (
    <div className="flex h-svh items-center justify-center relative">
      {/* Card */}
      <Card className="w-full max-w-md border border-stroke bg-bg-1/40 backdrop-blur-lg z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <ShieldXIcon className="h-12 w-12 text-fg-tertiary" />
          </div>
          <span className="prose-value-big">403</span>
          <CardDescription>Access denied.</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-fg-secondary">
          <p>
            You don't have permission to access this team. Please contact the
            team owner or administrator to request access.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-1">
          <div className="flex w-full gap-1">
            <Button variant="secondary" asChild className="flex-1">
              <Link href="/">
                <HomeIcon />
                Home
              </Link>
            </Button>
            <Button variant="secondary" asChild className="flex-1">
              <Link href={PROTECTED_URLS.DASHBOARD}>
                <PersonsIcon />
                My Teams
              </Link>
            </Button>
          </div>
          <Button
            variant="secondary"
            onClick={() => window.history.back()}
            className="w-full"
          >
            <ArrowLeftIcon />
            Go Back
          </Button>
        </CardFooter>
      </Card>

      {/* Background pattern */}
      <div className="fixed inset-0 flex overflow-hidden">
        <div className="text-fill-highlight pointer-events-none absolute top-0 -left-250 flex justify-start overflow-hidden">
          <AsciiBackgroundPattern className="w-auto text-right!" />
          <AsciiBackgroundPattern className="w-auto text-right! -scale-x-100" />
        </div>
      </div>
    </div>
  )
}
