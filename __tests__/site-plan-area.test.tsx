import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { SitePlanArea } from "@/app/admin/properties/[id]/site-plan-area"
import { describeRecordArea } from "@/lib/public-record"
import { AREA_MISMATCH_WARNING, areaDifference, toSquareMetres } from "@/lib/site-plan-area"
import { sitePlanAreaSchema } from "@/lib/validators/admin"

afterEach(cleanup)

const propertyId = "aaaaaaaa-0000-4000-8000-000000000001"

describe("site plan units", () => {
  it("convert what the plan says into square metres", () => {
    expect(toSquareMetres(1, "acres")).toBeCloseTo(4046.86, 2)
    expect(toSquareMetres(0.5, "hectares")).toBe(5000)
    expect(toSquareMetres(7000, "sq_ft")).toBeCloseTo(650.32, 2)
    expect(toSquareMetres(1200, "sq_m")).toBe(1200)
  })

  it("measure the owner's drawing against the site plan, either way round", () => {
    expect(areaDifference(1000, 1120)).toBeCloseTo(0.12)
    expect(areaDifference(1000, 880)).toBeCloseTo(0.12)
    expect(areaDifference(1000, 1050) > AREA_MISMATCH_WARNING).toBe(false)
  })
})

describe("the admin's site plan area form", () => {
  it("stores square metres, whatever unit the plan uses", () => {
    expect(sitePlanAreaSchema.parse({ propertyId, value: "0.25", unit: "acres" })).toEqual({ propertyId, areaSqm: 1011.71 })
  })

  it("refuses an empty, zero or negative area, an unknown unit, and an impossible size", () => {
    for (const value of ["", "0", "-5", "abc", null]) {
      expect(sitePlanAreaSchema.safeParse({ propertyId, value, unit: "sq_m" }).success).toBe(false)
    }
    expect(sitePlanAreaSchema.safeParse({ propertyId, value: "100", unit: "plots" }).success).toBe(false)
    expect(sitePlanAreaSchema.safeParse({ propertyId, value: "1e12", unit: "sq_m" }).success).toBe(false)
    expect(sitePlanAreaSchema.safeParse({ propertyId: "not-a-uuid", value: "100", unit: "sq_m" }).success).toBe(false)
  })
})

describe("the area on the public record", () => {
  it("says it was checked when it comes from the site plan", () => {
    expect(describeRecordArea({ area_sqm: 1200, area_source: "site_plan" })).toEqual({
      text: "1,200 m² (about 0.30 acres)",
      source: "from the site plan, checked by OurProps",
      checked: true,
    })
  })

  it("says it's the owner's unchecked sketch otherwise, and approximate", () => {
    expect(describeRecordArea({ area_sqm: 1240, area_source: "owner_map" })).toMatchObject({
      text: "About 1,240 m² (about 0.31 acres)",
      source: "drawn on a map by the owner, not checked",
      checked: false,
    })
  })

  it("shows nothing when there's no area", () => {
    expect(describeRecordArea({ area_sqm: null, area_source: null })).toBeNull()
  })
})

describe("the site plan area at the survey check", () => {
  const action = vi.fn(async () => null)

  it("asks for the area before the check can be verified", () => {
    render(<SitePlanArea sitePlanAreaSqm={null} drawnAreaSqm={1240} editable action={action} />)
    expect(screen.getByText("Not recorded yet. Needed before you verify this check.")).toBeTruthy()
    expect(screen.getByText("Record the site plan area")).toBeTruthy()
  })

  it("warns when the owner's drawing is more than 10% off the site plan", () => {
    render(<SitePlanArea sitePlanAreaSqm={1000} drawnAreaSqm={1240} editable={false} action={action} />)
    expect(screen.getByText(/The drawing is 24% off the site plan/)).toBeTruthy()
    // not in review: nothing to change
    expect(screen.queryByText("Change it")).toBeNull()
  })

  it("is calm when they agree", () => {
    render(<SitePlanArea sitePlanAreaSqm={1000} drawnAreaSqm={1030} editable action={action} />)
    expect(screen.getByText("The drawing is within 3% of the site plan.")).toBeTruthy()
  })
})
