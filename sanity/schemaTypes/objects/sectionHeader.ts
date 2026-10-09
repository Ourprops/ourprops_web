import {defineField, defineType} from 'sanity'

// The eyebrow / heading / intro trio that opens most homepage sections
export const sectionHeader = defineType({
  name: 'sectionHeader',
  title: 'Section header',
  type: 'object',
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      description: 'Small uppercase label above the heading, e.g. "Workflow".',
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
  ],
})
