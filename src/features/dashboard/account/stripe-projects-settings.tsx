import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import {
  CheckIcon,
  ExternalLinkIcon,
  LinkIcon,
  SandboxIcon,
} from '@/ui/primitives/icons'

const rows = [
  ['Provider account', 'acct_stripe_projects_demo'],
  ['Linked team', 'Acme Engineering'],
  ['Default service', 'E2B Sandbox'],
  ['Credential scope', 'Team provisioning only'],
]

const steps = [
  'Stripe sends an account request to E2B.',
  'The user signs in and chooses this team.',
  'E2B returns team-scoped credentials to Stripe.',
]

export function StripeProjectsSettings() {
  return (
    <section className="border-stroke flex flex-col gap-5 border-t py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="border-stroke bg-bg-1 flex size-11 shrink-0 items-center justify-center border">
            <span className="text-fg text-lg font-semibold">S</span>
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-fg text-xl leading-6 font-semibold">
                Stripe Projects
              </h2>
              <Badge variant="positive" size="md">
                Demo
              </Badge>
            </div>
            <p className="text-fg-secondary max-w-[620px] text-sm leading-6">
              Let Stripe Projects provision E2B sandboxes through this team.
              Users connect Stripe from the dashboard before any team
              credentials are issued.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button variant="secondary" className="w-full sm:w-auto">
            <ExternalLinkIcon className="size-4" />
            Open in Stripe
          </Button>
          <Button className="w-full sm:w-auto">
            <LinkIcon className="size-4" />
            Connect
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="border-stroke bg-bg-1 border p-3">
            <div className="text-fg-tertiary text-xs leading-4 uppercase">
              {label}
            </div>
            <div className="text-fg-secondary mt-2 truncate font-mono text-sm">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="border-stroke bg-bg flex flex-col gap-5 border p-5">
          <div className="space-y-2">
            <h3 className="text-fg text-base font-semibold">
              Account linking flow
            </h3>
            <p className="text-fg-secondary text-sm leading-6">
              This is where a team owner would review incoming Stripe account
              requests and decide which E2B team should back the provider
              account.
            </p>
          </div>

          <div className="divide-stroke border-stroke divide-y border">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-3 p-4">
                <div className="border-stroke bg-bg-1 text-fg-tertiary flex size-6 shrink-0 items-center justify-center border font-mono text-xs">
                  {index + 1}
                </div>
                <p className="text-fg-secondary text-sm leading-6">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-stroke bg-bg flex flex-col gap-4 border p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SandboxIcon className="text-icon-tertiary size-4" />
              <h3 className="text-fg text-base font-semibold">Provisioning</h3>
            </div>
            <Badge variant="info" size="md">
              Pending
            </Badge>
          </div>

          <div className="space-y-3">
            <SettingRow label="Default template" value="base" />
            <SettingRow label="Resource mode" value="Async" />
            <SettingRow label="Team approval" value="Required" />
          </div>

          <div className="border-stroke bg-bg-1 flex gap-2 border p-3">
            <CheckIcon className="text-accent-positive-highlight mt-0.5 size-4 shrink-0" />
            <p className="text-fg-secondary text-sm leading-5">
              New provider accounts should land here after the redirect. Repeat
              links can skip this page once a Stripe account is already mapped
              to a team.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-fg-tertiary">{label}</span>
      <span className="text-fg-secondary font-mono">{value}</span>
    </div>
  )
}
