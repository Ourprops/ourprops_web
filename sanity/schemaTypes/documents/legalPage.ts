import {DocumentTextIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

// Privacy policy, terms of service and similar long-form pages
export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal page',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'lastUpdated',
      title: 'Last updated',
      type: 'date',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [defineArrayMember({type: 'block'})],
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'slug.current'},
    prepare: ({title, subtitle}) => ({title, subtitle: subtitle && `/${subtitle}`}),
  },
})
