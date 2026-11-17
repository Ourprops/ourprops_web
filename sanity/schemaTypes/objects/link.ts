import {defineField, defineType} from 'sanity'

export const link = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'href',
      title: 'URL',
      type: 'string',
      description: 'A page on this site (/how-it-works, /blog) or a full URL.',
      validation: (rule) =>
        rule.required().custom((value) => {
          if (!value || /^(#|\/|https?:\/\/|mailto:)/.test(value)) return true
          return 'Must start with #, /, http(s):// or mailto:'
        }),
    }),
  ],
  preview: {
    select: {title: 'label', subtitle: 'href'},
  },
})
