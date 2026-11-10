import { type SchemaTypeDefinition } from 'sanity'

import { legalPage } from './documents/legalPage'
import { link } from './objects/link'
import { sectionHeader } from './objects/sectionHeader'
import { faqPage } from './singletons/faqPage'
import { homePage } from './singletons/homePage'
import { siteSettings } from './singletons/siteSettings'

// Document types whose documents have fixed IDs, opened from the Studio structure and edited in place: no "create
// new", duplicate or delete. homePage, siteSettings and faqPage have one each; legalPage has one per page (LEGAL_PAGES).
export const SINGLETON_TYPES = new Set(['homePage', 'siteSettings', 'faqPage', 'legalPage'])

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Singletons
    homePage,
    siteSettings,
    faqPage,
    // Documents
    legalPage,
    // Objects
    sectionHeader,
    link,
  ],
}
