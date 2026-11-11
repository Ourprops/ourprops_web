// The area a site plan states, in the units site plans in Ghana use, and how it compares with the owner's drawing.
// The database stores square metres (properties.site_plan_area_sqm); admins type what the plan says.

export const AREA_UNITS = {
    sq_m: { label: "Square metres (m²)", squareMetres: 1 },
    acres: { label: "Acres", squareMetres: 4046.8564224 },
    hectares: { label: "Hectares", squareMetres: 10000 },
    sq_ft: { label: "Square feet", squareMetres: 0.09290304 },
} as const

export type AreaUnit = keyof typeof AREA_UNITS

export const AREA_UNIT_KEYS = Object.keys(AREA_UNITS) as AreaUnit[]

/** Above this difference between the site plan and the owner's drawing, the console warns the admin */
export const AREA_MISMATCH_WARNING = 0.1

export function toSquareMetres(value: number, unit: AreaUnit) {
    return value * AREA_UNITS[unit].squareMetres
}

/** How far the owner's drawing is from the site plan, as a share of the site plan's area (0.12 = 12%) */
export function areaDifference(sitePlanSqm: number, drawnSqm: number) {
    return Math.abs(drawnSqm - sitePlanSqm) / sitePlanSqm
}
