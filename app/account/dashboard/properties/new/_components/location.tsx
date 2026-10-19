"use client"

import { ArrowRight } from "lucide-react"
import { useState, type SubmitEvent } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAutosaveDraft } from "@/lib/queries/property"
import { locationSchema, regionSchema, type Location as LocationValues, type Region } from "@/lib/validators/property"
import { useNewPropertyStore } from "@/stores/new-property-store"

type FieldErrors = Partial<Record<keyof LocationValues, string[]>>

// Field ids in the order they appear, used to focus the first one that needs fixing
const FIELD_IDS: Record<keyof LocationValues, string> = {
    region: "property-region",
    municipality: "property-municipality",
    city: "property-city",
    address: "property-address",
    digital_address: "property-digital-address",
    landmark: "property-landmark",
}

export default function Location() {
    // One selector per field, so typing in one field doesn't re-render for the others
    const region = useNewPropertyStore((state) => state.location.region)
    const municipality = useNewPropertyStore((state) => state.location.municipality ?? "")
    const city = useNewPropertyStore((state) => state.location.city ?? "")
    const address = useNewPropertyStore((state) => state.location.address ?? "")
    const digitalAddress = useNewPropertyStore((state) => state.location.digital_address ?? "")
    const landmark = useNewPropertyStore((state) => state.location.landmark ?? "")
    const updateLocation = useNewPropertyStore((state) => state.updateLocation)
    const handleNext = useNewPropertyStore((state) => state.handleNext)

    // Errors only show after the first attempt to continue, then update as the user fixes them
    const [submitted, setSubmitted] = useState(false)

    useAutosaveDraft([region, municipality, city, address, digitalAddress, landmark])

    // The schema trims the text, so the raw values can be checked as they are
    const result = locationSchema.safeParse({ region, municipality, city, address, digital_address: digitalAddress, landmark })
    const errors: FieldErrors = submitted && !result.success ? z.flattenError(result.error).fieldErrors : {}

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitted(true)

        if (!result.success) {
            const invalid = new Set(result.error.issues.map((issue) => issue.path[0]))
            const first = (Object.keys(FIELD_IDS) as (keyof LocationValues)[]).find((field) => invalid.has(field))
            if (first) document.getElementById(FIELD_IDS[first])?.focus()
            return
        }

        // Store the trimmed values; any unsaved change is saved as the screen closes
        updateLocation(result.data)
        handleNext()
    }

    return (
        <section className="mx-auto w-full max-w-xl px-5 py-10 md:py-14">
            <h1 className="text-heading text-foreground md:text-2xl">Where is the property?</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-copy">
                Tell us where to find it. You&apos;ll mark its exact boundary on the map next.
            </p>

            <form noValidate onSubmit={handleSubmit} className="mt-8">
                <FieldGroup className="gap-8">
                    <Field data-invalid={!!errors.region}>
                        <FieldLabel htmlFor={FIELD_IDS.region}>Region</FieldLabel>
                        <Select
                            value={region ?? null}
                            onValueChange={(value) => updateLocation({ region: (value as Region | null) ?? undefined })}
                        >
                            <SelectTrigger
                                id={FIELD_IDS.region}
                                aria-invalid={!!errors.region}
                                className="h-11 w-full bg-card text-base md:text-sm"
                            >
                                <SelectValue placeholder="Choose a region" />
                            </SelectTrigger>
                            <SelectContent>
                                {regionSchema.options.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FieldError errors={errors.region && [{ message: "Choose a region" }]} />
                    </Field>

                    <Field data-invalid={!!errors.municipality}>
                        <FieldLabel htmlFor={FIELD_IDS.municipality}>Municipality or district</FieldLabel>
                        <Input
                            id={FIELD_IDS.municipality}
                            name="municipality"
                            value={municipality}
                            onChange={(event) => updateLocation({ municipality: event.target.value })}
                            placeholder="For example, Ayawaso West"
                            autoComplete="off"
                            aria-invalid={!!errors.municipality}
                            className="h-11 bg-card"
                        />
                        <FieldError errors={errors.municipality?.map((message) => ({ message }))} />
                    </Field>

                    <Field data-invalid={!!errors.city}>
                        <FieldLabel htmlFor={FIELD_IDS.city}>City or town</FieldLabel>
                        <Input
                            id={FIELD_IDS.city}
                            name="city"
                            value={city}
                            onChange={(event) => updateLocation({ city: event.target.value })}
                            placeholder="For example, East Legon"
                            autoComplete="off"
                            aria-invalid={!!errors.city}
                            className="h-11 bg-card"
                        />
                        <FieldError errors={errors.city?.map((message) => ({ message }))} />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor={FIELD_IDS.address}>
                            Address <span className="font-normal text-muted-foreground">(optional)</span>
                        </FieldLabel>
                        <Input
                            id={FIELD_IDS.address}
                            name="address"
                            value={address}
                            onChange={(event) => updateLocation({ address: event.target.value })}
                            placeholder="For example, 12 Lagos Avenue"
                            autoComplete="off"
                            className="h-11 bg-card"
                        />
                    </Field>

                    <Field data-invalid={!!errors.digital_address}>
                        <FieldLabel htmlFor={FIELD_IDS.digital_address}>
                            Digital address <span className="font-normal text-muted-foreground">(optional)</span>
                        </FieldLabel>
                        <Input
                            id={FIELD_IDS.digital_address}
                            name="digital_address"
                            value={digitalAddress}
                            onChange={(event) => updateLocation({ digital_address: event.target.value })}
                            placeholder="For example, GA-123-4567"
                            autoComplete="off"
                            autoCapitalize="characters"
                            aria-invalid={!!errors.digital_address}
                            aria-describedby="property-digital-address-description"
                            className="h-11 bg-card uppercase placeholder:normal-case"
                        />
                        <FieldDescription id="property-digital-address-description">
                            The property&apos;s GhanaPost GPS address, if it has one.
                        </FieldDescription>
                        <FieldError errors={errors.digital_address?.map((message) => ({ message }))} />
                    </Field>

                    <Field>
                        <FieldLabel htmlFor={FIELD_IDS.landmark}>
                            Nearby landmark <span className="font-normal text-muted-foreground">(optional)</span>
                        </FieldLabel>
                        <Input
                            id={FIELD_IDS.landmark}
                            name="landmark"
                            value={landmark}
                            onChange={(event) => updateLocation({ landmark: event.target.value })}
                            placeholder="For example, behind the Shell filling station"
                            autoComplete="off"
                            className="h-11 bg-card"
                        />
                    </Field>
                </FieldGroup>

                <div className="mt-10 flex justify-end">
                    <Button
                        type="submit"
                        className="pressable h-12 w-full rounded-lg bg-secondary px-8 text-[15px] text-secondary-foreground hover:bg-secondary/90 sm:w-auto"
                    >
                        Continue
                        <ArrowRight size={16} aria-hidden />
                    </Button>
                </div>
            </form>
        </section>
    )
}
