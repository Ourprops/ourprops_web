import { type SchemaTypeDefinition } from 'sanity'

import { legalPage } from './documents/legalPage'
import { link } from './objects/link'
import { sectionHeader } from './objects/sectionHeader'
import { homePage } from './singletons/homePage'
import { siteSettings } from './singletons/siteSettings'

// Document types that have exactly one document, edited in place
export const SINGLETON_TYPES = new Set(['homePage', 'siteSettings'])

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
