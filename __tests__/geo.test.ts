import { describe, expect, test } from 'vitest'

import { boundaryToGeoJSON, isSimplePolygon, polygonArea, ringToCorners, toAcres } from '../lib/geo'

function corners(...points: [longitude: number, latitude: number][]) {
    return points.map(([longitude, latitude]) => ({ latitude, longitude }))
}

const SQUARE = corners([0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001])

describe('polygonArea', () => {
    test('measures a boundary in square metres', () => {
        // About 111 m by 111 m at the equator; PostGIS gives 12,309 m² on the ellipsoid
        expect(polygonArea(SQUARE)).toBeCloseTo(12_364, -1)
    })

    test("doesn't depend on which way the corners were drawn", () => {
        expect(polygonArea([...SQUARE].reverse())).toBeCloseTo(polygonArea(SQUARE))
    })

    test('is zero until there are three corners', () => {
        expect(polygonArea(SQUARE.slice(0, 2))).toBe(0)
    })

    test('converts to acres', () => {
        expect(toAcres(4046.8564224)).toBeCloseTo(1)
    })
})

describe('isSimplePolygon', () => {
    test.each([
        ['a square', SQUARE],
        ['a triangle', corners([0, 0], [1, 0], [0, 1])],
        ['an L shape', corners([0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2])],
        ['a corner in a straight line with its neighbours', corners([0, 0], [1, 0], [2, 0], [2, 1], [0, 1])],
        ['a corner placed twice in a row', corners([0, 0], [1, 0], [1, 0], [1, 1], [0, 1])],
        ['a ring closed GeoJSON style', corners([0, 0], [1, 0], [1, 1], [0, 0])],
    ])('accepts %s', (_, polygon) => {
        expect(isSimplePolygon(polygon)).toBe(true)
    })

    test.each([
        ['a bow tie', corners([0, 0], [1, 1], [1, 0], [0, 1])],
        ['two corners', corners([0, 0], [1, 1])],
        ['three corners in a line', corners([0, 0], [1, 0], [2, 0])],
        ['an edge doubling back on itself', corners([0, 0], [2, 0], [1, 0], [1, 1])],
        ['the last edge doubling back over the first', corners([0, 0], [2, 0], [2, 1], [0, 1], [1, 0])],
        ['two corners touching', corners([0, 0], [2, 0], [1, 1], [2, 2], [0, 2], [1, 1])],
        ['an edge running along another', corners([0, 0], [3, 0], [3, 1], [2, 0], [1, 0], [0, 1])],
    ])('rejects %s', (_, polygon) => {
        expect(isSimplePolygon(polygon)).toBe(false)
    })
})

describe('GeoJSON', () => {
    test('closes the ring and puts longitude first', () => {
        expect(boundaryToGeoJSON({ polygon: corners([0, 0], [1, 0], [1, 1]), source: 'manual_draw' })).toEqual({
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        })
    })

    test('reads a closed ring back as the corners drawn', () => {
        expect(ringToCorners([[0, 0], [1, 0], [1, 1], [0, 0]])).toEqual(corners([0, 0], [1, 0], [1, 1]))
    })
})
