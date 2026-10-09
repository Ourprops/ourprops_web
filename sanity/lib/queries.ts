import { defineQuery } from 'next-sanity'

const SECTION_HEADER = `header{eyebrow, heading, description}`
const LINK = `{label, href}`
const CARD = `{icon, title, description}`

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
  valueProposition{${SECTION_HEADER}, items[]{icon, title, description, highlight}},
  howItWorks{${SECTION_HEADER}, steps[]${CARD}},
  productPreview{${SECTION_HEADER}, callouts[]${CARD}},
  audience{${SECTION_HEADER}, items[]{icon, title, description, cta${LINK}}},
  values{${SECTION_HEADER}, items[]${CARD}, disclaimer},
  about{${SECTION_HEADER}, mission, vision},
  waitlist{${SECTION_HEADER}, submitLabel, privacyNote, successTitle, successMessage}
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
