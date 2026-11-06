"use client"

import { APILoadingStatus, APIProvider, ControlPosition, Map, useApiLoadingStatus, useMap } from "@vis.gl/react-google-maps"
import { useEffect } from "react"

const GHANA_CENTER = { lat: 7.95, lng: -1.03 }
const GHANA_ZOOM = 7

// Bright enough to read on satellite imagery: this property in blue, the properties it overlaps in red.
// Kept in step with the legend in the page.
const SUBJECT_COLOUR = "#4C8BF5"
const OVERLAP_COLOUR = "#E53935"

type Shape = { type?: unknown; coordinates?: unknown }

type Props = {
    apiKey: string
    // GeoJSON as stored in property_boundaries.boundary_geojson: a Polygon, or a Point for a pin
    boundary: unknown
    overlaps: unknown[]
}

// Read-only: the property's boundary on satellite imagery, with any overlapping boundaries over it
export function BoundaryMap({ apiKey, boundary, overlaps }: Props) {
    return (
        <APIProvider apiKey={apiKey} region="GH" language="en">
            <MapOrMessage boundary={boundary} overlaps={overlaps} />
        </APIProvider>
    )
}

function MapOrMessage({ boundary, overlaps }: Omit<Props, "apiKey">) {
    const status = useApiLoadingStatus()
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
        return <p className="text-sm text-muted-foreground">The map couldn&apos;t load.</p>
    }

    return (
        <div className="h-80 overflow-hidden rounded-lg border border-border sm:h-96">
            <Map
                defaultCenter={GHANA_CENTER}
                defaultZoom={GHANA_ZOOM}
                mapTypeId="hybrid"
                gestureHandling="cooperative"
                disableDefaultUI
                zoomControl
                zoomControlOptions={{ position: ControlPosition.RIGHT_TOP }}
                clickableIcons={false}
                className="size-full"
            />
            <Shapes boundary={boundary} overlaps={overlaps} />
        </div>
    )
}

function Shapes({ boundary, overlaps }: Omit<Props, "apiKey">) {
    const map = useMap()

    useEffect(() => {
        if (!map) return

        const bounds = new google.maps.LatLngBounds()
        const drawn = [
            draw(map, boundary, SUBJECT_COLOUR, 0.25, bounds),
            ...overlaps.map((shape) => draw(map, shape, OVERLAP_COLOUR, 0.15, bounds)),
        ].filter((item) => item !== null)

        if (!bounds.isEmpty()) {
            map.fitBounds(bounds, 48)
            // A single pin would otherwise zoom in as far as the imagery goes
            google.maps.event.addListenerOnce(map, "idle", () => {
                if ((map.getZoom() ?? 0) > 19) map.setZoom(19)
            })
        }

        return () => drawn.forEach((item) => item.setMap(null))
    }, [map, boundary, overlaps])

    return null
}

// Draws one stored shape and widens the bounds to fit it; null for anything that isn't a valid Polygon or Point
function draw(
    map: google.maps.Map,
    value: unknown,
    colour: string,
    fillOpacity: number,
    bounds: google.maps.LatLngBounds
): google.maps.Polygon | google.maps.Circle | null {
    const shape = value as Shape | null

    if (shape?.type === "Polygon" && Array.isArray(shape.coordinates) && Array.isArray(shape.coordinates[0])) {
        const path = (shape.coordinates[0] as number[][]).map(([lng, lat]) => ({ lat, lng }))
        path.forEach((point) => bounds.extend(point))
        return new google.maps.Polygon({
            map,
            paths: path,
            strokeColor: colour,
            strokeWeight: 2,
            fillColor: colour,
            fillOpacity,
            clickable: false,
        })
    }

    if (shape?.type === "Point" && Array.isArray(shape.coordinates)) {
        const [lng, lat] = shape.coordinates as number[]
        bounds.extend({ lat, lng })
        // A small circle rather than a marker: markers need a map id, and a pin is only an approximate place
        return new google.maps.Circle({
            map,
            center: { lat, lng },
            radius: 15,
            strokeColor: colour,
            strokeWeight: 2,
            fillColor: colour,
            fillOpacity: 0.6,
            clickable: false,
        })
    }

    return null
}
