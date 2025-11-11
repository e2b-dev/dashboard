import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import BillingCreditsContent from '../billing/credits-content'

interface CreditsCardProps {
  params: Promise<{ teamIdOrSlug: string }>
  className?: string
}

export default async function CreditsCard({
  params,
  className,
}: CreditsCardProps) {
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
        <BillingCreditsContent params={params} />
      </CardContent>
    </Card>
  )
}
