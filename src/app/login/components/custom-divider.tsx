'use client'

import TextSeparator from '@/ui/text-separator'

// Card.Divider — replaces Ory's bare <hr> between the SSO buttons and the
// email/password group with the dashboard's labelled separator. TextSeparator
// already owns its vertical margin (my-6), so no extra spacing wrapper here.
export function OryDivider() {
  return <TextSeparator text="or" />
}
