/**
 * Sitemap Generator for E2B Website
 *
 * This module generates a unified sitemap for the E2B website by aggregating sitemaps
 * from multiple sources including the main landing page, blog, documentation, and Framer sites.
 * It handles fetching, parsing, deduplication, and proper URL formatting to ensure all content
 * is discoverable by search engines.
 */

import { MetadataRoute } from 'next'
import { XMLParser } from 'fast-xml-parser'
import {
  DOCS_NEXT_DOMAIN,
  LANDING_PAGE_DOMAIN,
  ROUTE_REWRITE_CONFIG,
} from '@/configs/rewrites'
import { DomainConfig } from '@/types/rewrites.types'
import { NO_INDEX } from '@/lib/utils/flags'

// Cache the sitemap for 15 minutes (in seconds)
const SITEMAP_CACHE_TIME = 15 * 60

/**
 * Valid change frequency values for sitemap entries
 * @see https://www.sitemaps.org/protocol.html
 */
type ChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never'

/**
 * Configuration for a site whose sitemap should be included
 */
type Site = {
  sitemapUrl: string // URL to the site's sitemap.xml
  lastModified?: string | Date // Default last modified date for entries
  changeFrequency?: ChangeFrequency // Default change frequency for entries
  priority?: number // Default priority for entries (0.0 to 1.0)
  baseUrl?: string // Base URL to use for final sitemap entries
}

/**
 * List of sites to include in the unified sitemap
 * Each site has its own sitemap.xml that will be fetched and processed
 */
const sites: Site[] = [
  {
    sitemapUrl: `https://${LANDING_PAGE_DOMAIN}/sitemap.xml`,
    priority: 1.0,
    changeFrequency: 'weekly',
    baseUrl: 'https://e2b.dev',
  },
  {
    sitemapUrl: `https://${DOCS_NEXT_DOMAIN}/sitemap.xml`,
    priority: 0.9,
    changeFrequency: 'weekly',
    baseUrl: 'https://e2b.dev',
  },
]

/**
 * Structure of a single URL entry in a sitemap
 */
type SitemapData = {
  loc: string // URL location
  lastmod?: string | Date // Last modified date
  changefreq?: ChangeFrequency // Change frequency
  priority?: number // Priority (0.0 to 1.0)
}

/**
 * Structure of a sitemap XML document
 */
type Sitemap = {
  urlset: {
    url: SitemapData | SitemapData[] // Single URL or array of URLs
  }
}

/**
 * Fetches and parses a sitemap XML file from a given URL
 *
 * @param url The URL of the sitemap.xml file to fetch
 * @returns Parsed sitemap data or empty sitemap on error
 */
async function getXmlData(url: string): Promise<Sitemap> {
  const parser = new XMLParser()

  try {
    const response = await fetch(url, {
      next: { revalidate: SITEMAP_CACHE_TIME },
      headers: {
        Accept: 'application/xml',
      },
    })

    if (!response.ok) {
      console.warn(`Failed to fetch sitemap from ${url}:`, response.statusText)
      return { urlset: { url: [] } }
    }

    const text = await response.text()
    return parser.parse(text) as Sitemap
  } catch (error) {
    console.error(`Error fetching sitemap from ${url}:`, error)
    return { urlset: { url: [] } }
  }
}

/**
 * Finds the corresponding rewrite configuration for a given site based on its sitemap URL domain.
 *
 * @param site The site configuration.
 * @returns The matching DomainConfig or undefined if not found.
 */
function findRewriteConfig(site: Site): DomainConfig | undefined {
  try {
    const siteDomain = new URL(site.sitemapUrl).hostname
    return ROUTE_REWRITE_CONFIG.find((config) => config.domain === siteDomain)
  } catch (error) {
    console.error(
      `Error parsing sitemapUrl ${site.sitemapUrl} to find rewrite config:`,
      error
    )
    return undefined
  }
}

/**
 * Processes a site's sitemap and converts it to Next.js sitemap format
 * Applies path preprocessing based on ROUTE_REWRITE_CONFIG.
 *
 * @param site The site configuration to process
 * @returns Array of sitemap entries in Next.js format
 */
async function getSitemap(site: Site): Promise<MetadataRoute.Sitemap> {
  const data = await getXmlData(site.sitemapUrl)
  const rewriteConfig = findRewriteConfig(site) // Find the rewrite config for this site

  if (!data || !site.baseUrl) {
    // Ensure baseUrl is defined, as it's crucial for constructing final URLs
    if (!site.baseUrl) {
      console.warn(
        `Site ${site.sitemapUrl} is missing baseUrl, skipping sitemap generation for this site.`
      )
    }
    return []
  }

  /**
   * Processes a single URL entry from the sitemap
   */
  const processUrl = (
    line: SitemapData
  ): MetadataRoute.Sitemap[number] | null => {
    try {
      const originalUrl = new URL(line.loc)
      const rewrittenPathname = originalUrl.pathname
      let finalPathname = rewrittenPathname // Default to the path from the sitemap

      // Find the corresponding original path if a preprocessor was involved
      if (rewriteConfig) {
        for (const rule of rewriteConfig.rules) {
          // Use sitemapMatchPath if available for matching
          if (rule.sitemapMatchPath) {
            if (rewrittenPathname.startsWith(rule.sitemapMatchPath)) {
              // Reconstruct the original path using the explicit match
              const suffix = rewrittenPathname.substring(
                rule.sitemapMatchPath.length
              )
              finalPathname = rule.path + suffix // Use the rule's original path + suffix
              break // Found the matching rule
            }
          }
        }
      }

      // Construct the final URL using the site's base URL and the determined pathname
      const finalUrl = new URL(finalPathname, site.baseUrl).toString()

      return {
        url: finalUrl,
        priority: line?.priority ?? site.priority, // Use nullish coalescing for defaults
        changeFrequency: line?.changefreq ?? site.changeFrequency, // Use nullish coalescing
        lastModified: line?.lastmod ?? site.lastModified, // Use nullish coalescing
      }
    } catch (error) {
      console.error(`Error processing sitemap URL ${line.loc}:`, error)
      return null // Return null if URL processing fails
    }
  }

  // Handle both array and single-item sitemaps
  if (!data.urlset?.url) {
    console.warn(
      `Sitemap from ${site.sitemapUrl} has no urlset or url property.`
    )
    return []
  }

  if (Array.isArray(data.urlset.url)) {
    // Filter out any potential null results from processUrl if errors occurred
    return data.urlset.url
      .map(processUrl)
      .filter((entry) => entry !== null) as MetadataRoute.Sitemap
  } else if (typeof data.urlset.url === 'object' && data.urlset.url !== null) {
    const entry = processUrl(data.urlset.url)
    return entry ? [entry] : [] // Return array with the entry or empty array if null
  } else {
    console.warn(
      `Sitemap from ${site.sitemapUrl} has unexpected urlset.url structure:`,
      data.urlset.url
    )
    return []
  }
}

/**
 * Main sitemap generation function that Next.js calls
 *
 * Fetches and merges sitemaps from all configured sites,
 * deduplicates entries, and returns a sorted list of URLs
 *
 * @returns Complete sitemap for the E2B website
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Return empty sitemap if NO_INDEX is set
  if (NO_INDEX) {
    return []
  }

  let mergedSitemap: MetadataRoute.Sitemap = []

  // Fetch sitemaps from all configured sites (Webflow & Framer sites + docs)
  for (const site of sites) {
    const urls = await getSitemap(site)
    mergedSitemap = mergedSitemap.concat(urls)
  }

  // Deduplicate URLs, keeping the one with the highest priority
  const urlMap = new Map<string, MetadataRoute.Sitemap[number]>()
  mergedSitemap.forEach((entry) => {
    const existingEntry = urlMap.get(entry.url)
    // Keep the entry with the highest priority (lower number means higher priority in sitemaps typically, but the code uses higher number = higher priority)
    // Ensure priority is treated as a number, defaulting to 0 if undefined
    const currentPriority = entry.priority ?? 0
    const existingPriority = existingEntry?.priority ?? 0

    if (!existingEntry || currentPriority > existingPriority) {
      urlMap.set(entry.url, entry)
    }
  })

  // Convert the map values back to an array
  const uniqueSitemap = Array.from(urlMap.values())

  // Sort all unique URLs alphabetically
  return uniqueSitemap.sort((a, b) => a.url.localeCompare(b.url))
}
