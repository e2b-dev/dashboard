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
  LANDING_PAGE_FRAMER_DOMAIN,
} from '@/configs/domains'
import { BLOG_FRAMER_DOMAIN } from '@/configs/domains'

// Cache the sitemap for 24 hours (in seconds)
const SITEMAP_CACHE_TIME = 24 * 60 * 60

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
    sitemapUrl: `https://${BLOG_FRAMER_DOMAIN}/sitemap.xml`,
    priority: 0.9,
    changeFrequency: 'weekly',
    baseUrl: 'https://e2b.dev',
  },
  {
    sitemapUrl: `https://${DOCS_NEXT_DOMAIN}/sitemap.xml`,
    priority: 0.9,
    changeFrequency: 'weekly',
    baseUrl: 'https://e2b.dev',
  },
  {
    sitemapUrl: `https://${LANDING_PAGE_FRAMER_DOMAIN}/sitemap.xml`,
    priority: 0.7,
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
 * Processes a site's sitemap and converts it to Next.js sitemap format
 *
 * @param site The site configuration to process
 * @returns Array of sitemap entries in Next.js format
 */
async function getSitemap(site: Site): Promise<MetadataRoute.Sitemap> {
  const data = await getXmlData(site.sitemapUrl)

  if (!data) {
    return []
  }

  /**
   * Processes a single URL entry from the sitemap
   */
  const processUrl = (line: SitemapData) => {
    const url = new URL(line.loc)
    const properUrl = `${site.baseUrl}${url.pathname}`

    return {
      url: properUrl,
      priority: line?.priority || site.priority,
      changeFrequency: line?.changefreq || site.changeFrequency,
      lastModified: line?.lastmod || site.lastModified,
    }
  }

  // Handle both array and single-item sitemaps
  if (Array.isArray(data.urlset.url)) {
    return data.urlset.url.map(processUrl)
  } else {
    return [processUrl(data.urlset.url)]
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
