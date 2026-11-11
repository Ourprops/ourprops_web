import { CircleAlert } from "lucide-react"

import { ActionForm } from "@/components/action-form"
import { Input } from "@/components/ui/input"
import type { ActionState } from "@/lib/action-errors"
import { describeArea } from "@/lib/public-record"
import { AREA_MISMATCH_WARNING, AREA_UNITS, AREA_UNIT_KEYS, areaDifference } from "@/lib/site-plan-area"
import { cn } from "@/lib/utils"

import { ChoiceField, FormField } from "./fields"

type Props = {
    sitePlanAreaSqm: number | null
    // the area of the boundary the owner drew, if they drew one (a pin has none)
    drawnAreaSqm: number | null
    editable: boolean
    // recordSitePlanArea with the property bound by the page
    action: (previous: ActionState, formData: FormData) => Promise<ActionState>
}

// At the survey records check: what the site plan says the area is, the owner's drawing beside it, and how far apart
// they are. Recording it is what lets the check be verified, and the public record then shows this area as checked.
export function SitePlanArea({ sitePlanAreaSqm, drawnAreaSqm, editable, action }: Props) {
    const difference = sitePlanAreaSqm !== null && drawnAreaSqm ? areaDifference(sitePlanAreaSqm, drawnAreaSqm) : null
    const mismatch = difference !== null && difference > AREA_MISMATCH_WARNING

    return (
        <div className="mt-2 grid gap-2 rounded-lg bg-muted/50 p-3 text-sm">
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
                <dt className="text-muted-foreground">Site plan</dt>
                <dd className={sitePlanAreaSqm === null ? "text-copy" : "font-medium"}>
                    {sitePlanAreaSqm === null ? "Not recorded yet. Needed before you verify this check." : describeArea(sitePlanAreaSqm)}
                </dd>
                <dt className="text-muted-foreground">Owner&apos;s drawing</dt>
                <dd>{drawnAreaSqm ? describeArea(drawnAreaSqm) : "No boundary drawn"}</dd>
            </dl>

            {difference !== null ? (
                <p className={cn("flex items-start gap-1.5", mismatch ? "font-medium text-warning" : "text-copy")}>
                    {mismatch ? <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden /> : null}
                    {mismatch
                        ? `The drawing is ${Math.round(difference * 100)}% off the site plan. Check the boundary against the plan before verifying, and ask the owner to redraw it if it's wrong.`
                        : `The drawing is within ${Math.max(1, Math.round(difference * 100))}% of the site plan.`}
                </p>
            ) : null}

            {editable ? (
                <details>
                    <summary className="cursor-pointer text-primary">{sitePlanAreaSqm === null ? "Record the site plan area" : "Change it"}</summary>
                    <ActionForm action={action} submitLabel="Save area" className="mt-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <FormField id="site-plan-area" label="Area on the site plan" hint="As written on the plan">
                                <Input id="site-plan-area" name="area" aria-describedby="site-plan-area-hint" type="number" inputMode="decimal" min="0" step="any" required className="h-10 bg-card" />
                            </FormField>
                            <ChoiceField
                                id="site-plan-unit"
                                name="unit"
                                label="Unit"
                                options={Object.fromEntries(AREA_UNIT_KEYS.map((unit) => [unit, AREA_UNITS[unit].label]))}
                                defaultValue="sq_m"
                            />
                        </div>
                    </ActionForm>
                </details>
            ) : null}
        </div>
    )
}
