import {CogIcon, DocumentTextIcon, HomeIcon} from '@sanity/icons'
import type {StructureResolver} from 'sanity/structure'

import {SINGLETON_TYPES} from './schemaTypes'
import {LEGAL_PAGES} from './schemaTypes/documents/legalPage'

// https://www.sanity.io/docs/structure-builder-cheat-sheet
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      // Singletons open their one document directly; the document ID equals the type name
      S.listItem()
        .title('Homepage')
        .icon(HomeIcon)
        .child(S.document().schemaType('homePage').documentId('homePage')),
      S.listItem()
        .title('Site settings')
        .icon(CogIcon)
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.divider(),
      // Legal pages: one fixed document each, so /privacy and /terms always find theirs
      ...LEGAL_PAGES.map((page) =>
        S.listItem()
          .title(page.title)
          .icon(DocumentTextIcon)
          .child(S.document().schemaType('legalPage').documentId(page.id).title(page.title)),
      ),
      ...S.documentTypeListItems().filter((item) => !SINGLETON_TYPES.has(item.getId() ?? '')),
    ])
