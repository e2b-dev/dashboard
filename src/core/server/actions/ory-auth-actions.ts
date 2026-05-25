'use server'

import { signIn } from '@/auth'

// thin wrapper around Auth.js's signIn() that exists so client components
// can submit a form to it. signIn() throws a redirect; never returns normally.
export async function signInWithOryAction(formData: FormData) {
  const returnTo = formData.get('returnTo')
  const redirectTo =
    typeof returnTo === 'string' && returnTo.length > 0
      ? returnTo
      : '/dashboard'
  await signIn('ory', { redirectTo })
}
