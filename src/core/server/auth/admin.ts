import type { AuthUser } from './types'

export interface AuthAdmin {
  getUserByAccessToken(accessToken: string): Promise<AuthUser | null>
  getUserById(userId: string): Promise<AuthUser | null>
  getEmailsByIds(userIds: string[]): Promise<Map<string, string | null>>
}
