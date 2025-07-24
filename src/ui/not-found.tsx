'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { ArrowLeft, HomeIcon, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { Button } from './primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './primitives/card'

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md border border-border bg-bg-100/40 backdrop-blur-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-light">404</CardTitle>
          <CardDescription className="mt-2 text-lg">
            Page Not Found
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-fg-500">
          <p>
            The page you are looking for might have been removed, had its name
            changed, or is temporarily unavailable.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-4">
          <div className="flex w-full justify-between gap-4">
            <Button variant="outline" asChild className="flex-1">
              <Link href="/" className="gap-2">
                <HomeIcon className="h-4 w-4 text-fg-500" />
                Home
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href={PROTECTED_URLS.DASHBOARD} className="gap-2">
                <LayoutDashboard className="h-4 w-4 text-fg-500" />
                Dashboard
              </Link>
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="w-full gap-2"
          >
            <ArrowLeft className="h-4 w-4 text-fg-500" />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
