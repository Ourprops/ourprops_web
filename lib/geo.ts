import type { Boundary, Coordinate } from "@/lib/validators/property"

// Geometry for property boundaries. Coordinates are WGS 84 (SRID 4326), as used by the map and PostGIS.

// The mean earth radius. The area comes out within about 0.5% of the area_sqm PostGIS works out on the ellipsoid.
const EARTH_RADIUS_M = 6371008.8
const SQUARE_METRES_PER_ACRE = 4046.8564224
// A standard plot in Ghana is 70 by 100 feet
const SQUARE_METRES_PER_PLOT = 70 * 100 * 0.09290304

type GeoJSONPosition = [longitude: number, latitude: number]

export type BoundaryGeoJSON =
    | { type: "Polygon"; coordinates: GeoJSONPosition[][] }
    | { type: "Point"; coordinates: GeoJSONPosition }

export function toPosition({ latitude, longitude }: Coordinate): GeoJSONPosition {
    return [longitude, latitude]
}

export function fromPosition([longitude, latitude]: number[]): Coordinate {
    return { latitude, longitude }
}

// GeoJSON repeats the first corner at the end of a ring; boundaries don't
export function boundaryToGeoJSON(boundary: Boundary): BoundaryGeoJSON {
    if ("pin" in boundary) return { type: "Point", coordinates: toPosition(boundary.pin) }
    const ring = boundary.polygon.map(toPosition)
    return { type: "Polygon", coordinates: [[...ring, ring[0]]] }
}

export function ringToCorners(ring: number[][]): Coordinate[] {
    const corners = ring.map(fromPosition)
    const first = corners[0]
    const last = corners[corners.length - 1]
    const closed = corners.length > 1 && first.latitude === last.latitude && first.longitude === last.longitude
    return closed ? corners.slice(0, -1) : corners
}

/** The area enclosed by the corners in square metres, measured on the earth's surface */
export function polygonArea(corners: Coordinate[]): number {
    if (corners.length < 3) return 0

    // The spherical excess formula used by turf's area
    let total = 0
    for (let i = 0; i < corners.length; i++) {
        const before = corners[i]
        const middle = corners[(i + 1) % corners.length]
        const after = corners[(i + 2) % corners.length]
        total += (radians(after.longitude) - radians(before.longitude)) * Math.sin(radians(middle.latitude))
    }
    return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2)
}

export function toAcres(squareMetres: number) {
    return squareMetres / SQUARE_METRES_PER_ACRE
}

export function toPlots(squareMetres: number) {
    return squareMetres / SQUARE_METRES_PER_PLOT
}

/**
 * Whether the corners make a polygon PostGIS accepts as valid: at least three distinct corners,
 * an area, and no edge crossing or doubling back over another.
 * Like PostGIS, this treats longitude and latitude as flat x and y.
 */
export function isSimplePolygon(corners: Coordinate[]): boolean {
    // A corner repeated straight after itself adds no edge
    const points = corners
        .map(toPosition)
        .filter((point, i, all) => !samePoint(point, all[(i + 1) % all.length]))
    if (points.length < 3) return false

    const edges = points.map((start, i) => [start, points[(i + 1) % points.length]] as const)
    for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
            const [a, b] = edges[i]
            const [c, d] = edges[j]
            if (j === i + 1) {
                // Edges meeting at a corner (b = c) may only touch there, so d mustn't double back onto the first edge
                if (onSegment(a, b, d) || onSegment(c, d, a)) return false
            } else if (i === 0 && j === edges.length - 1) {
                // The last edge meets the first at the first corner (d = a)
                if (onSegment(a, b, c) || onSegment(c, d, b)) return false
            } else if (segmentsIntersect(a, b, c, d)) {
                return false
            }
        }
    }

    return polygonArea(corners) > 0
}

function radians(degrees: number) {
    return (degrees * Math.PI) / 180
}

function samePoint(a: GeoJSONPosition, b: GeoJSONPosition) {
    return a[0] === b[0] && a[1] === b[1]
}

// Which side of the line from a to b the point c is on: 1 or -1, or 0 when the three are in line
function orientation(a: GeoJSONPosition, b: GeoJSONPosition, c: GeoJSONPosition) {
    return Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
}

// Whether p lies on the segment from a to b
function onSegment(a: GeoJSONPosition, b: GeoJSONPosition, p: GeoJSONPosition) {
    return (
        orientation(a, b, p) === 0 &&
        Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) &&
        Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1])
    )
}

function segmentsIntersect(a: GeoJSONPosition, b: GeoJSONPosition, c: GeoJSONPosition, d: GeoJSONPosition) {
    const abc = orientation(a, b, c)
    const abd = orientation(a, b, d)
    const cda = orientation(c, d, a)
    const cdb = orientation(c, d, b)
    if (abc !== abd && cda !== cdb && abc !== 0 && abd !== 0 && cda !== 0 && cdb !== 0) return true
    return onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b)
}
