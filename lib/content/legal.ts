import { cache } from "react"
import type { PortableTextBlock } from "next-sanity"

import { sanityFetch } from "@/sanity/lib/live"
import { LEGAL_PAGE_QUERY } from "@/sanity/lib/queries"

export type LegalPageId = "privacyPolicy" | "termsAndConditions"

export type LegalContent = { title: string | null; lastUpdated: string | null; body: PortableTextBlock[] }

/**
 * A legal page from Sanity, or null when it isn't published yet, has no body, or Sanity can't be reached: the page
 * then shows its placeholder rather than failing.
 */
export const getLegalPage = cache(async (id: LegalPageId): Promise<LegalContent | null> => {
  try {
    const { data } = await sanityFetch({ query: LEGAL_PAGE_QUERY, params: { id }, stega: false })
    return toLegalContent(data)
  } catch (error) {
    console.error("Failed to load a legal page from Sanity", error)
    return null
  }
})

export function toLegalContent(data: unknown): LegalContent | null {
  if (!data || typeof data !== "object") return null
  const { title, lastUpdated, body } = data as { title?: unknown; lastUpdated?: unknown; body?: unknown }
  if (!Array.isArray(body) || body.length === 0) return null
  return {
    title: typeof title === "string" && title.trim() ? title : null,
    lastUpdated: typeof lastUpdated === "string" ? lastUpdated : null,
    body: body as PortableTextBlock[],
  }
}
