# Proposal: verified boundaries from site plans

> **Status:** Proposal for discussion with the PM. Not planned work.
>
> **Date:** 2026-11-11
>
> **Owner:** Joel (tech lead)
>
> **Decision needed:** whether this goes on the post-MVP roadmap, and when to start collecting test site plans.

## Summary

Every property on OurProps has a **boundary**, the shape of the plot on the map. Today that shape is whatever the owner drew on a satellite image. It's a useful sketch, but it's often 10 to 20% out, and our overlap check, map and area figures all rely on it.

On 2026-11-11 we shipped a first safeguard. Admins now record the **area** stated on the site plan, and the public record shows that checked figure instead of the owner's sketch. This proposal is the second step: replacing the owner's drawn **shape** with the surveyor's corner points from the site plan, so the boundary itself is verified.

**Recommendation:** add it to the roadmap as a post-MVP item. It isn't needed to launch, but it's what makes the "No overlapping claims" check strong. Start collecting real site plans now, so we can test the conversion when we build it.

## The problem

A plot can be described in two ways:

| | What it is | Where it comes from today | Checked? |
|---|---|---|---|
| **Area** | One number, like 1,100 m² | The site plan, recorded by an admin (new) | Yes, at the "Survey records" check |
| **Shape** | The corner points on the map | Drawn by the owner on a satellite image | No |

The shape matters most, because it drives:

- **The overlap check.** OurProps automatically compares each boundary against every other property to catch double sales. If an owner's drawing is 15 metres off, we can miss a real overlap or wrongly flag an innocent neighbour.
- **The map** that admins and owners see.
- **The calculated area** we compare against the site plan.

Getting the area right doesn't fix the shape: two plots can have the same area and still sit in different places.

## What's already done (shipped 2026-11-11)

- **Admins record the site plan's area** during review. They can enter it in square metres, acres, hectares or square feet.
- **The "Survey records" check can't be marked verified** until that area is recorded.
- **The console warns the admin** when the owner's drawing differs from the site plan by more than 10%, and suggests asking the owner to redraw it.
- **The public record states where its area comes from.** It says "from the site plan, checked by OurProps" or "drawn on a map by the owner, not checked". A sketch is never presented as a survey.

This closes the most visible risk: a buyer trusting a hand-drawn number. It doesn't make the overlap check any more precise.

## The proposal

Let admins replace the owner's sketch with the surveyor's corner points from the site plan:

1. The admin types the corner coordinates from the site plan and chooses which coordinate system the plan uses.
2. OurProps converts them to map coordinates.
3. The console draws the converted shape on top of the owner's drawing, so the admin can see whether they match.
4. When the admin accepts it, it becomes the property's **verified boundary**. We keep the owner's original drawing for the record, and the overlap check runs again on the verified shape.
5. The public record and the owner's page say the boundary is "from the site plan, checked by OurProps".

## Why this isn't a quick change

Most Ghanaian site plans give corner positions in the **Ghana National Grid**, not in the latitude and longitude our map (and GPS, and Google Maps) uses. For example:

- **Site plan:** `E 1,183,450 ft, N 362,120 ft` (grid "eastings and northings", in feet on older plans or metres on newer ones)
- **Our map:** `5.6037° N, 0.1870° W` (degrees)

Converting between them involves two things:

1. **Flat to round.** The grid flattens Ghana onto a sheet of paper, so standard map-projection maths is needed to turn grid numbers back into positions on the globe.
2. **A different model of the earth.** The grid is based on an older survey of Ghana (the "Accra datum"), which places points differently from GPS. If the conversion doesn't correct for this, every corner lands far off, possibly by hundreds of metres. That's enough to put a plot on the wrong street.

There are well-tested open-source libraries for this, so the maths itself isn't the hard part. The work is in:

- **Proving it's accurate.** We need to check converted plots against known locations and aim for an error of a few metres. That needs real site plans, ideally checked with a surveyor.
- **Handling the variety of site plans.** Some list corner coordinates. Older ones give only bearings and distances ("N 45° E, 100 ft") from a starting point, which have to be walked out step by step. Some are hard to read.
- **Getting the admin workflow right.** Entering corners, seeing the comparison, and deciding what happens when the two shapes disagree.

## Options

| Option | What it is | Pros | Cons |
|---|---|---|---|
| **A. Keep today's safeguard only** | Area check plus honest labelling (shipped) | No more work | The overlap check stays as good as owners' drawings |
| **B. Verified boundaries from coordinates** (recommended, post-MVP) | Admins enter the site plan's corner coordinates; we convert and compare | A properly checked shape; a strong overlap check; a real advantage over competitors | Needs test site plans and surveyor input; a meaningful piece of work |
| **C. B, plus bearings and distances** | Also supports older plans without coordinates | Covers more plans | More complex; best as a later step after B |
| **D. Partner with a surveyor or the Lands Commission for digital boundaries** | Get verified shapes from an official or professional source | Most authoritative | Depends on partnerships and their data |

## What we need from the PM

1. **Roadmap decision:** is option B a post-MVP item, and roughly when?
2. **Test material:** can we collect 5 to 10 real site plans (with owners' permission) from different areas and eras: Accra, Kumasi, Kasoa; old and new plans; in feet and in metres?
3. **Surveyor input:** do we have, or can we find, a licensed surveyor who could review our conversion results and advise on edge cases?
4. **Product wording:** how the public record should present a verified boundary, and what happens to a property already verified with only an owner-drawn boundary (re-check on next review, or leave as is?).

## Risks

- **A wrong conversion looks convincing.** A plot shown in the wrong place but labelled "checked by OurProps" would be worse than an honest sketch. That's why accuracy testing with real plans and a surveyor comes before launch.
- **Admin error when typing coordinates.** The side-by-side comparison with the owner's drawing and a mismatch warning reduce this, but a second admin's check may be needed for large discrepancies.
- **Scope creep into surveying.** OurProps checks the evidence; it doesn't survey land. The feature should present the result as "matches the site plan", not as an official survey or a guarantee of title.

## Technical notes (for engineering)

- **Coordinate systems.** Candidate reference codes are EPSG:2136 (Accra / Ghana National Grid, feet) and EPSG:25000 (Leigon / Ghana Metre Grid). Confirm these, and the datum transformation parameters, against real plans before relying on them.
- **Conversion.** `proj4` (JavaScript) or PostGIS `ST_Transform` with a custom transformation can do it.
- **Storing the result.** Keep the owner's drawing, and store the verified boundary separately with its source and who verified it. The overlap check would use the verified boundary when there is one.
- **Today's code:**
  - `properties.site_plan_area_sqm` and `record_site_plan_area()` in migration `20261111120000_site_plan_area.sql`
  - `area_source` on `public_property_record()`
  - the "Survey records" panel in the admin console (`app/admin/properties/[id]/site-plan-area.tsx`)
