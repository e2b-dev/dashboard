'use client'

import { BillingLimit } from '@/types/billing'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card'
import { useDashboard } from '../context'
import LimitForm from './limit-form'

interface AlertCardProps {
  className?: string
  value: BillingLimit['alert_amount_gte']
}

export default function AlertCard({ className, value }: AlertCardProps) {
  const { team } = useDashboard()

  if (!team) return null

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="font-mono">Set a Budget Alert</CardTitle>
      </CardHeader>
      <CardContent className="text-fg-secondary max-w-[500px]">
        <LimitForm
          className="mb-4"
          teamId={team.id}
          originalValue={value}
          type="alert"
        />
        <p>
          If your team exceeds this threshold in a given month, you&apos;ll
          receive an alert notification to <b>{team.email}</b>. This will not
          result in any interruptions to your service.
        </p>
      </CardContent>
    </Card>
  )
}
