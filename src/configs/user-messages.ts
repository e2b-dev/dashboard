export type UserMessageConfig = {
  message: string
  timeoutMs?: number
}

export type UserMessageKey = keyof typeof USER_MESSAGES

export const USER_MESSAGES = {
  signUpVerification: {
    message: 'Check your e-mail for a verification link.',
    timeoutMs: 30000,
  },
  passwordReset: {
    message: 'Check your e-mail for a reset link.',
    timeoutMs: 30000,
  },
  emailUpdateVerification: {
    message: 'Check your e-mail for a verification link.',
    timeoutMs: 30000,
  },
  signInEmailNotConfirmed: {
    message:
      'You need to confirm your e-mail before signing in. Please check your e-mail for a verification link.',
    timeoutMs: 30000,
  },
  signUpEmailValidationInvalid: {
    message:
      'Please use a valid email address - your company email works best.',
    timeoutMs: 30000,
  },
  signUpEmailAlternate: {
    message:
      'Is this a secondary email? Use your primary email for fast access.',
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
    message: 'E-mail already in use.',
  },
  passwordWeak: {
    message: 'Password is too weak',
  },
  invalidCredentials: {
    message: 'Invalid credentials.',
  },
  unauthorized: {
    message: 'User is not authorized to perform this action.',
  },
  checkCredentials: {
    message: 'Please check your credentials.',
  },
  googleEmailNotVerified: {
    message:
      'Your Google account email is not verified. Please verify your email with Google and try again.',
    timeoutMs: 30000,
  },
  githubEmailNotVerified: {
    message:
      'Your GitHub email is not verified. Please verify your email with GitHub and try again.',
    timeoutMs: 30000,
  },
  oauthEmailNotVerified: {
    message:
      'Your email is not verified. Please verify your email and try again.',
    timeoutMs: 30000,
  },
  genericEmailNotVerified: {
    message:
      'Your email is not verified. Please verify your email and try again.',
    timeoutMs: 30000,
  },
}

export const getTimeoutMsFromUserMessage = (
  message: string
): number | undefined => {
  const messageConfig: UserMessageConfig | undefined = Object.values(
    USER_MESSAGES
  ).find((m) => m.message === message)

  return messageConfig?.timeoutMs
}
