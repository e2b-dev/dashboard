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
} from './primitives/card'

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md border border-stroke bg-bg-1/40 backdrop-blur-lg">
        <CardHeader className="text-center">
          <span className="prose-value-big">404</span>
          <CardDescription>Page not found.</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-fg-secondary">
          <p>
            The page you are looking for might have been removed, had its name
            changed, or is temporarily unavailable.
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
                <LayoutDashboard />
                Dashboard
              </Link>
            </Button>
          </div>
          <Button
            variant="secondary"
            onClick={() => window.history.back()}
            className="w-full"
          >
            <ArrowLeft />
            Go Back
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
