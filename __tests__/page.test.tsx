import { afterEach, describe, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import Audience from '../app/(public)/_components/audience'
import Hero from '../app/(public)/_components/hero'
import { HOME_DEFAULTS, type AccessLevel } from '../lib/content/defaults'
import { withFallback } from '../lib/content/merge'
import { SIGN_UP_PATH } from '../lib/site'

afterEach(cleanup)

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
    expect(content.primaryCta).toEqual({ label: 'Sign up', href: SIGN_UP_PATH })
    expect(content.trustPoints).toEqual([{ icon: 'Lock', text: 'Only one' }])
    expect(withFallback(HOME_DEFAULTS.hero, null)).toBe(HOME_DEFAULTS.hero)
})

describe('Who it is for', () => {
    // Each card's picture of the record, read as "part: visibility" pairs (the card is the list item holding its title)
    function recordViews() {
        return screen.getAllByRole('heading', { level: 3 }).map((title) =>
            Array.from(title.closest('li')?.querySelectorAll('li') ?? []).map((row) => row.textContent)
        )
    }

    // As OurProps works today: the owner sees their whole record; everyone else sees the public record, never documents
    test('shows the owner their whole record, and everyone else the public record without documents', () => {
        render(<Audience content={HOME_DEFAULTS.audience} variant="page" />)

        const [owner, buyer, professional] = recordViews()
        expect(owner.every((row) => row?.endsWith('Visible'))).toBe(true)
        for (const view of [buyer, professional]) {
            expect(view).toContain('What we checkedVisible')
            expect(view).toContain('IndenturePrivate')
            expect(view).toContain('Site planPrivate')
            expect(view).toContain('Exact boundaryPrivate')
        }
    })

    test('never shows anyone but the owner a document, whatever the access level says', () => {
        render(<Audience content={HOME_DEFAULTS.audience} variant="page" />)

        const [, ...others] = recordViews()
        expect(others.flat().some((row) => /^(Indenture|Site plan)Visible/.test(row ?? ''))).toBe(false)
    })

    test('treats an access level it does not know as the public record', () => {
        const [owner] = HOME_DEFAULTS.audience.items
        render(<Audience variant="page" content={{ ...HOME_DEFAULTS.audience, items: [{ ...owner, accessLevel: 'everything' as AccessLevel }] }} />)

        expect(recordViews()[0]).toContain('IndenturePrivate')
    })

    test('a card from Sanity without an access level uses the default for its position', () => {
        const content = withFallback(HOME_DEFAULTS.audience, {
            items: [{ title: 'Owners' }, { title: 'Buyers' }],
        })

        expect(content.items.map((item) => item.accessLevel)).toEqual(['full', 'summary'])
    })
})
