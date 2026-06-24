'use client'

import {
  Node,
  type OryCardSettingsSectionProps,
  OryCardValidationMessages,
  type OryFlowComponentOverrides,
  OrySettingsFormSection,
  useOryFlow,
} from '@ory/elements-react'
import { SessionProvider } from '@ory/elements-react/client'
import { Settings } from '@ory/elements-react/theme'
import { type ComponentProps, useState } from 'react'
import { oryComponents } from '@/app/login/components'
import { AUTH_URLS } from '@/configs/urls'
import { Button } from '@/ui/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/primitives/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog'
import { Input } from '@/ui/primitives/input'

type SettingsProps = ComponentProps<typeof Settings>

interface SettingsCardsProps extends Pick<SettingsProps, 'flow' | 'config'> {
  // Read-only Kratos identity traits, shown for reference during the reset.
  name: string | null
  email: string | null
}

// <Settings>'s default body (OryPageHeader + OrySettingsCard) and the form
// wrapper (Card.SettingsSection) are unstyled without the Ory theme stylesheet,
// which the dashboard never loads. We render our own dashboard card via the
// `children` slot and only override the form wrapper Ory drives submission with;
// inputs/buttons/messages already use the dashboard-themed oryComponents.
function SettingsSectionForm({
  children,
  action,
  method,
  onSubmit,
}: OryCardSettingsSectionProps) {
  return (
    <form
      action={action}
      method={method}
      onSubmit={onSubmit}
      className="w-full"
    >
      {children}
    </form>
  )
}

const settingsComponents: OryFlowComponentOverrides = {
  ...oryComponents,
  Card: {
    ...oryComponents.Card,
    SettingsSection: SettingsSectionForm,
  },
}

type SettingsNode = ReturnType<typeof useOryFlow>['flow']['ui']['nodes'][number]

// The submit ("Save") node; the cast sidesteps the union typing of node
// attributes (and the dual @ory/client-fetch copies this repo installs).
function isSubmitNode(node: SettingsNode): boolean {
  return (
    'type' in node.attributes &&
    (node.attributes as { type?: string }).type === 'submit'
  )
}

// Read-only reference field (name / e-mail). Shown for context during the
// password reset — account edits live on the gated /dashboard/account page.
function ReadOnlyField({
  title,
  description,
  value,
}: {
  title: string
  description: string
  value: string | null
}) {
  return (
    <Card className="overflow-hidden border-b md:border">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Input
          value={value ?? ''}
          readOnly
          disabled
          className="md:max-w-[17rem]"
        />
      </CardContent>
    </Card>
  )
}

// The Ory password method, rendered as a dashboard card via the settings flow.
function PasswordCard() {
  const { flow } = useOryFlow()
  // `default` carries the CSRF hidden input the submission needs.
  const nodes = flow.ui.nodes.filter(
    (node) => node.group === 'password' || node.group === 'default'
  )
  const submitNodes = nodes.filter(isSubmitNode)
  const fieldNodes = nodes.filter((node) => !isSubmitNode(node))

  return (
    <Card className="overflow-hidden md:border">
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>Set a new password for your account.</CardDescription>
      </CardHeader>

      <OrySettingsFormSection nodes={nodes}>
        <CardContent className="flex max-w-90 flex-col gap-2">
          <OryCardValidationMessages />
          {fieldNodes.map((node, index) => (
            <Node key={index} node={node} />
          ))}
        </CardContent>
        <CardFooter className="bg-bg-1 justify-between gap-6">
          <p className="text-fg-tertiary">
            Your password must be at least 8 characters long.
          </p>
          {submitNodes.map((node, index) => (
            <Node key={index} node={node} />
          ))}
        </CardFooter>
      </OrySettingsFormSection>
    </Card>
  )
}

function PasswordChangedDialog({ open }: { open: boolean }) {
  return (
    // Controlled `open` with no onOpenChange + hideClose + blocked outside/esc:
    // the dialog can't be dismissed, so the only way forward is sign-in.
    <Dialog open={open}>
      <DialogContent
        hideClose
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Password updated</DialogTitle>
          <DialogDescription>
            Your password has been changed. Sign in with your new password to
            continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => {
              window.location.href = AUTH_URLS.RECOVERY_COMPLETE
            }}
          >
            Sign in with new password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SettingsCards({
  flow,
  config,
  name,
  email,
}: SettingsCardsProps) {
  const [passwordChanged, setPasswordChanged] = useState(false)

  // Password is the only submittable method here, so any success is the password
  // change. Take over from Ory: open our dialog and return a never-resolving
  // promise. Per OrySuccessHandler, that suspends Ory's default post-success
  // behavior — specifically the `continue_with` redirect (window.location.assign)
  // that otherwise reloads the page to settings_ui_url. No reload; the user
  // proceeds via the dialog.
  const handleSuccess = () => {
    setPasswordChanged(true)
    return new Promise<void>(() => {})
  }

  return (
    <div className="flex flex-col md:gap-6">
      <ReadOnlyField
        title="Name"
        description="Your account name."
        value={name}
      />
      <ReadOnlyField
        title="E-Mail"
        description="Your account e-mail."
        value={email}
      />
      <SessionProvider>
        <Settings
          flow={flow}
          config={config}
          components={settingsComponents}
          onSuccess={handleSuccess}
        >
          <PasswordCard />
        </Settings>
      </SessionProvider>

      {/* The recovery Kratos session is still live, so "sign in" routes through
          RECOVERY_COMPLETE, which revokes every session for the identity (this
          device plus any other live session) and clears cookies before
          /sign-in — forcing a real password entry. The dialog can't be
          dismissed: the only way forward is to sign in. */}
      <PasswordChangedDialog open={passwordChanged} />
    </div>
  )
}
