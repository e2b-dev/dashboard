export type UserMessageKey = keyof typeof USER_MESSAGES

export const USER_MESSAGES = {
  emailUpdateVerification: {
    message: 'Check your e-mail for a verification link.',
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
  failedUpdateName: {
    message: 'Failed to update name.',
  },
  failedUpdatePassword: {
    message: 'Failed to update password.',
  },
  failedUpdateTeamName: {
    message: 'Failed to update team name.',
  },
}
