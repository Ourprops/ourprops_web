"use client"

import { useEffect } from "react"

import type { SavedDraft } from "@/lib/validators/property"
import { useNewPropertyStore } from "@/stores/new-property-store"

import Acquisition from "./acquisition"
import Boundary from "./boundary"
import Details from "./details"
import Location from "./location"
import StartScreen from "./start-screen"

type NewPropertyFlowProps = {
    /** The draft named in the URL, or null when registering a new property */
    draft: SavedDraft | null
    /** Key for the map on the boundary screen */
    mapsApiKey: string
}

export default function NewPropertyFlow({ draft, mapsApiKey }: NewPropertyFlowProps) {
    const screen = useNewPropertyStore((state) => state.screen)

    // The store outlives the page, so on arrival either resume the draft in the URL
    // or clear a draft left over from an earlier visit
    useEffect(() => {
        const { propertyId, loadDraft, reset } = useNewPropertyStore.getState()
        if (draft) {
            if (propertyId !== draft.id) loadDraft(draft)
        } else if (propertyId) {
            reset()
        }
    }, [draft])

    return (
        <main className="flex-1">
            {screen === "start" && <StartScreen />}
            {screen === "details" && <Details />}
            {screen === "location" && <Location />}
            {screen === "boundary" && <Boundary mapsApiKey={mapsApiKey} />}
            {screen === "acquisition" && <Acquisition />}
        </main>
    )
}
