import {defineField} from 'sanity'

// Values are lucide-react component names; the frontend maps them to components.
// Add an option here before using a new icon on the site.
export const ICON_OPTIONS = [
  {title: 'Compass', value: 'Compass'},
  {title: 'Folder (open)', value: 'FolderOpen'},
  {title: 'Folder (upload)', value: 'FolderUp'},
  {title: 'Building', value: 'Building2'},
  {title: 'Plus (square)', value: 'SquarePlus'},
  {title: 'Share', value: 'Share2'},
  {title: 'House', value: 'House'},
  {title: 'Search', value: 'Search'},
  {title: 'Briefcase', value: 'BriefcaseBusiness'},
  {title: 'Waypoints', value: 'Waypoints'},
  {title: 'Lock', value: 'LockKeyhole'},
  {title: 'Lock (small)', value: 'Lock'},
  {title: 'Shield (check)', value: 'ShieldCheck'},
  {title: 'Map pin', value: 'MapPinned'},
  {title: 'File', value: 'FileText'},
  {title: 'People', value: 'Users'},
]

export const iconField = defineField({
  name: 'icon',
  title: 'Icon',
  type: 'string',
  options: {list: ICON_OPTIONS},
  validation: (rule) => rule.required(),
})
