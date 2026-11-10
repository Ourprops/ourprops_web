import { type SchemaTypeDefinition } from 'sanity'

import { legalPage } from './documents/legalPage'
import { link } from './objects/link'
import { sectionHeader } from './objects/sectionHeader'
import { homePage } from './singletons/homePage'
import { siteSettings } from './singletons/siteSettings'

// Document types whose documents have fixed IDs, opened from the Studio structure and edited in place: no "create
// new", duplicate or delete. homePage and siteSettings have one each; legalPage has one per page (LEGAL_PAGES).
export const SINGLETON_TYPES = new Set(['homePage', 'siteSettings', 'legalPage'])

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // Singletons
    homePage,
    siteSettings,
    // Documents
    legalPage,
    // Objects
    sectionHeader,
    link,
  ],
}
