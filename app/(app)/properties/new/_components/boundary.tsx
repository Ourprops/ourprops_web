"use client"

import {
    APILoadingStatus,
    APIProvider,
    ControlPosition,
    Map,
    useApiLoadingStatus,
    useMap,
    useMapsLibrary,
} from "@vis.gl/react-google-maps"
import { ArrowRight, FileUp, Hand, MapPin, PenLine, RotateCcw, Trash2, Undo2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react"
import type { TerraDraw } from "terra-draw"

import { Button } from "@/components/ui/button"
import { boundaryToGeoJSON, fromPosition, polygonArea, ringToCorners, toAcres, toPlots } from "@/lib/geo"
import { MAX_GEOJSON_BYTES, parseBoundaryGeoJSON } from "@/lib/geojson-import"
import { useHandleSaveDraft } from "@/lib/queries/property"
import { cn } from "@/lib/utils"
import { boundarySchema, type Boundary as BoundaryValue, type BoundaryDraft } from "@/lib/validators/property"
import { useNewPropertyStore } from "@/stores/new-property-store"

import PlaceSearch from "./place-search"
import { useTerraDraw } from "./use-terra-draw"

/** How the user marks the property: drawing round its boundary, or dropping a pin when they don't know it */
type Method = "polygon" | "pin"

// All of Ghana, shown until there is somewhere more specific to start
const GHANA_CENTER = { lat: 7.95, lng: -1.03 }
const GHANA_ZOOM = 7
// Close enough to see a single plot
const PIN_ZOOM = 18
// Space kept round a boundary when the map is fitted to it, clear of the guide at the bottom
const BOUNDARY_PADDING = { top: 48, right: 48, bottom: 120, left: 48 }

const METHODS: { value: Method; title: string; description: string; icon: typeof PenLine }[] = [
    { value: "polygon", title: "Draw the boundary", description: "Tap each corner of the property", icon: PenLine },
    { value: "pin", title: "Drop a pin", description: "If you're not sure where the edges are", icon: MapPin },
]

type BoundaryProps = {
    /** Browser key for the Maps JavaScript API; the map is replaced by a message when it is missing */
    mapsApiKey: string
}

export default function Boundary({ mapsApiKey }: BoundaryProps) {
    const boundary = useNewPropertyStore((state) => state.boundary)
    const setBoundary = useNewPropertyStore((state) => state.setBoundary)
    const handleNext = useNewPropertyStore((state) => state.handleNext)
    const { mutate: saveDraft } = useHandleSaveDraft()

    // Drawing is the default; a draft saved with a pin reopens on the pin
    const [method, setMethod] = useState<Method>(boundary && "pin" in boundary ? "pin" : "polygon")
    // Whether a boundary is part drawn, so Continue can say how to finish it
    const [drawing, setDrawing] = useState(false)
    // The error only shows after the first attempt to continue
    const [submitted, setSubmitted] = useState(false)
    // Switching method keeps what was marked with the other one, so switching back restores it
    const kept = useRef<Partial<Record<Method, BoundaryValue>>>(boundary ? { [method]: boundary } : {})
    // Counts uploads, so the map shows and zooms to each uploaded boundary
    const [uploads, setUploads] = useState(0)
    const [upload, setUpload] = useState<{ message: string; failed: boolean } | null>(null)
    const fileInput = useRef<HTMLInputElement>(null)

    // Saved straight away rather than after a pause, as this only runs once the user finishes a change on the map
    const mark = useCallback(
        (next: BoundaryDraft) => {
            setBoundary(next)
            saveDraft()
        },
        [setBoundary, saveDraft],
    )

    function changeMethod(next: Method) {
        if (next === method) return
        if (boundary) kept.current[method] = boundary
        setMethod(next)
        setDrawing(false)
        mark(kept.current[next] ?? null)
    }

    async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        // Clear the input so choosing the same file again, after fixing it, still uploads it
        event.target.value = ""
        if (!file) return

        if (file.size > MAX_GEOJSON_BYTES) {
            setUpload({ message: "This file is too large. A boundary file should be under 5 MB.", failed: true })
            return
        }

        const result = parseBoundaryGeoJSON(await file.text())
        if (!result.ok) {
            setUpload({ message: result.error, failed: true })
            return
        }

        // A file with a point is shown as a pin, and one with a polygon as a boundary that can be adjusted
        const next = result.boundary
        const nextMethod: Method = "pin" in next ? "pin" : "polygon"
        if (boundary && nextMethod !== method) kept.current[method] = boundary
        kept.current[nextMethod] = next
        setMethod(nextMethod)
        setDrawing(false)
        mark(next)
        setUploads((count) => count + 1)
        setUpload({
            message:
                nextMethod === "pin"
                    ? `Added the pin from ${file.name}. Drag it if it needs moving.`
                    : `Added the boundary from ${file.name}. Drag a corner if it needs adjusting.`,
            failed: false,
        })
    }

    function handleMark(next: BoundaryDraft) {
        if (next) kept.current[method] = next
        else delete kept.current[method]
        mark(next)
    }

    function handleContinue() {
        setSubmitted(true)
        if (boundary) handleNext()
    }

    const error =
        submitted && !boundary
            ? drawing
                ? "Finish the boundary by tapping its first corner, or skip this step for now."
                : method === "polygon"
                  ? "Draw the boundary on the map, or skip this step for now."
                  : "Tap the map to drop a pin, or skip this step for now."
            : undefined

    return (
        <section className="mx-auto w-full max-w-3xl px-5 py-10 md:py-14">
            <h1 className="text-heading text-foreground md:text-2xl">Mark the property on the map</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-copy">
                Draw round its boundary so it&apos;s clear which land it is. Not sure where the edges are? Drop a pin
                instead, or skip this step and add it later.
            </p>

            <div role="group" aria-label="How to mark the property" className="mt-8 grid grid-cols-2 gap-3">
                {METHODS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={method === option.value}
                        onClick={() => changeMethod(option.value)}
                        className={cn(
                            "pressable flex items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors sm:p-3.5",
                            method === option.value
                                ? "border-primary ring-1 ring-primary"
                                : "border-border hover:border-primary/40",
                        )}
                    >
                        <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary sm:flex">
                            <option.icon size={18} aria-hidden />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-sm font-semibold text-foreground">{option.title}</span>
                            <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                                {option.description}
                            </span>
                        </span>
                    </button>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <span>Have a GeoJSON file from a surveyor or mapping app?</span>
                <input
                    ref={fileInput}
                    type="file"
                    accept=".geojson,.json,application/geo+json,application/json"
                    onChange={handleUpload}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                />
                <Button
                    type="button"
                    variant="link"
                    onClick={() => fileInput.current?.click()}
                    className="h-auto gap-1.5 p-0 text-sm font-semibold"
                >
                    <FileUp size={15} aria-hidden />
                    Upload it instead
                </Button>
            </div>
            {upload && (
                <p
                    role={upload.failed ? "alert" : "status"}
                    className={cn("mt-2 text-sm", upload.failed ? "font-medium text-destructive" : "text-copy")}
                >
                    {upload.message}
                </p>
            )}

            {mapsApiKey ? (
                <APIProvider apiKey={mapsApiKey} region="GH" language="en">
                    <BoundaryMap method={method} uploads={uploads} onMark={handleMark} onDrawingChange={setDrawing} />
                </APIProvider>
            ) : (
                <MapUnavailable />
            )}

            <BoundarySummary boundary={boundary} />

            {error && (
                <p role="alert" className="mt-4 text-sm font-medium text-destructive">
                    {error}
                </p>
            )}

            <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                {!boundary && (
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleNext}
                        className="pressable h-12 w-full rounded-lg px-6 text-[15px] text-primary hover:bg-card sm:w-auto"
                    >
                        Skip for now
                    </Button>
                )}
                <Button
                    type="button"
                    onClick={handleContinue}
                    className="pressable h-12 w-full rounded-lg bg-secondary px-8 text-[15px] text-secondary-foreground hover:bg-secondary/90 sm:w-auto"
                >
                    Continue
                    <ArrowRight size={16} aria-hidden />
                </Button>
            </div>
        </section>
    )
}

type BoundaryMapProps = {
    method: Method
    /** Goes up with each uploaded file, so the uploaded boundary is shown and zoomed to */
    uploads: number
    /** Called when the user finishes a change on the map, with what is now marked */
    onMark: (boundary: BoundaryDraft) => void
    onDrawingChange: (drawing: boolean) => void
}

function BoundaryMap({ method, uploads, onMark, onDrawingChange }: BoundaryMapProps) {
    const status = useApiLoadingStatus()
    const map = useMap()
    const geocoding = useMapsLibrary("geocoding")
    const draw = useTerraDraw()
    const marked = useNewPropertyStore((state) => state.boundary !== null)
    const [drawing, setDrawing] = useState(false)
    // While a drawn boundary is being edited it stays selected, so its corners can always be dragged
    const editing = useRef<string | number | null>(null)

    // Shows what is marked for this method and gets ready for the user to draw
    const showBoundary = useCallback(
        (instance: TerraDraw) => {
            const boundary = useNewPropertyStore.getState().boundary
            editing.current = null
            instance.clear()

            if (boundary && "polygon" in boundary && method === "polygon") {
                const [added] = instance.addFeatures([
                    { type: "Feature", geometry: boundaryToGeoJSON(boundary), properties: { mode: "polygon" } },
                ])
                instance.setMode("select")
                if (added?.valid && added.id !== undefined) {
                    editing.current = added.id
                    instance.selectFeature(added.id)
                }
                return
            }

            instance.setMode(method === "polygon" ? "polygon" : "point")
            if (boundary && "pin" in boundary && method === "pin") {
                instance.addFeatures([{ type: "Feature", geometry: boundaryToGeoJSON(boundary), properties: { mode: "point" } }])
            }
        },
        [method],
    )

    // Changing mode drops a part-drawn boundary, which updates `drawing` through the change event below
    useEffect(() => {
        if (draw) showBoundary(draw)
    }, [draw, showBoundary, uploads])

    useEffect(() => {
        const { boundary } = useNewPropertyStore.getState()
        if (map && uploads && boundary) fitToBoundary(map, boundary)
    }, [map, uploads])

    useEffect(() => {
        onDrawingChange(drawing)
    }, [drawing, onDrawingChange])

    useEffect(() => {
        if (!draw) return

        function handleFinish(id: string | number) {
            const feature = draw!.getSnapshotFeature(id)
            if (!feature) return

            if (feature.geometry.type === "Polygon") {
                // A boundary adjusted on the map counts as drawn, even if it started as an uploaded file
                const result = boundarySchema.safeParse({
                    polygon: ringToCorners(feature.geometry.coordinates[0]),
                    source: "manual_draw",
                })
                // terra-draw stops corners being placed where the boundary would cross itself, so this rarely fails
                if (!result.success) return
                onMark(result.data)
                if (editing.current !== id) {
                    // A newly drawn boundary is selected so its corners can be adjusted
                    editing.current = id
                    draw!.setMode("select")
                    draw!.selectFeature(id)
                }
            } else if (feature.geometry.type === "Point") {
                // There is one pin, so dropping another moves it
                const others = draw!
                    .getSnapshot()
                    .filter((other) => other.id !== id && other.properties.mode === "point")
                    .map((other) => other.id!)
                if (others.length) draw!.removeFeatures(others)
                onMark({ pin: fromPosition(feature.geometry.coordinates), source: "manual_draw" })
            }
        }

        function handleChange() {
            setDrawing(draw!.getModeState() === "drawing")
        }

        function handleDeselect(id: string | number) {
            // Tapping away from the boundary would hide its corners; keep them showing
            if (id === editing.current && draw!.hasFeature(id)) draw!.selectFeature(id)
        }

        draw.on("finish", handleFinish)
        draw.on("change", handleChange)
        draw.on("deselect", handleDeselect)
        return () => {
            draw.off("finish", handleFinish)
            draw.off("change", handleChange)
            draw.off("deselect", handleDeselect)
        }
    }, [draw, onMark])

    // Start on what was marked before or, failing that, the area entered on the previous screen
    const centred = useRef(false)
    useEffect(() => {
        if (!map || centred.current) return
        const { boundary, location } = useNewPropertyStore.getState()

        if (boundary) {
            centred.current = true
            fitToBoundary(map, boundary)
            return
        }

        if (!geocoding) return
        centred.current = true
        const address = [location.address, location.city, location.municipality, location.region, "Ghana"]
            .filter(Boolean)
            .join(", ")
        new geocoding.Geocoder()
            .geocode({ address, region: "gh" })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((response: { results: any[] }) => {
                const { results } = response;
                const viewport = results[0]?.geometry.viewport
                if (viewport) map.fitBounds(viewport)
            })
            // The map stays on all of Ghana and the user can search instead
            .catch(() => {})
    }, [map, geocoding])

    function handleClear() {
        onMark(null)
        if (draw) showBoundary(draw)
    }

    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
        return <MapUnavailable />
    }

    return (
        <div className="mt-6 flex flex-col gap-3">
            <PlaceSearch />

            <div className="relative h-[min(62vh,560px)] min-h-80 overflow-hidden rounded-xl border border-border bg-card">
                <Map
                    defaultCenter={GHANA_CENTER}
                    defaultZoom={GHANA_ZOOM}
                    // Satellite imagery with road and place names, so walls, fences and plots can be traced
                    mapTypeId="hybrid"
                    gestureHandling="greedy"
                    disableDefaultUI
                    zoomControl
                    zoomControlOptions={{ position: ControlPosition.RIGHT_TOP }}
                    mapTypeControl
                    mapTypeControlOptions={{ position: ControlPosition.LEFT_TOP }}
                    // Taps are for drawing, not opening businesses and landmarks
                    clickableIcons={false}
                    className="size-full"
                />

                <MapGuide
                    method={method}
                    marked={marked}
                    drawing={drawing}
                    ready={!!draw}
                    onUndo={() => draw?.undo()}
                    onClear={handleClear}
                />
            </div>
        </div>
    )
}

type MapGuideProps = {
    method: Method
    marked: boolean
    drawing: boolean
    ready: boolean
    onUndo: () => void
    onClear: () => void
}

// Tells the user what to do next on the map, with the action that fits
function MapGuide({ method, marked, drawing, ready, onUndo, onClear }: MapGuideProps) {
    let message: string
    let action: { label: string; icon: typeof Undo2; onClick: () => void } | null = null

    if (!ready) {
        message = "Loading the map…"
    } else if (method === "polygon") {
        if (drawing) {
            message = "Keep tapping corners. Tap the first corner again to finish."
            action = { label: "Undo corner", icon: Undo2, onClick: onUndo }
        } else if (marked) {
            message = "Drag a corner to adjust it, or drag a midpoint to add a corner."
            action = { label: "Redraw", icon: RotateCcw, onClick: onClear }
        } else {
            message = "Find the property, then tap the map at each corner of it."
        }
    } else if (marked) {
        message = "Drag the pin, or tap somewhere else to move it."
        action = { label: "Remove pin", icon: Trash2, onClick: onClear }
    } else {
        message = "Find the property, then tap the map where it is."
    }

    return (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
            <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg border border-border bg-card/95 py-2 pr-2 pl-3.5 shadow-lg backdrop-blur">
                <Hand size={16} aria-hidden className="shrink-0 text-primary" />
                <p aria-live="polite" className="min-w-0 flex-1 py-1.5 text-sm leading-snug text-foreground">
                    {message}
                </p>
                {action && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={action.onClick}
                        className="pressable h-9 shrink-0 rounded-lg px-3 text-sm"
                    >
                        <action.icon size={15} aria-hidden />
                        {action.label}
                    </Button>
                )}
            </div>
        </div>
    )
}

const wholeNumber = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 })
const oneDecimal = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 })
const twoDecimals = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 })

// The area of the drawn boundary, or where the pin is
function BoundarySummary({ boundary }: { boundary: BoundaryDraft }) {
    if (!boundary) return null

    if ("pin" in boundary) {
        return (
            <p role="status" className="mt-3 text-sm text-copy">
                <span className="font-medium text-foreground">
                    {boundary.source === "geojson_import" ? "Pin from your file" : "Pin dropped"}
                </span>{" "}
                at {boundary.pin.latitude.toFixed(6)},{" "}
                {boundary.pin.longitude.toFixed(6)}
            </p>
        )
    }

    const area = polygonArea(boundary.polygon)
    return (
        <dl role="status" className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-copy">
            <div className="flex gap-1.5">
                <dt className="font-medium text-foreground">Area</dt>
                <dd>{wholeNumber.format(area)} m²</dd>
            </div>
            <div className="flex gap-1.5">
                <dt className="sr-only">In acres</dt>
                <dd>{twoDecimals.format(toAcres(area))} acres</dd>
            </div>
            <div className="flex gap-1.5">
                <dt className="sr-only">In plots</dt>
                <dd>about {oneDecimal.format(toPlots(area))} plots (70 × 100 ft)</dd>
            </div>
            {boundary.source === "geojson_import" && (
                <div className="flex gap-1.5">
                    <dt className="sr-only">Source</dt>
                    <dd>from your file</dd>
                </div>
            )}
        </dl>
    )
}

function MapUnavailable() {
    return (
        <div className="mt-6 flex min-h-60 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <MapPin size={22} aria-hidden className="text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">The map couldn&apos;t load</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                You can skip this step for now and mark the property when you come back to this draft.
            </p>
        </div>
    )
}

function fitToBoundary(map: google.maps.Map, boundary: BoundaryValue) {
    if ("pin" in boundary) {
        map.setCenter({ lat: boundary.pin.latitude, lng: boundary.pin.longitude })
        map.setZoom(PIN_ZOOM)
        return
    }

    const bounds = new google.maps.LatLngBounds()
    for (const corner of boundary.polygon) bounds.extend({ lat: corner.latitude, lng: corner.longitude })
    map.fitBounds(bounds, BOUNDARY_PADDING)
}
