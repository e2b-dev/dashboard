export function extractClientIp(headers: {
  get(name: string): string | null
}): string {
  const xForwardedFor = headers.get('x-forwarded-for')
  const cfConnectingIp = headers.get('cf-connecting-ip')
  const xRealIp = headers.get('x-real-ip')

  // parse x-forwarded-for: "client, proxy1, proxy2" -> extract client ip
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map((ip) => ip.trim())
    if (ips[0]) {
      return ips[0]
    }
  }

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  if (xRealIp) {
    return xRealIp
  }

  // fallback for development
  return 'development-no-ip'
}

export function isDevelopmentIp(ip: string): boolean {
  return ip === 'development-no-ip'
}