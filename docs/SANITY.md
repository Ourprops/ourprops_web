# Sanity CMS

> **Status:** Live for the marketing homepage and site-wide settings
>
> **Last updated:** 2026-10-09

## 1. Purpose and scope

Sanity holds the editable copy for the public marketing site: the homepage, the header and footer, page titles, and link previews. Editors change content in Sanity Studio, and the site updates without a deploy.

Sanity is **not** a source of truth for product data. Properties, documents, verification state, users, and the waitlist all live in Supabase (see [ARCHITECTURE.md](./ARCHITECTURE.md)). Never put personal or property data in Sanity; everything in the dataset is publicly readable.

What stays in code on purpose:

| Content | Why it is in code |
| --- | --- |
| Product mockups (hero card, product preview, sample property data) | Illustrations of the product UI, not editorial copy |
| Waitlist form fields and role options | Must match the database and `lib/validators/waitlist.ts` |
| Section anchor IDs (`#about`, `#waitlist`, …) | Navigation links depend on them |
| Layout, colours, and section order | Design decisions, not content |

## 2. Overview

```text
Sanity Studio (/studio)  ──publish──▶  Sanity Content Lake (dataset)
                                              │
                         sanityFetch (GROQ)   │   Live Content API events
                                              ▼
lib/content  ──merge with built-in copy──▶  Server components  ──▶  HTML
                                              ▲
                     <SanityLive /> refreshes cached pages on publish
```

- The Studio is embedded in the Next.js app at `/studio`.
- Pages fetch content on the server with `sanityFetch` from `next-sanity/live`.
- Every value is merged with built-in fallback copy, so a missing field, a missing document, or a Sanity outage never breaks the page.
- `<SanityLive />` listens for published changes and revalidates the cached page. No webhook or redeploy is needed.

## 3. Setup

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Yes | Sanity project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | Yes | Dataset name (`production`) |
| `NEXT_PUBLIC_SANITY_API_VERSION` | No | API version date; defaults to `2026-10-09` in `sanity/env.ts` |
| `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET` | For the hosted Studio | Same values as the `NEXT_PUBLIC_` pair. The Sanity CLI only inlines `SANITY_STUDIO_*` variables, so `sanity build`/`deploy` needs these |
| `SANITY_STUDIO_BASE_PATH` | No | Set to `/` by the `studio:build` and `studio:deploy` scripts. Leave unset everywhere else so the embedded Studio stays at `/studio` |
| `NEXT_PUBLIC_SITE_URL` | Yes in production | Absolute site URL used for canonical links and link-preview images. Falls back to Vercel's production URL, then `http://localhost:3000` |

No API token is used. The site only reads **published** content, which is public.

### Sanity project settings

At [sanity.io/manage](https://www.sanity.io/manage) → project → **API → CORS origins**, add every origin that loads the Studio, with **Allow credentials** on:

- `http://localhost:3000`
- the production domain
- any preview domains

Editors must be invited as project members (**Members** tab). Sanity login is separate from OurProps (Supabase) login.

### Running the Studio

Start the app (`npm run dev`) and open `http://localhost:3000/studio`. The route is `app/studio/[[...tool]]/page.tsx`, and it is excluded from the Supabase session proxy in `proxy.ts`.

### Hosted Studio (sanity.studio)

The same Studio can also be deployed to Sanity's hosting at `https://<hostname>.sanity.studio`, so editors don't need the Next.js app running:

```bash
npx sanity login        # once, if the CLI isn't logged in
npm run studio:deploy   # builds with base path "/" and uploads it
```

- The first deploy asks for a hostname (for example `ourprops` → `ourprops.sanity.studio`). It can't be changed later without deploying under a new name.
- The CLI then prints an `appId`. Add it to `sanity.cli.ts` as `deployment: {appId: '…'}` so later deploys don't prompt again.
- The `*.sanity.studio` origin is registered automatically; no CORS change is needed.
- Deploy again after every schema or Studio config change. The embedded `/studio` updates with the app; the hosted one does not.
- `npm run studio:build` builds the hosted version locally (to `dist/`) without uploading, which is useful for checking that it builds.

Both Studios edit the same dataset; use whichever is convenient.

## 4. File map

| Path | Role |
| --- | --- |
| `sanity.config.ts` | Studio config: schema, desk structure, Vision plugin, singleton rules |
| `sanity.cli.ts` | Config for the `sanity` CLI (project, dataset, hosted Studio `appId`) |
| `sanity/env.ts` | Reads and validates the Sanity environment variables |
| `sanity/structure.ts` | Studio sidebar: Homepage and Site settings first, then other types |
| `sanity/schemaTypes/` | Content model (see §5) |
| `sanity/lib/client.ts` | Sanity client (CDN enabled) |
| `sanity/lib/live.ts` | `sanityFetch` and `<SanityLive />` from `defineLive` |
| `sanity/lib/image.ts` | `urlFor()` image URL builder |
| `sanity/lib/queries.ts` | GROQ queries for the homepage and site settings |
| `lib/content/defaults.ts` | Built-in copy that mirrors the schema field for field |
| `lib/content/merge.ts` | `withFallback()`: merges CMS content over the defaults |
| `lib/content/index.ts` | `getHomeContent()` and `getSiteContent()`, the only entry points pages use |
| `app/(marketing)/layout.tsx` | Loads site settings for the header and footer; renders `<SanityLive />` |
| `app/(marketing)/page.tsx` | Loads homepage content and passes each section its slice |
| `app/(marketing)/_components/icons.ts` | Maps icon names stored in Sanity to lucide-react icons |
| `app/layout.tsx` | `generateMetadata()`: title, description, and link previews from site settings |
| `app/share-image.png/route.tsx` | Generated fallback share image, served at `/share-image.png` |
| `assets/ourprops-share-image.png` | Exported copy of the generated share image, for uploading to Sanity |

## 5. Content model

### Document types

| Type | Kind | Purpose |
| --- | --- | --- |
| `homePage` | Singleton (ID `homePage`) | All homepage copy, grouped by section |
| `siteSettings` | Singleton (ID `siteSettings`) | SEO, link previews, header, and footer |
| `legalPage` | Repeatable | Privacy, terms, and other long-form pages (title, slug, last updated, rich text). **Not rendered yet.** |

Singletons cannot be created, duplicated, or deleted in the Studio; only edited and published. This is enforced in `sanity.config.ts` (templates and document actions are filtered for `SINGLETON_TYPES`) and `sanity/structure.ts` (each opens its one document directly). The document ID equals the type name.

### Shared object types

| Type | Fields | Used by |
| --- | --- | --- |
| `sectionHeader` | `eyebrow`, `heading` (required), `description` | Every homepage section except the hero |
| `link` | `label`, `href` (must start with `#`, `/`, `http(s)://`, or `mailto:`) | Buttons and navigation |
| Icon field | String from `ICON_OPTIONS` in `sanity/schemaTypes/objects/icon.ts` | Cards, steps, trust points |

### `homePage` fields

Groups appear as tabs in the Studio, in page order.

| Section | Fields |
| --- | --- |
| Hero | `eyebrow`, `heading`, `subheading`, `primaryCta`, `secondaryCta`, `launchNote` (shown with the Ghana flag), `trustPoints[]` (`icon`, `text`; max 2) |
| Value proposition | `header`, `items[]` (`icon`, `title`, `description`, `highlight`) |
| How it works | `header`, `steps[]` (`icon`, `title`, `description`); numbered automatically |
| Product preview | `header`, `callouts[]` (`icon`, `title`, `description`) |
| Who it is for | `header`, `items[]` (`icon`, `title`, `description`, `cta`) |
| Values | `header`, `items[]` (`icon`, `title`, `description`), `disclaimer` |
| About | `header`, `mission`, `vision` |
| Waitlist | `header`, `submitLabel`, `privacyNote`, `successTitle`, `successMessage` |

Card arrays warn above three items because each section is a three-column grid.

### `siteSettings` fields

| Group | Fields |
| --- | --- |
| SEO | `title`, `description` (warns over 160 characters), `shareTitle`, `shareDescription`, `ogImage` (with `alt`) |
| Header | `navigation[]` (links), `headerCta` |
| Footer | `footerTagline`, `footerLinks[]`, `footerNote`, `companyName` (the year is added automatically) |

## 6. Fetching and fallbacks

Pages never call Sanity directly. They call the functions in `lib/content/index.ts`:

```ts
const content = await getHomeContent()   // HomeContent: every field guaranteed
const site = await getSiteContent()      // SiteContent + resolved shareImage
```

Both are wrapped in React `cache()`, so the layout, page, and `generateMetadata` share one request per render.

Each function runs its GROQ query with `stega: false` and passes the result through `withFallback(defaults, data)`:

- Missing, `null`, or empty-string values use the default.
- Objects merge key by key; only keys present in the defaults are kept, so unexpected fields are dropped.
- A non-empty array from Sanity replaces the default array. Each item is merged with the default item at the same position (or the first one), so items always have every key.
- If the fetch throws, the error is logged and the full defaults are returned.

The defaults in `lib/content/defaults.ts` are the source of the TypeScript types (`HomeContent`, `SiteContent`) that the components receive.

**Known limitation:** clearing a field in the Studio brings back the built-in copy; it does not hide the element. Making something hideable needs an explicit change (for example, an optional field the component checks).

## 7. Caching and live updates

The project does not enable Next.js Cache Components, so `defineLive` runs in its default mode:

- `sanityFetch` caches results with tags, and the homepage is served from cache.
- `<SanityLive />`, rendered once in `app/(marketing)/layout.tsx`, subscribes to the Live Content API and revalidates the affected tags when content is published.
- Published changes appear within a few seconds of publishing. Drafts are never shown on the public site.

`<SanityLive />` holds a streaming connection open, so tools that wait for "network idle" (for example, Playwright's `networkidle`) will time out on marketing pages. Wait for `load` instead.

Draft previews and click-to-edit (Presentation tool, `draftMode`, visual editing) are **not** set up.

## 8. SEO and link previews

`generateMetadata()` in `app/layout.tsx` builds site-wide metadata from `getSiteContent()`:

| Output | Source |
| --- | --- |
| `<title>` and `description` | `siteSettings.title`, `siteSettings.description` |
| Title template for other pages | `%s · OurProps` |
| `og:title`, `og:description`, `twitter:*` | `siteSettings.shareTitle`, `siteSettings.shareDescription` |
| `og:image`, `twitter:image` | `siteSettings.ogImage`, cropped to 1200 × 630, **only if its source is at least 600px wide**; otherwise `/share-image.png` |
| Canonical URL | Set per page (the homepage sets `/`) |

The 600px minimum keeps a logo or other small image from being stretched and cropped in previews.

### Share image

`app/share-image.png/route.tsx` renders the fallback image with `next/og` at build time, using the Inter TTF files in `assets/fonts/` (`next/og` cannot use the `next/font` copy). To refresh the exported file after design changes:

```bash
npm run dev
curl -o assets/ourprops-share-image.png http://localhost:3000/share-image.png
```

Then upload it in Studio → Site settings → SEO → Social share image.

Image requirements: 1200 × 630, PNG or JPG, **under 300 KB** (WhatsApp may skip larger images). Keep key text inside the central ~1000 × 500 area.

After deploying, check previews with LinkedIn's Post Inspector or by pasting a never-shared URL into WhatsApp; both cache previews.

## 9. Common tasks

### Edit content

1. Open `/studio`, choose **Homepage** or **Site settings**.
2. Edit the fields and click **Publish**. The live site updates within seconds.

### Add a field to an existing section

1. Add the field to the schema in `sanity/schemaTypes/singletons/homePage.ts` (or `siteSettings.ts`).
2. Add it to the projection in `sanity/lib/queries.ts`.
3. Add a default value in `lib/content/defaults.ts`. **Fields missing from the defaults are dropped by `withFallback`.**
4. Render it in the section component.
5. Run `npx sanity schema validate` and `npx tsc --noEmit`.

### Add a new homepage section

1. Add a group and an object field to `homePage.ts` (reuse `sectionHeader`, `iconField`, and `link`).
2. Add the projection to `HOME_PAGE_QUERY`.
3. Add the defaults to `HOME_DEFAULTS`.
4. Create the component in `app/(marketing)/_components/` taking `{ content: HomeContent["yourSection"] }`.
5. Render it in `app/(marketing)/page.tsx`.

### Add an icon option

1. Add `{title, value}` to `ICON_OPTIONS` in `sanity/schemaTypes/objects/icon.ts`. The value is the lucide-react component name.
2. Import it and add it to the map in `app/(marketing)/_components/icons.ts`. Unknown names render a plain circle.

### Query content from the terminal

```bash
set -a; source .env.local; set +a
npx sanity documents query '*[_id == "homePage"][0]' --api-version 2025-08-15
```

Or use the **Vision** tab in the Studio.

## 10. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Studio login loops back to the login screen | Browser blocks third-party cookies (Safari, Brave, incognito). Try Chrome, or set `auth: {loginMethod: 'token'}` in `sanity.config.ts` |
| "You don't have access to this project" | Signed in with a different provider or account than the project member. Invite that account under **Members** |
| CORS error loading the Studio | The origin (including port and host, e.g. `127.0.0.1` vs `localhost`) is missing from CORS origins |
| Published change does not appear | `<SanityLive />` missing from the layout, or the field is missing from the query or defaults (see §9) |
| Text shows the old built-in copy | The Sanity field is empty, or the document is unpublished (only drafts exist) |
| Link preview shows the generated image instead of the uploaded one | The uploaded image is narrower than 600px |
| Link preview has no image at all | `NEXT_PUBLIC_SITE_URL` is not set in production, so image URLs are not absolute |

## 11. Not yet implemented

- Rendering `legalPage` documents (Privacy and Terms pages) and linking them in the footer.
- Draft preview and visual editing in the Studio's Presentation tool.
- Generated TypeScript types for queries (`sanity schema extract` + `sanity typegen generate`).
- Optional / hideable fields (see the limitation in §6).
