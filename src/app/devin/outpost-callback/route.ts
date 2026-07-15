import type { NextRequest } from 'next/server'
import { GET as callback } from '@/app/callback/route'

export const maxDuration = 300

export function GET(request: NextRequest) {
  return callback(request)
}
