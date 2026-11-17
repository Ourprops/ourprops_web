import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Stand-ins for Sanity: the image builder records what it was asked for, so the tests can check cropping
vi.mock("@/sanity/lib/live", () => ({ sanityFetch: vi.fn() }))
vi.mock("@/sanity/lib/image", () => {
  const builder = (steps: string[]): Record<string, unknown> => ({
    width: (value: number) => builder([...steps, `w=${value}`]),
    height: (value: number) => builder([...steps, `h=${value}`]),
    fit: (value: string) => builder([...steps, `fit=${value}`]),
    auto: (value: string) => builder([...steps, `auto=${value}`]),
    url: () => `https://cdn.sanity.io/x?${steps.join("&")}`,
  })
  return { urlFor: () => builder([]) }
})

import BlogSection from "@/app/(public)/_components/blog-section"
import PostCard from "@/app/(public)/_components/post-card"
import { coverImage, formatPostDate, toPostCard, type PostCard as Post } from "@/lib/content/blog"

afterEach(cleanup)

const raw = {
  _id: "post-1",
  title: "How to read a site plan",
  slug: "how-to-read-a-site-plan",
  excerpt: "What the numbers on a surveyor's plan mean.",
  publishedAt: "2026-11-01T09:00:00Z",
  authorName: "Ama Mensah",
  coverImage: { asset: { _ref: "image-abc" }, alt: "A site plan on a desk" },
}

describe("toPostCard", () => {
  it("keeps a complete post, with its cover cropped to 16:9", () => {
    const post = toPostCard(raw)
    expect(post).toMatchObject({ id: "post-1", slug: "how-to-read-a-site-plan", authorName: "Ama Mensah" })
    expect(post?.cover).toEqual({
      url: "https://cdn.sanity.io/x?w=1600&h=900&fit=crop&auto=format",
      alt: "A site plan on a desk",
      width: 1600,
      height: 900,
    })
  })

  it("drops a post missing its title, address or a real date, so a half-filled post never breaks a page", () => {
    expect(toPostCard({ ...raw, title: " " })).toBeNull()
    expect(toPostCard({ ...raw, slug: null })).toBeNull()
    expect(toPostCard({ ...raw, publishedAt: "not a date" })).toBeNull()
    expect(toPostCard(null)).toBeNull()
  })

  it("is fine without a cover, summary or author", () => {
    expect(toPostCard({ ...raw, coverImage: null, excerpt: undefined, authorName: "" })).toMatchObject({
      cover: null,
      excerpt: "",
      authorName: null,
    })
  })
})

describe("coverImage", () => {
  it("keeps a picture inside a post at its own shape: no crop", () => {
    expect(coverImage(raw.coverImage, { width: 1400, height: 0 })?.url).toBe("https://cdn.sanity.io/x?w=1400&fit=max&auto=format")
  })
})

describe("dates", () => {
  it("are shown in Ghana's time, in words", () => {
    expect(formatPostDate("2026-11-01T09:00:00Z")).toBe("1 November 2026")
  })
})

describe("blog on the homepage", () => {
  const posts = [toPostCard(raw), toPostCard({ ...raw, _id: "post-2", slug: "second", title: "Second post" })] as Post[]

  it("shows nothing until the first post is published", () => {
    const { container } = render(<BlogSection posts={[]} />)
    expect(container.innerHTML).toBe("")
  })

  it("shows each post as a card whose link is its title, and a link to every post", () => {
    render(<BlogSection posts={posts} />)
    expect(screen.getByRole("link", { name: "How to read a site plan" }).getAttribute("href")).toBe("/blog/how-to-read-a-site-plan")
    expect(screen.getByRole("link", { name: "Second post" }).getAttribute("href")).toBe("/blog/second")
    expect(screen.getByRole("link", { name: /All posts/ }).getAttribute("href")).toBe("/blog")
    expect(screen.getByRole("heading", { level: 2, name: /Guides and news/ })).toBeTruthy()
  })

  it("describes the cover for people who can't see it, and gives the date as a machine-readable time", () => {
    render(<PostCard post={posts[0]} />)
    expect(screen.getByAltText("A site plan on a desk")).toBeTruthy()
    expect(screen.getByText("1 November 2026").getAttribute("dateTime")).toBe("2026-11-01T09:00:00Z")
  })
})
