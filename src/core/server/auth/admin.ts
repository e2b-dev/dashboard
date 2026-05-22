import type { AuthUser } from './types'

export interface AuthAdmin {
  getUserById(userId: string): Promise<AuthUser | null>
  getEmailsByIds(userIds: string[]): Promise<Map<string, string | null>>
}
