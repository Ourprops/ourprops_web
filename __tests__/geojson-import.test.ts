import { describe, expect, test } from 'vitest'

import { parseBoundaryGeoJSON } from '../lib/geojson-import'

// A plot in East Legon as GeoJSON positions, longitude first, with the ring closed
const RING = [[-0.157, 5.635], [-0.156, 5.635], [-0.156, 5.636], [-0.157, 5.636], [-0.157, 5.635]]

const CORNERS = [
    { latitude: 5.635, longitude: -0.157 },
    { latitude: 5.635, longitude: -0.156 },
    { latitude: 5.636, longitude: -0.156 },
    { latitude: 5.636, longitude: -0.157 },
]

const polygon = (rings: number[][][] = [RING]) => ({ type: 'Polygon', coordinates: rings })
const feature = (geometry: unknown) => ({ type: 'Feature', properties: {}, geometry })
const collection = (...features: unknown[]) => ({ type: 'FeatureCollection', features })

function parse(data: unknown) {
    return parseBoundaryGeoJSON(typeof data === 'string' ? data : JSON.stringify(data))
}

function errorFor(data: unknown) {
    const result = parse(data)
    return result.ok ? null : result.error
}

describe('parseBoundaryGeoJSON', () => {
    test.each([
        ['a FeatureCollection', collection(feature(polygon()))],
        ['a Feature', feature(polygon())],
        ['a bare Polygon', polygon()],
        ['a MultiPolygon with one polygon', { type: 'MultiPolygon', coordinates: [[RING]] }],
        ['a GeometryCollection', { type: 'GeometryCollection', geometries: [polygon()] }],
        ['positions with a height', polygon([RING.map(([x, y]) => [x, y, 42])])],
        ['the CRS84 system named', { ...collection(feature(polygon())), crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } } }],
        ['a point and a line alongside the boundary', collection(feature(polygon()), feature({ type: 'LineString', coordinates: [[0, 5], [0, 6]] }))],
    ])('reads the boundary from %s', (_, data) => {
        expect(parse(data)).toEqual({ ok: true, boundary: { polygon: CORNERS, source: 'geojson_import' } })
    })

    test('reads a point as a pin', () => {
        expect(parse(feature({ type: 'Point', coordinates: [-0.187, 5.6037] }))).toEqual({
            ok: true,
            boundary: { pin: { latitude: 5.6037, longitude: -0.187 }, source: 'geojson_import' },
        })
    })

    test('rounds coordinates to the precision the map keeps', () => {
        const result = parse(feature({ type: 'Point', coordinates: [-0.1870000000123, 5.6037] }))
        expect(result.ok && 'pin' in result.boundary && result.boundary.pin.longitude).toBe(-0.187)
    })

    test.each([
        ['text that is not JSON', 'not json', /isn't GeoJSON/],
        ['JSON that is not GeoJSON', { name: 'plot' }, /isn't GeoJSON/],
        ['two boundaries', collection(feature(polygon()), feature(polygon())), /2 shapes/],
        ['two points', { type: 'MultiPoint', coordinates: [[-0.187, 5.6], [-0.186, 5.6]] }, /2 points/],
        ['only a line', feature({ type: 'LineString', coordinates: [[-0.187, 5.6], [-0.186, 5.6]] }), /no boundary or point/],
        ['a boundary with a hole', polygon([RING, RING]), /gap cut out/],
        ['Ghana National Grid coordinates', polygon([[[1200000, 350000], [1200100, 350000], [1200100, 350100], [1200000, 350000]]]), /WGS 84/],
        ['another coordinate system named', { ...feature(polygon()), crs: { type: 'name', properties: { name: 'EPSG:2136' } } }, /WGS 84/],
        ['latitude and longitude swapped', polygon([RING.map(([x, y]) => [y, x])]), /wrong way round/],
        ['a boundary outside Ghana', polygon([RING.map(([x, y]) => [x + 30, y])]), /isn't in Ghana/],
        ['a boundary that crosses itself', polygon([[RING[0], RING[2], RING[1], RING[3], RING[0]]]), /cross over itself/],
        ['positions that are not numbers', { type: 'Polygon', coordinates: [[['a', 'b'], [1, 2], [3, 4], ['a', 'b']]] }, /WGS 84/],
    ])('explains why it refuses %s', (_, data, message) => {
        expect(errorFor(data)).toMatch(message)
    })
})
