export type UserMessageConfig = {
  message: string
  timeoutMs?: number
}

export type UserMessageKey = keyof typeof USER_MESSAGES

export const USER_MESSAGES = {
  signUpVerification: {
    message: 'Check your email for a verification link.',
    timeoutMs: 30000,
  },
  passwordReset: {
    message: 'Check your email for a reset link.',
    timeoutMs: 30000,
  },
  emailUpdateVerification: {
    message: 'Check your email for a verification link.',
    timeoutMs: 30000,
  },
  nameUpdated: {
    message: 'Name updated.',
  },
  passwordUpdated: {
    message: 'Password updated.',
  },
  teamNameUpdated: {
    message: 'Team name updated.',
  },
  teamLogoUpdated: {
    message: 'Your team logo has been updated.',
  },
  failedUpdateName: {
    message: 'Failed to update name.',
  },
  failedUpdatePassword: {
    message: 'Failed to update password.',
  },
  failedUpdateTeamName: {
    message: 'Failed to update team name.',
  },
  failedUpdateLogo: {
    message: 'Failed to update logo.',
  },
  emailInUse: {
    message: 'Email already in use',
  },
  passwordWeak: {
    message: 'Password is too weak',
  },
  invalidCredentials: {
    message: 'Invalid credentials.',
  },
  unauthorized: {
    message: 'User is not authorized to perform this action',
  },
  checkCredentials: {
    message: 'Please check your credentials',
  },
} as const satisfies Record<string, UserMessageConfig>
