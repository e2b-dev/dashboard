import 'server-only'

export type { AuthUser } from '@/core/modules/auth/models'
export {
  getAuthContext,
  getSettingsProfile,
  getUserProfile,
  handleCredentialChangeSuccess,
  revokeCurrentSession,
  signOut,
  startReauthForAccountSettings,
  updateUser,
} from './ory/session'
