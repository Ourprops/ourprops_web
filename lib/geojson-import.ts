import { boundarySchema, type Boundary } from "@/lib/validators/property"

// Reads a boundary or pin from a GeoJSON file the user uploads, such as one exported from a surveyor's or mapping app

/** Larger files are refused before they are read; a single plot's boundary is a few kilobytes */
export const MAX_GEOJSON_BYTES = 5 * 1024 * 1024

// A box round Ghana, a little larger than the country so plots on the border fit
const GHANA_BOUNDS = { west: -3.5, east: 1.5, south: 4.5, north: 11.5 }

// The map stores coordinates to 9 decimal places (about a millimetre) and refuses anything more precise
const COORDINATE_DECIMALS = 9

const WGS84_MESSAGE =
    "The coordinates in this file aren't longitude and latitude. Export it in WGS 84 (EPSG:4326) and try again."

export type GeoJSONImport = { ok: true; boundary: Boundary } | { ok: false; error: string }

type Position = number[]
type Shape = { type: "Polygon"; rings: Position[][] } | { type: "Point"; position: Position }

export function parseBoundaryGeoJSON(text: string): GeoJSONImport {
    let data: unknown
    try {
        data = JSON.parse(text)
    } catch {
        return failure("This file isn't GeoJSON. Upload a .geojson file exported from your mapping or survey app.")
    }

    // GeoJSON is always WGS 84 now, but older files can name another system, such as the Ghana National Grid
    const crs = (data as { crs?: { properties?: { name?: unknown } } } | null)?.crs?.properties?.name
    if (typeof crs === "string" && !/CRS84|4326/i.test(crs)) return failure(WGS84_MESSAGE)

    const shapes = collectShapes(data)
    if (!shapes) return failure("This file isn't GeoJSON. Upload a .geojson file exported from your mapping or survey app.")

    const polygons = shapes.filter((shape) => shape.type === "Polygon")
    const points = shapes.filter((shape) => shape.type === "Point")

    let candidate: unknown
    if (polygons.length > 1) {
        return failure(`This file has ${polygons.length} shapes in it. Upload a file with only this property's boundary.`)
    } else if (polygons.length === 1) {
        const [outer, ...holes] = polygons[0].rings
        if (holes.length) {
            return failure("This boundary has a gap cut out of it, which can't be saved yet. Upload just its outer edge.")
        }
        if (!outer?.every(isPosition)) return failure(WGS84_MESSAGE)
        const location = checkLocation(outer)
        if (location) return failure(location)
        candidate = { polygon: toCorners(outer), source: "geojson_import" }
    } else if (points.length > 1) {
        return failure(`This file has ${points.length} points in it. Upload a file with only the property's location.`)
    } else if (points.length === 1) {
        const { position } = points[0]
        if (!isPosition(position)) return failure(WGS84_MESSAGE)
        const location = checkLocation([position])
        if (location) return failure(location)
        candidate = { pin: toCoordinate(position), source: "geojson_import" }
    } else {
        return failure("This file has no boundary or point in it. Lines and other shapes can't be used.")
    }

    // The same checks as a boundary drawn on the map, such as not crossing over itself
    const result = boundarySchema.safeParse(candidate)
    if (!result.success) return failure(result.error.issues[0]?.message ?? "This boundary can't be used.")
    return { ok: true, boundary: result.data }
}

function failure(error: string): GeoJSONImport {
    return { ok: false, error }
}

// Every polygon and point in a FeatureCollection, Feature or bare geometry, or null when the data isn't GeoJSON
function collectShapes(data: unknown): Shape[] | null {
    if (!data || typeof data !== "object") return null
    const value = data as { type?: unknown; features?: unknown; geometry?: unknown; geometries?: unknown; coordinates?: unknown }

    switch (value.type) {
        case "FeatureCollection":
            if (!Array.isArray(value.features)) return null
            return value.features.flatMap((feature) => collectShapes(feature) ?? [])
        case "Feature":
            // A feature may have no geometry
            return value.geometry ? collectShapes(value.geometry) : []
        case "GeometryCollection":
            if (!Array.isArray(value.geometries)) return null
            return value.geometries.flatMap((geometry) => collectShapes(geometry) ?? [])
        case "Polygon":
            return Array.isArray(value.coordinates) ? [{ type: "Polygon", rings: value.coordinates }] : null
        case "MultiPolygon":
            // Apps often save a single boundary as a MultiPolygon with one polygon in it
            return Array.isArray(value.coordinates)
                ? value.coordinates.map((rings: Position[][]) => ({ type: "Polygon", rings }))
                : null
        case "Point":
            return Array.isArray(value.coordinates) ? [{ type: "Point", position: value.coordinates }] : null
        case "MultiPoint":
            return Array.isArray(value.coordinates)
                ? value.coordinates.map((position: Position) => ({ type: "Point", position }))
                : null
        case "LineString":
        case "MultiLineString":
            return []
        default:
            return null
    }
}

function isPosition(position: unknown): position is Position {
    return (
        Array.isArray(position) &&
        position.length >= 2 &&
        typeof position[0] === "number" &&
        typeof position[1] === "number" &&
        Number.isFinite(position[0]) &&
        Number.isFinite(position[1])
    )
}

function inGhana([longitude, latitude]: Position) {
    return (
        GHANA_BOUNDS.west <= longitude && longitude <= GHANA_BOUNDS.east &&
        GHANA_BOUNDS.south <= latitude && latitude <= GHANA_BOUNDS.north
    )
}

// Explains why the coordinates can't be a property in Ghana, or returns null when they can
function checkLocation(positions: Position[]): string | null {
    if (positions.every(inGhana)) return null
    // Grid systems use metres or feet, which are far outside the range of longitude and latitude
    if (positions.some(([longitude, latitude]) => Math.abs(longitude) > 180 || Math.abs(latitude) > 90)) {
        return WGS84_MESSAGE
    }
    if (positions.every(([longitude, latitude]) => inGhana([latitude, longitude]))) {
        return "The coordinates in this file have latitude and longitude the wrong way round. GeoJSON lists longitude first."
    }
    return "This boundary isn't in Ghana. Check you've uploaded the right file."
}

// Drops any height and rounds to the precision the map keeps
function toCoordinate([longitude, latitude]: Position) {
    const factor = 10 ** COORDINATE_DECIMALS
    return {
        latitude: Math.round(latitude * factor) / factor,
        longitude: Math.round(longitude * factor) / factor,
    }
}

// Removes the closing corner GeoJSON repeats, and any corner repeated straight after itself
function toCorners(ring: Position[]) {
    const corners = ring.map(toCoordinate)
    return corners.filter((corner, i) => {
        const next = corners[(i + 1) % corners.length]
        return corner.latitude !== next.latitude || corner.longitude !== next.longitude
    })
}
