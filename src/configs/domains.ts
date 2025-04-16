import { BASE_URL } from './urls'

export const LANDING_PAGE_DOMAIN = 'www.e2b-landing-page.com'
export const LANDING_PAGE_FRAMER_DOMAIN = 'e2b-landing-page.framer.website'
export const BLOG_FRAMER_DOMAIN = 'e2b-blog.framer.website'
export const DOCS_NEXT_DOMAIN = 'e2b-docs.vercel.app'

export function replaceUrls(
  text: string,
  urlPathName: string,
  prefix: string = '',
  suffix: string = ''
): string {
  const pattern = suffix
    ? `(?<url>${prefix}https?://e2b-[^${suffix}]*)/${suffix}`
    : `(?<url>${prefix}https?://e2b-.*)/$`

  const baseUrl = BASE_URL.replace(/^https?:\/\//, '')

  return text
    .replaceAll(new RegExp(pattern, 'g'), (_, url) => url + suffix)
    .replaceAll(`${prefix}${LANDING_PAGE_DOMAIN}`, `${prefix}${baseUrl}`)
    .replaceAll(`${prefix}${LANDING_PAGE_FRAMER_DOMAIN}`, `${prefix}${baseUrl}`)
    .replaceAll(
      `${prefix}${BLOG_FRAMER_DOMAIN}`,
      // The default url on framer does not have /blog in the path but the custom domain does,
      // so we need to handle this explicitly.
      urlPathName === '/' ? `${prefix}${baseUrl}/blog` : `${prefix}${baseUrl}`
    )
}
