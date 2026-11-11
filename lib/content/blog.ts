import { cache } from "react"
import type { SanityImageSource } from "@sanity/image-url"
import type { PortableTextBlock } from "next-sanity"

import { urlFor } from "@/sanity/lib/image"
import { sanityFetch } from "@/sanity/lib/live"
import { POST_QUERY, POST_SLUGS_QUERY, POSTS_QUERY } from "@/sanity/lib/queries"

export type PostImage = { url: string; alt: string; width: number; height: number }

export type PostCard = {
  id: string
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  authorName: string | null
  cover: PostImage | null
}

export type Post = PostCard & { body: PortableTextBlock[] }

/** How many posts the homepage shows */
export const HOME_POST_COUNT = 3

// Covers are cropped to 16:9 around the editor's hotspot, so every card lines up
export const COVER_SIZE = { width: 1600, height: 900 }

type ImageField = SanityImageSource & { asset?: unknown; alt?: unknown }

/** A Sanity image as a sized URL; null when no picture was uploaded */
export function coverImage(image: unknown, size: { width: number; height: number } = COVER_SIZE): PostImage | null {
  const source = image as ImageField | null | undefined
  if (!source?.asset) return null
  return {
    // height 0: keep the picture's own shape (pictures inside a post); otherwise crop around the hotspot (covers)
    url: (size.height > 0
      ? urlFor(source).width(size.width).height(size.height).fit("crop")
      : urlFor(source).width(size.width).fit("max")
    ).auto("format").url(),
    alt: typeof source.alt === "string" ? source.alt : "",
    ...size,
  }
}

/** A post card from Sanity, or null when a required field is missing (a half-filled post never breaks a page) */
export function toPostCard(data: unknown): PostCard | null {
  if (!data || typeof data !== "object") return null
  const value = data as Record<string, unknown>
  const text = (key: string) => (typeof value[key] === "string" && (value[key] as string).trim() ? (value[key] as string) : null)
  const [id, title, slug, publishedAt] = [text("_id"), text("title"), text("slug"), text("publishedAt")]
  if (!id || !title || !slug || !publishedAt || Number.isNaN(Date.parse(publishedAt))) return null
  return { id, title, slug, publishedAt, excerpt: text("excerpt") ?? "", authorName: text("authorName"), cover: coverImage(value.coverImage) }
}

export const getPosts = cache(async (limit = 100): Promise<PostCard[]> => {
  try {
    const { data } = await sanityFetch({ query: POSTS_QUERY, params: { limit }, stega: false })
    return (Array.isArray(data) ? data : []).map(toPostCard).filter((post): post is PostCard => post !== null)
  } catch (error) {
    console.error("Failed to load blog posts from Sanity", error)
    return []
  }
})

export const getPost = cache(async (slug: string): Promise<Post | null> => {
  try {
    const { data } = await sanityFetch({ query: POST_QUERY, params: { slug }, stega: false })
    const card = toPostCard(data)
    const body = (data as { body?: unknown } | null)?.body
    return card ? { ...card, body: Array.isArray(body) ? (body as PortableTextBlock[]) : [] } : null
  } catch (error) {
    console.error("Failed to load a blog post from Sanity", error)
    return null
  }
})

/** For the sitemap: every live post's address and date */
export async function getPostSlugs(): Promise<{ slug: string; publishedAt: string }[]> {
  try {
    const { data } = await sanityFetch({ query: POST_SLUGS_QUERY, stega: false })
    return (Array.isArray(data) ? data : []).filter(
      (post): post is { slug: string; publishedAt: string } => typeof post?.slug === "string" && typeof post?.publishedAt === "string"
    )
  } catch (error) {
    console.error("Failed to load blog post addresses from Sanity", error)
    return []
  }
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Accra" })

export function formatPostDate(iso: string) {
  return dateFormat.format(new Date(iso))
}
