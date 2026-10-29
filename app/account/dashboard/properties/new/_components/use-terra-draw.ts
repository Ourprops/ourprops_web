import { useMap } from "@vis.gl/react-google-maps"
import { useEffect, useState } from "react"
import {
    TerraDraw,
    TerraDrawModeUndoRedo,
    TerraDrawPointMode,
    TerraDrawPolygonMode,
    TerraDrawSelectMode,
    ValidateNotSelfIntersecting,
    type HexColor,
} from "terra-draw"
import { TerraDrawGoogleMapsAdapter } from "terra-draw-google-maps-adapter"

// The app's orange accent (--secondary), which stands out on satellite imagery
const MARK_COLOR: HexColor = "#FF6B35"
const HANDLE_COLOR: HexColor = "#FFFFFF"

function createModes() {
    return [
        // Used once a boundary is drawn, so its corners can be dragged, added (from the midpoints) or removed
        new TerraDrawSelectMode({
            flags: {
                polygon: {
                    feature: {
                        selfIntersectable: false,
                        coordinates: { midpoints: true, draggable: true, deletable: true },
                    },
                },
            },
            styles: {
                selectedPolygonColor: MARK_COLOR,
                selectedPolygonFillOpacity: 0.2,
                selectedPolygonOutlineColor: MARK_COLOR,
                selectedPolygonOutlineWidth: 3,
                selectionPointColor: HANDLE_COLOR,
                selectionPointOutlineColor: MARK_COLOR,
                selectionPointWidth: 7,
                selectionPointOutlineWidth: 3,
                midPointColor: MARK_COLOR,
                midPointOutlineColor: HANDLE_COLOR,
                midPointWidth: 4,
                midPointOutlineWidth: 2,
            },
        }),
        new TerraDrawPolygonMode({
            // A corner that would make the boundary cross itself isn't placed
            validation: (feature, { updateType }) =>
                updateType === "provisional" ? { valid: true } : ValidateNotSelfIntersecting(feature),
            styles: {
                fillColor: MARK_COLOR,
                fillOpacity: 0.2,
                outlineColor: MARK_COLOR,
                outlineWidth: 3,
                closingPointColor: HANDLE_COLOR,
                closingPointOutlineColor: MARK_COLOR,
                closingPointWidth: 7,
                closingPointOutlineWidth: 3,
            },
        }),
        new TerraDrawPointMode({
            editable: true,
            styles: {
                pointColor: MARK_COLOR,
                pointWidth: 9,
                pointOutlineColor: HANDLE_COLOR,
                pointOutlineWidth: 3,
                editedPointColor: MARK_COLOR,
                editedPointWidth: 11,
                editedPointOutlineColor: HANDLE_COLOR,
                editedPointOutlineWidth: 3,
            },
        }),
    ]
}

/**
 * Starts terra-draw on the map, following the react-google-maps terra-draw example.
 * Returns null until it is ready to draw on.
 */
export function useTerraDraw() {
    const map = useMap()
    const [draw, setDraw] = useState<TerraDraw | null>(null)

    useEffect(() => {
        if (!map) return

        let instance: TerraDraw | null = null
        let listener: google.maps.MapsEventListener | null = null

        const start = () => {
            instance = new TerraDraw({
                adapter: new TerraDrawGoogleMapsAdapter({ map, lib: google.maps, coordinatePrecision: 9 }),
                modes: createModes(),
                // Lets the user take back the last corner while drawing
                undoRedo: { modeLevel: new TerraDrawModeUndoRedo() },
            })
            // Features can be added once the drawing layer is on the map
            const ready = instance
            ready.on("ready", () => setDraw(ready))
            ready.start()
        }

        if (map.getProjection()) {
            start()
        } else {
            // terra-draw needs the map's projection before it can attach
            listener = map.addListener("projection_changed", () => {
                if (!map.getProjection() || instance) return
                listener?.remove()
                start()
            })
        }

        return () => {
            listener?.remove()
            instance?.stop()
            setDraw(null)
        }
    }, [map])

    return draw
}
