import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import Audience from '../app/(public)/_components/audience'
import Hero from '../app/(public)/_components/hero'
import { HOME_DEFAULTS, type AccessLevel } from '../lib/content/defaults'
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

describe('Who it is for', () => {
    afterEach(cleanup)

    // Each card's picture of the record, read as "part: visibility" pairs
    function recordViews() {
        return screen.getAllByRole('link').map((card) =>
            Array.from(card.querySelectorAll('li')).map((row) => row.textContent)
        )
    }

    test('shows each audience the parts of the record their access level allows', () => {
        render(<Audience content={HOME_DEFAULTS.audience} />)

        const [owner, buyer, professional] = recordViews()
        expect(owner.every((row) => row?.endsWith('Visible'))).toBe(true)
        expect(buyer).toContain('IndentureStatus only')
        expect(buyer).toContain('ReceiptsHidden')
        expect(professional).toContain('IndentureVisible')
        expect(professional).toContain('Mapped boundaryHidden')
    })

    test('treats an access level it does not know as a summary', () => {
        const [owner] = HOME_DEFAULTS.audience.items
        render(<Audience content={{ ...HOME_DEFAULTS.audience, items: [{ ...owner, accessLevel: 'everything' as AccessLevel }] }} />)

        expect(recordViews()[0]).toContain('IndentureStatus only')
    })

    test('a card from Sanity without an access level uses the default for its position', () => {
        const content = withFallback(HOME_DEFAULTS.audience, {
            items: [{ title: 'Owners' }, { title: 'Buyers' }],
        })

        expect(content.items.map((item) => item.accessLevel)).toEqual(['full', 'summary'])
    })
})
