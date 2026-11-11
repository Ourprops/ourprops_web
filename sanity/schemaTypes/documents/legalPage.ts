import {DocumentTextIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

// The privacy policy and the terms & conditions. Each has a fixed document ID (see LEGAL_PAGES), so the site's
// /privacy and /terms pages always find it; until it's published they show a "being written" placeholder.
export const LEGAL_PAGES = [
  {id: 'privacyPolicy', title: 'Privacy policy', path: '/privacy'},
  {id: 'termsAndConditions', title: 'Terms & conditions', path: '/terms'},
] as const

export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal page',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({name: 'title', type: 'string', validation: (rule) => rule.required()}),
    defineField({
      name: 'lastUpdated',
      title: 'Last updated',
      type: 'date',
      description: 'Shown at the top of the page. Change it whenever the content changes.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      type: 'array',
      of: [defineArrayMember({type: 'block'})],
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {select: {title: 'title', subtitle: 'lastUpdated'}},
})
