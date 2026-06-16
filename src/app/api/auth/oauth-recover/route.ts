import { NextResponse } from 'next/server'

export function GET(request: Request) {
  const url = new URL(request.url)
  url.pathname = '/api/auth/oauth/recover'
  return NextResponse.redirect(url)
}
