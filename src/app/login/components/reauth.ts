import {
  AuthenticatorAssuranceLevel,
  FlowType,
  UiNodeGroupEnum,
} from '@ory/client-fetch'
import type { FlowContextValue } from '@ory/elements-react'

export type ReauthCredential = 'social' | 'password'

// A refresh flow (or an AAL2 step-up) is the reauth screen: Kratos pins it to
// the current identity and renders only the credentials that identity owns. We
// read the credential off the flow's node groups so the header can tell the
// user how to confirm — password takes precedence when both are present.
export function getReauthInfo(oryFlow: FlowContextValue): {
  isReauthLogin: boolean
  credential: ReauthCredential | null
} {
  if (oryFlow.flowType !== FlowType.Login) {
    return { isReauthLogin: false, credential: null }
  }

  const { flow } = oryFlow
  const isReauthLogin =
    flow.refresh === true ||
    flow.requested_aal === AuthenticatorAssuranceLevel.Aal2

  if (!isReauthLogin) {
    return { isReauthLogin: false, credential: null }
  }

  const groups = new Set(flow.ui.nodes.map((node) => node.group))
  const credential: ReauthCredential | null = groups.has(
    UiNodeGroupEnum.Password
  )
    ? 'password'
    : groups.has(UiNodeGroupEnum.Oidc)
      ? 'social'
      : null

  return { isReauthLogin, credential }
}
