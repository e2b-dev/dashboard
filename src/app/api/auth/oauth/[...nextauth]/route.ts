import { handlers } from '@/auth'
import { withSanitizedOryAuthJsHandler } from '@/core/server/auth/ory/authjs-session-boundary'

export const GET = withSanitizedOryAuthJsHandler(handlers.GET)
export const POST = withSanitizedOryAuthJsHandler(handlers.POST)
