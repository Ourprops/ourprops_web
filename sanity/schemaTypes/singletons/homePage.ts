import {HomeIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {iconField} from '../objects/icon'

const titleField = defineField({
  name: 'title',
  title: 'Title',
  type: 'string',
  validation: (rule) => rule.required(),
})

const descriptionField = defineField({
  name: 'description',
  title: 'Description',
  type: 'text',
  rows: 3,
  validation: (rule) => rule.required(),
})

const cardPreview = {
  select: {title: 'title', subtitle: 'description'},
}

export const homePage = defineType({
  name: 'homePage',
  title: 'Homepage',
  type: 'document',
  icon: HomeIcon,
  groups: [
    {name: 'hero', title: 'Hero', default: true},
    {name: 'valueProposition', title: 'Value proposition'},
    {name: 'howItWorks', title: 'How it works'},
    {name: 'productPreview', title: 'Product preview'},
    {name: 'audience', title: 'Who it is for'},
    {name: 'values', title: 'Values'},
    {name: 'about', title: 'About'},
    {name: 'waitlist', title: 'Waitlist'},
  ],
  fields: [
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      group: 'hero',
      fields: [
        defineField({
          name: 'eyebrow',
          title: 'Eyebrow',
          type: 'string',
          description: 'Small uppercase label above the heading.',
        }),
        defineField({
          name: 'heading',
          title: 'Heading',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
        defineField({name: 'subheading', title: 'Subheading', type: 'text', rows: 3}),
        defineField({name: 'primaryCta', title: 'Primary button', type: 'link'}),
        defineField({name: 'secondaryCta', title: 'Secondary button', type: 'link'}),
        defineField({
          name: 'launchNote',
          title: 'Launch note',
          type: 'string',
          description: 'Shown next to the Ghana flag, e.g. "Launching in Ghana".',
        }),
        defineField({
          name: 'trustPoints',
          title: 'Trust points',
          type: 'array',
          description: 'Short reassurances shown under the buttons, e.g. "Private by default".',
          validation: (rule) => rule.max(2).warning('More than two crowds the hero.'),
          of: [
            defineArrayMember({
              name: 'trustPoint',
              type: 'object',
              fields: [
                iconField,
                defineField({
                  name: 'text',
                  title: 'Text',
                  type: 'string',
                  validation: (rule) => rule.required(),
                }),
              ],
              preview: {select: {title: 'text'}},
            }),
          ],
        }),
      ],
    }),

    defineField({
      name: 'valueProposition',
      title: 'Value proposition',
      type: 'object',
      group: 'valueProposition',
      fields: [
        defineField({name: 'header', title: 'Header', type: 'sectionHeader'}),
        defineField({
          name: 'items',
          title: 'Cards',
          type: 'array',
          validation: (rule) => rule.max(3).warning('The layout is a three-column grid.'),
          of: [
            defineArrayMember({
              name: 'valuePropCard',
              type: 'object',
              fields: [
                iconField,
                titleField,
                descriptionField,
                defineField({
                  name: 'highlight',
                  title: 'Highlight',
                  type: 'string',
                  description: 'Short line shown with a check mark at the bottom of the card.',
                }),
              ],
              preview: cardPreview,
            }),
          ],
        }),
      ],
    }),

    defineField({
      name: 'howItWorks',
      title: 'How it works',
      type: 'object',
      group: 'howItWorks',
      fields: [
        defineField({name: 'header', title: 'Header', type: 'sectionHeader'}),
        defineField({
          name: 'steps',
          title: 'Steps',
          type: 'array',
          description: 'Steps are numbered automatically in this order.',
          validation: (rule) => rule.max(3).warning('The layout is a three-column grid.'),
          of: [
            defineArrayMember({
              name: 'step',
              type: 'object',
              fields: [iconField, titleField, descriptionField],
              preview: cardPreview,
            }),
          ],
        }),
      ],
    }),

    // The product mockup itself stays in code; only the copy around it is editable
    defineField({
      name: 'productPreview',
      title: 'Product preview',
      type: 'object',
      group: 'productPreview',
      fields: [
        defineField({name: 'header', title: 'Header', type: 'sectionHeader'}),
        defineField({
          name: 'callouts',
          title: 'Callouts',
          type: 'array',
          description: 'Short explanations shown under the product preview.',
          validation: (rule) => rule.max(3).warning('The layout is a three-column grid.'),
          of: [
            defineArrayMember({
              name: 'callout',
              type: 'object',
              fields: [iconField, titleField, descriptionField],
              preview: cardPreview,
            }),
          ],
        }),
      ],
    }),

    defineField({
      name: 'audience',
      title: 'Who it is for',
      type: 'object',
      group: 'audience',
      fields: [
        defineField({name: 'header', title: 'Header', type: 'sectionHeader'}),
        defineField({
          name: 'items',
          title: 'Audiences',
          type: 'array',
          validation: (rule) => rule.max(3).warning('The layout is a three-column grid.'),
          of: [
            defineArrayMember({
              name: 'audienceCard',
              type: 'object',
              fields: [
                iconField,
                titleField,
                descriptionField,
                defineField({name: 'cta', title: 'Link', type: 'link'}),
              ],
              preview: cardPreview,
            }),
          ],
        }),
      ],
    }),

    defineField({
      name: 'values',
      title: 'Values',
      type: 'object',
      group: 'values',
      fields: [
        defineField({name: 'header', title: 'Header', type: 'sectionHeader'}),
        defineField({
          name: 'items',
          title: 'Values',
          type: 'array',
          validation: (rule) => rule.max(3).warning('The layout is a three-column grid.'),
          of: [
            defineArrayMember({
              name: 'valueCard',
              type: 'object',
              fields: [iconField, titleField, descriptionField],
              preview: cardPreview,
            }),
          ],
        }),
        defineField({
          name: 'disclaimer',
          title: 'Disclaimer',
          type: 'text',
          rows: 3,
          description: 'What OurProps is not, stated plainly below the values.',
        }),
      ],
    }),

    defineField({
      name: 'about',
      title: 'About',
      type: 'object',
      group: 'about',
      fields: [
        defineField({name: 'header', title: 'Header', type: 'sectionHeader'}),
        defineField({name: 'mission', title: 'Mission', type: 'text', rows: 3}),
        defineField({name: 'vision', title: 'Vision', type: 'text', rows: 3}),
      ],
    }),

    // Form fields and role options stay in code (lib/validators/waitlist.ts)
    // because they must match the database.
    defineField({
      name: 'waitlist',
      title: 'Waitlist',
      type: 'object',
      group: 'waitlist',
      fields: [
        defineField({name: 'header', title: 'Header', type: 'sectionHeader'}),
        defineField({name: 'submitLabel', title: 'Submit button label', type: 'string'}),
        defineField({
          name: 'privacyNote',
          title: 'Privacy note',
          type: 'string',
          description: 'Shown under the submit button.',
        }),
        defineField({name: 'successTitle', title: 'Success title', type: 'string'}),
        defineField({name: 'successMessage', title: 'Success message', type: 'text', rows: 2}),
      ],
    }),
  ],
  preview: {
    prepare: () => ({title: 'Homepage'}),
  },
})
