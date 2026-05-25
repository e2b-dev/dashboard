const GOOGLE_EMAIL_DOMAINS = ['gmail.com', 'googlemail.com']

export function isGoogleEmail(email: string): boolean {
  const domain = email.split('@').pop()?.toLowerCase()
  return domain !== undefined && GOOGLE_EMAIL_DOMAINS.includes(domain)
}
