"use client"

import { APILoadingStatus, APIProvider, ControlPosition, Map, useApiLoadingStatus, useMap } from "@vis.gl/react-google-maps"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { MAP_STATUS, mapStatus, type DashboardPoint } from "@/lib/admin/dashboard"

const GHANA_CENTER = { lat: 7.95, lng: -1.03 }
const GHANA_ZOOM = 6

// Each status has a colour and a shape: green and amber are close for some colour-blind readers (the dataviz palette
// check measured 6.3), so the shape tells them apart too. Paths are in marker units, scaled below.
const SHAPES = {
    circle: null,
    square: "M -1 -1 L 1 -1 L 1 1 L -1 1 Z",
    diamond: "M 0 -1.35 L 1.35 0 L 0 1.35 L -1.35 0 Z",
} as const

// Every property out of draft, where it is, by status. Hover for its name; click to open its review.
export function PropertyMap({ apiKey, points }: { apiKey: string; points: DashboardPoint[] }) {
    return (
        <APIProvider apiKey={apiKey} region="GH" language="en">
            <MapOrMessage points={points} />
        </APIProvider>
    )
}

function MapOrMessage({ points }: { points: DashboardPoint[] }) {
    const status = useApiLoadingStatus()
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
        return <p className="text-sm text-muted-foreground">The map couldn&apos;t load.</p>
    }

    return (
        <div className="h-80 overflow-hidden rounded-xl border border-border sm:h-[26rem]">
            <Map
                defaultCenter={GHANA_CENTER}
                defaultZoom={GHANA_ZOOM}
                gestureHandling="cooperative"
                disableDefaultUI
                zoomControl
                mapTypeControl
                mapTypeControlOptions={{ position: ControlPosition.TOP_LEFT }}
                zoomControlOptions={{ position: ControlPosition.RIGHT_TOP }}
                clickableIcons={false}
                className="size-full"
            />
            <Pins points={points} />
        </div>
    )
}

function Pins({ points }: { points: DashboardPoint[] }) {
    const map = useMap()
    const router = useRouter()

    useEffect(() => {
        if (!map || !window.google) return
        const markers = points.map((point) => {
            const { colour, shape, label } = MAP_STATUS[mapStatus(point.status)]
            const marker = new google.maps.Marker({
                map,
                position: { lat: point.lat, lng: point.lng },
                // the name on hover, as a native tooltip; the status in words too, so colour is never alone
                title: `${point.name ?? "Untitled property"}: ${label}`,
                icon: {
                    path: SHAPES[shape] ?? google.maps.SymbolPath.CIRCLE,
                    scale: SHAPES[shape] ? 6 : 7,
                    fillColor: colour,
                    fillOpacity: 1,
                    // a ring in white, so pins stay legible on the map and where they overlap
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                },
            })
            marker.addListener("click", () => router.push(`/admin/properties/${point.id}`))
            return marker
        })

        // Frame the pins, or keep all of Ghana in view when there are none
        if (points.length === 1) {
            map.setCenter({ lat: points[0].lat, lng: points[0].lng })
            map.setZoom(13)
        } else if (points.length > 1) {
            const bounds = new google.maps.LatLngBounds()
            for (const point of points) bounds.extend({ lat: point.lat, lng: point.lng })
            map.fitBounds(bounds, 48)
        }

        return () => markers.forEach((marker) => marker.setMap(null))
    }, [map, points, router])

    return null
}
