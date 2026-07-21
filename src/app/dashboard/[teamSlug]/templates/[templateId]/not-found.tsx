'use client'

import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/ui/primitives/card'
import { ArrowLeftIcon } from '@/ui/primitives/icons'

export default function TemplateNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md border border-stroke bg-bg-1/40 backdrop-blur-lg">
        <CardHeader className="text-center">
          <span className="prose-value-big">404</span>
          <CardDescription>Template not found</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-fg-secondary">
          <p>We couldn’t find this template in your project.</p>
        </CardContent>
        <CardFooter>
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
    </div>
  )
}
