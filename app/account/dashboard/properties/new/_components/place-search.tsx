"use client"

import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps"
import { MapPin, Search } from "lucide-react"
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

// How long the user must pause typing before places are looked up
const SEARCH_DELAY_MS = 250
// Close enough to see a single plot
const PLACE_ZOOM = 18

/** Finds a place in Ghana and moves the map to it */
export default function PlaceSearch() {
    const map = useMap()
    const places = useMapsLibrary("places")
    const listId = useId()

    const [query, setQuery] = useState("")
    const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([])
    const [active, setActive] = useState(-1)
    const [open, setOpen] = useState(false)
    const [failed, setFailed] = useState(false)
    // One token covers the lookups and the place picked from them, so they are billed as a single search
    const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

    useEffect(() => {
        const input = query.trim()
        if (!places || !input) return

        let cancelled = false
        const timeout = setTimeout(async () => {
            sessionToken.current ??= new places.AutocompleteSessionToken()
            try {
                const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                    input,
                    sessionToken: sessionToken.current,
                    includedRegionCodes: ["gh"],
                    // Prefer places near where the user is already looking
                    locationBias: map?.getBounds() ?? undefined,
                })
                if (cancelled) return
                setSuggestions(suggestions.flatMap((suggestion) => (suggestion.placePrediction ? [suggestion.placePrediction] : [])))
                setActive(-1)
                setFailed(false)
            } catch {
                if (!cancelled) setFailed(true)
            }
        }, SEARCH_DELAY_MS)

        return () => {
            cancelled = true
            clearTimeout(timeout)
        }
    }, [query, places, map])

    async function choose(prediction: google.maps.places.PlacePrediction) {
        setQuery(prediction.text.text)
        setOpen(false)
        setSuggestions([])

        const place = prediction.toPlace()
        sessionToken.current = null
        try {
            await place.fetchFields({ fields: ["location", "viewport"] })
        } catch {
            setFailed(true)
            return
        }
        if (!map) return

        // Zoom in to plot level, even when the place is a whole town
        if (place.location) {
            map.setCenter(place.location)
            map.setZoom(PLACE_ZOOM)
        } else if (place.viewport) {
            map.fitBounds(place.viewport)
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (!suggestions.length) return
            event.preventDefault()
            setOpen(true)
            const step = event.key === "ArrowDown" ? 1 : -1
            setActive((current) => (current + step + suggestions.length) % suggestions.length)
        } else if (event.key === "Enter") {
            // Enter picks the highlighted place, or the top one
            const prediction = suggestions[active] ?? suggestions[0]
            if (!prediction || !query.trim()) return
            event.preventDefault()
            choose(prediction)
        } else if (event.key === "Escape") {
            setOpen(false)
        }
    }

    // Suggestions for an earlier query are hidden once the input is cleared
    const expanded = open && query.trim() !== "" && suggestions.length > 0

    return (
        <div className="relative">
            <label htmlFor={`${listId}-input`} className="sr-only">
                Search for a place
            </label>
            <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
                id={`${listId}-input`}
                type="search"
                role="combobox"
                aria-expanded={expanded}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
                value={query}
                onChange={(event) => {
                    setQuery(event.target.value)
                    setOpen(true)
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={handleKeyDown}
                placeholder="Search for an area, street or landmark"
                autoComplete="off"
                disabled={!places}
                className="h-11 bg-card pl-10"
            />

            {expanded && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label="Places"
                    className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg"
                >
                    {suggestions.map((prediction, index) => (
                        <li
                            key={prediction.placeId}
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={index === active}
                            // Keep focus in the input, so the list isn't closed before the click lands
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => choose(prediction)}
                            className={cn(
                                "flex cursor-pointer items-start gap-2.5 rounded-md px-3 py-2.5 text-sm",
                                index === active ? "bg-background" : "hover:bg-background",
                            )}
                        >
                            <MapPin size={16} aria-hidden className="mt-0.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0">
                                <span className="block truncate font-medium text-foreground">{prediction.mainText?.text ?? prediction.text.text}</span>
                                {prediction.secondaryText && (
                                    <span className="block truncate text-muted-foreground">{prediction.secondaryText.text}</span>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            {failed && (
                <p role="status" className="mt-1.5 text-sm text-muted-foreground">
                    Search isn&apos;t working right now. You can still move the map to find the property.
                </p>
            )}
        </div>
    )
}
