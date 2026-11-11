import {HelpCircleIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

// The public FAQ at /faq. The first three questions also show on the homepage, so put the most asked first.
export const faqPage = defineType({
  name: 'faqPage',
  title: 'FAQ',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({name: 'header', title: 'Header', type: 'sectionHeader'}),
    defineField({
      name: 'items',
      title: 'Questions',
      type: 'array',
      description: 'The first three also show on the homepage.',
      of: [
        defineArrayMember({
          name: 'faqItem',
          type: 'object',
          fields: [
            defineField({name: 'question', title: 'Question', type: 'string', validation: (rule) => rule.required()}),
            defineField({name: 'answer', title: 'Answer', type: 'text', rows: 4, validation: (rule) => rule.required()}),
          ],
          preview: {select: {title: 'question', subtitle: 'answer'}},
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'FAQ'})},
})
