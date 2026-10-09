import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import Hero from '../app/(marketing)/_components/hero'
import { HOME_DEFAULTS } from '../lib/content/defaults'
import { withFallback } from '../lib/content/merge'

test('Hero renders the headline', () => {
    render(<Hero content={HOME_DEFAULTS.hero} />)
    expect(screen.getByRole('heading', { level: 1, name: HOME_DEFAULTS.hero.heading })).toBeDefined()
})

test('withFallback keeps CMS values and fills gaps', () => {
    const content = withFallback(HOME_DEFAULTS.hero, {
        heading: 'From Sanity',
        subheading: '',
        primaryCta: { label: 'Sign up' },
        trustPoints: [{ text: 'Only one' }],
    })

    expect(content.heading).toBe('From Sanity')
    expect(content.subheading).toBe(HOME_DEFAULTS.hero.subheading)
    expect(content.primaryCta).toEqual({ label: 'Sign up', href: '#waitlist' })
    expect(content.trustPoints).toEqual([{ icon: 'Lock', text: 'Only one' }])
    expect(withFallback(HOME_DEFAULTS.hero, null)).toBe(HOME_DEFAULTS.hero)
})
