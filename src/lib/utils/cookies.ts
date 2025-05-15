import 'server-cli-only'

import * as jose from 'jose'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Cache parsed key
let encryptionKey: Buffer | null = null

/**
 * Get encryption key from environment and convert to Uint8Array for jose
 * @throws {Error} If encryption key is not set
 */
function getKey(): Uint8Array {
  if (!encryptionKey) {
    const key = process.env.COOKIE_ENCRYPTION_KEY
    if (!key) throw new Error('COOKIE_ENCRYPTION_KEY must be set')
    encryptionKey = Buffer.from(key, 'base64')
  }
  return new Uint8Array(encryptionKey)
}

/**
 * Encrypt a string using jose's encryption
 */
async function encrypt(value: string, secretKey: Uint8Array): Promise<string> {
  const encoder = new TextEncoder()
  const jwe = await new jose.CompactEncrypt(encoder.encode(value))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(secretKey)

  return jwe
}

/**
 * Decrypt a previously encrypted string
 */
async function decrypt(
  encrypted: string,
  secretKey: Uint8Array
): Promise<string> {
  const { plaintext } = await jose.compactDecrypt(encrypted, secretKey)
  const decoder = new TextDecoder()
  return decoder.decode(plaintext)
}

/**
 * Set an encrypted cookie.
 *
 * Usage:
 * ```ts
 * // Set environment variable:
 * // COOKIE_ENCRYPTION_KEY=<base64-encoded-32-byte-key>
 *
 * await setEncryptedCookie('user-session', JSON.stringify({ userId: 123 }))
 * ```
 *
 * Note: If the encryption key is rotated, existing cookies will return null when
 * decrypted. Your application should handle this by reissuing cookies as needed.
 *
 * Example handling:
 * ```ts
 * async function getUserSession() {
 *   const session = await getEncryptedCookie('user-session')
 *   if (!session) {
 *     // Cookie missing or key was rotated, reissue session
 *     const newSession = await generateNewSession()
 *     await setEncryptedCookie('user-session', JSON.stringify(newSession))
 *     return newSession
 *   }
 *   return JSON.parse(session)
 * }
 * ```
 */
export async function setEncryptedCookie(
  cookieName: string,
  value: string,
  options?: Partial<unknown>
): Promise<[string, string, Partial<unknown>]> {
  const encryptedValue = await encrypt(value, getKey())

  return [
    cookieName,
    encryptedValue,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      ...options,
    },
  ]
}

// TODO: use signing instead of encryption

/**
 * Retrieve and decrypt a cookie.
 *
 * @returns Decrypted cookie value or null if cookie is missing, invalid,
 * or was encrypted with a different key
 */
export async function getEncryptedCookie(
  cookieName: string
): Promise<string | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(cookieName)?.value
  if (!raw) return null

  try {
    const decrypted = await decrypt(raw, getKey())
    return decrypted.length > 0 ? decrypted : null
  } catch (error) {
    // If decryption fails (invalid or key changed), treat as invalid
    return null
  }
}
