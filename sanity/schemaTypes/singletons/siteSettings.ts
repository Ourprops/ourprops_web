import {CogIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'seo', title: 'SEO', default: true},
    {name: 'header', title: 'Header'},
    {name: 'footer', title: 'Footer'},
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Site title',
      type: 'string',
      group: 'seo',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'seo',
      validation: (rule) => rule.max(160).warning('Search engines usually cut off after 160 characters.'),
    }),
    defineField({
      name: 'shareTitle',
      title: 'Link preview title',
      type: 'string',
      group: 'seo',
      description: 'Shown when the site is shared on WhatsApp, LinkedIn, X, etc.',
    }),
    defineField({
      name: 'shareDescription',
      title: 'Link preview description',
      type: 'text',
      rows: 2,
      group: 'seo',
    }),
    defineField({
      name: 'ogImage',
      title: 'Social share image',
      type: 'image',
      group: 'seo',
      description: '1200 × 630 PNG or JPG, under 300 KB so WhatsApp shows it. A generated image is used when empty.',
      fields: [defineField({name: 'alt', title: 'Alt text', type: 'string'})],
    }),

    // Used by the header and the mobile menu
    defineField({
      name: 'navigation',
      title: 'Navigation links',
      type: 'array',
      group: 'header',
      of: [defineArrayMember({type: 'link'})],
    }),
    defineField({
      name: 'headerCta',
      title: 'Header button',
      type: 'link',
      group: 'header',
    }),

    defineField({
      name: 'footerTagline',
      title: 'Tagline',
      type: 'string',
      group: 'footer',
    }),
    defineField({
      name: 'footerLinks',
      title: 'Footer links',
      type: 'array',
      group: 'footer',
      of: [defineArrayMember({type: 'link'})],
    }),
    defineField({
      name: 'footerNote',
      title: 'Bottom note',
      type: 'string',
      group: 'footer',
      description: 'Shown on the right of the copyright line.',
    }),
    defineField({
      name: 'companyName',
      title: 'Company name (for copyright)',
      type: 'string',
      group: 'footer',
      description: 'The current year is added automatically.',
    }),
  ],
  preview: {
    prepare: () => ({title: 'Site settings'}),
  },
})
