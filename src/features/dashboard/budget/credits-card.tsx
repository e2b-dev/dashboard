import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import { Loader } from '@/ui/primitives/loader'
import { Suspense } from 'react'
import BillingCreditsContent from '../billing/credits-content'

interface CreditsCardProps {
  teamId: string
  className?: string
}

export default function CreditsCard({ teamId, className }: CreditsCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-mono">Credits</CardTitle>
        <CardDescription>
          Your current credits balance.
          <br /> Usage costs are deducted from your credits.
        </CardDescription>
      </CardHeader>
      <CardContent className="max-w-[500px] text-xs">
        <Suspense fallback={<Loader className="text-xl" />}>
          <BillingCreditsContent teamId={teamId} />
        </Suspense>
      </CardContent>
    </Card>
  )
}
