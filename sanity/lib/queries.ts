import { defineQuery } from 'next-sanity'

const SECTION_HEADER = `header{eyebrow, heading, description}`
const LINK = `{label, href}`
const CARD = `{title, description}`

export const HOME_PAGE_QUERY = defineQuery(`*[_id == "homePage"][0]{
  hero{
    eyebrow,
    heading,
    subheading,
    primaryCta${LINK},
    secondaryCta${LINK},
    launchNote,
    trustPoints[]{icon, text}
  },
  valueProposition{${SECTION_HEADER}, items[]{title, description, highlight}},
  howItWorks{${SECTION_HEADER}, steps[]${CARD}},
  productPreview{${SECTION_HEADER}, callouts[]${CARD}},
  audience{${SECTION_HEADER}, items[]{title, description, accessLevel, cta${LINK}}},
  values{${SECTION_HEADER}, items[]${CARD}, disclaimer},
  about{${SECTION_HEADER}, mission, vision},
  waitlist{${SECTION_HEADER}, submitLabel, privacyNote, successTitle, successMessage},
  getStarted{${SECTION_HEADER}, button${LINK}}
}`)

export const FAQ_PAGE_QUERY = defineQuery(`*[_id == "faqPage"][0]{
  ${SECTION_HEADER},
  items[]{question, answer}
}`)

export const SITE_SETTINGS_QUERY = defineQuery(`*[_id == "siteSettings"][0]{
  title,
  description,
  shareTitle,
  shareDescription,
  ogImage{asset, crop, hotspot, alt, "width": asset->metadata.dimensions.width},
  navigation[]${LINK},
  headerCta${LINK},
  footerTagline,
  footerLinks[]${LINK},
  footerNote,
  companyName
}`)

// A legal page by its fixed document ID (privacyPolicy, termsAndConditions), as the Studio structure creates them
export const LEGAL_PAGE_QUERY = defineQuery(`*[_id == $id][0]{title, lastUpdated, body}`)

// Blog. Only published posts with a date that has come (a post can be scheduled by giving it a future date).
const POST_CARD = `_id, title, "slug": slug.current, excerpt, publishedAt, authorName, coverImage{asset, crop, hotspot, alt}`

export const POSTS_QUERY = defineQuery(`*[_type == "post" && defined(slug.current) && publishedAt <= now()]
  | order(publishedAt desc)[0...$limit]{${POST_CARD}}`)

export const POST_QUERY = defineQuery(`*[_type == "post" && slug.current == $slug && publishedAt <= now()][0]{
  ${POST_CARD},
  body[]{..., _type == "image" => {asset, crop, hotspot, alt, caption}}
}`)

export const POST_SLUGS_QUERY = defineQuery(`*[_type == "post" && defined(slug.current) && publishedAt <= now()]{"slug": slug.current, publishedAt}`)
