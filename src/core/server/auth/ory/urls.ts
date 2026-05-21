import 'server-only'

function getOrySdkUrl() {
  const sdkUrl = process.env.ORY_SDK_URL ?? process.env.NEXT_PUBLIC_ORY_SDK_URL

  if (!sdkUrl) {
    throw new Error('ORY_SDK_URL is not configured')
  }

  return sdkUrl.replace(/\/$/, '')
}

function appendReturnTo(url: string, returnTo?: string) {
  if (!returnTo) {
    return url
  }

  const nextUrl = new URL(url)
  nextUrl.searchParams.set('return_to', returnTo)

  return nextUrl.toString()
}

export function getOryLoginUrl(returnTo?: string) {
  return appendReturnTo(
    `${getOrySdkUrl()}/self-service/login/browser`,
    returnTo
  )
}

export function getOryRegistrationUrl(returnTo?: string) {
  return appendReturnTo(
    `${getOrySdkUrl()}/self-service/registration/browser`,
    returnTo
  )
}

export function getOryRecoveryUrl(returnTo?: string) {
  return appendReturnTo(
    `${getOrySdkUrl()}/self-service/recovery/browser`,
    returnTo
  )
}

export function getOryLogoutUrl(returnTo?: string) {
  return appendReturnTo(
    `${getOrySdkUrl()}/self-service/logout/browser`,
    returnTo
  )
}
