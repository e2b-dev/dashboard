import type { OryFlowComponentOverrides } from '@ory/elements-react'
import { OryButton } from './custom-button'
import { OryCard, OryCardFooter } from './custom-card'
import { OryCardHeader } from './custom-card-header'
import { OryDivider } from './custom-divider'
import { OryFormGroup } from './custom-form-group'
import { OryInput } from './custom-input'
import { OryLabel } from './custom-label'
import { OryMessageContent, OryMessageRoot } from './custom-message'
import { OrySsoButton } from './custom-sso-button'

// Full set of dashboard-styled components for the Ory login flow. We render
// every visible slot ourselves and do NOT import Ory's theme stylesheet, so the
// card is styled purely with the dashboard's design system.
export const oryComponents: OryFlowComponentOverrides = {
  Node: {
    Button: OryButton,
    SsoButton: OrySsoButton,
    Input: OryInput,
    Label: OryLabel,
  },
  Card: {
    Root: OryCard,
    Header: OryCardHeader,
    Footer: OryCardFooter,
    Divider: OryDivider,
  },
  Form: {
    Group: OryFormGroup,
  },
  Message: {
    Root: OryMessageRoot,
    Content: OryMessageContent,
  },
}
