import { describe, expect, test } from 'vitest'

import { ASSEMBLIES_BY_REGION, isAssemblyInRegion } from '../lib/ghana-districts'
import { locationDraftSchema, locationSchema, regionSchema } from '../lib/validators/property'

describe('Ghana assemblies list', () => {
    test('has every region and all 261 assemblies', () => {
        expect(Object.keys(ASSEMBLIES_BY_REGION).sort()).toEqual([...regionSchema.options].sort())
        expect(Object.values(ASSEMBLIES_BY_REGION).flat()).toHaveLength(261)
    })

    test('has no duplicate names, so a name identifies one assembly', () => {
        const names = Object.values(ASSEMBLIES_BY_REGION).flat().map((assembly) => assembly.name)
        expect(new Set(names).size).toBe(names.length)
    })

    test('matches an assembly to its own region only', () => {
        expect(isAssemblyInRegion('Ashanti', 'Kumasi')).toBe(true)
        expect(isAssemblyInRegion('Greater Accra', 'Kumasi')).toBe(false)
    })
})

describe('Location schema', () => {
    const location = { region: 'Greater Accra', municipality: 'Ayawaso West', city: 'East Legon' }

    test('accepts an assembly in the chosen region', () => {
        expect(locationSchema.safeParse(location).success).toBe(true)
    })

    test('rejects an assembly from another region, on the municipality field', () => {
        const result = locationSchema.safeParse({ ...location, municipality: 'Kumasi' })

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['municipality'], message: 'Choose a municipality or district in this region' }),
        ])
    })

    test('rejects a typed name that is not on the list', () => {
        expect(locationSchema.safeParse({ ...location, municipality: 'AMA' }).success).toBe(false)
    })

    test('still lets a draft be saved with the municipality unset or cleared', () => {
        expect(locationDraftSchema.safeParse({ region: 'Ashanti' }).success).toBe(true)
        expect(locationDraftSchema.safeParse({ region: 'Ashanti', municipality: '' }).success).toBe(true)
    })
})
