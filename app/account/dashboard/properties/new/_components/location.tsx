"use client"

import { ArrowRight } from "lucide-react"
import { useState, type SubmitEvent } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { POSTCODE_LETTER_BY_REGION } from "@/lib/digital-address"
import { ASSEMBLIES_BY_REGION, type Assembly } from "@/lib/ghana-districts"
import { useAutosaveDraft } from "@/lib/queries/property"
import { locationSchema, regionSchema, type Location as LocationValues, type Region } from "@/lib/validators/property"
import { useNewPropertyStore } from "@/stores/new-property-store"

import BackButton from "./back-button"
import DigitalAddressInput from "./digital-address-input"

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

    // The combobox works with the assembly objects; the store keeps just the name.
    // A name not in the region's list (such as one typed before this was a list) shows as empty and fails the region check.
    const assemblies = region ? ASSEMBLIES_BY_REGION[region] : []
    const selectedAssembly = assemblies.find((assembly) => assembly.name === municipality) ?? null
    const regionLetter = region ? POSTCODE_LETTER_BY_REGION[region] : undefined

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
                            onValueChange={(value) => {
                                const next = (value as Region | null) ?? undefined
                                // The chosen assembly belongs to the old region, so clear it; "" (not undefined) so the saved draft clears too
                                updateLocation(next === region ? { region: next } : { region: next, municipality: "" })
                            }}
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
                        <Combobox
                            items={assemblies}
                            value={selectedAssembly}
                            onValueChange={(assembly) => updateLocation({ municipality: assembly?.name ?? "" })}
                            itemToStringLabel={(assembly) => assembly.name}
                            disabled={!region}
                        >
                            <ComboboxInput
                                id={FIELD_IDS.municipality}
                                placeholder={region ? "Search municipalities and districts" : "Choose a region first"}
                                disabled={!region}
                                aria-invalid={!!errors.municipality}
                                aria-describedby={region ? undefined : "property-municipality-description"}
                                className="h-11 w-full bg-card"
                            />
                            <ComboboxContent>
                                <ComboboxEmpty>No municipality or district by that name in {region}</ComboboxEmpty>
                                <ComboboxList>
                                    {(assembly: Assembly) => (
                                        <ComboboxItem key={assembly.name} value={assembly}>
                                            {/* The space keeps screen readers from running the two words together */}
                                            {assembly.name}{" "}
                                            <span className="text-muted-foreground">{assembly.category}</span>
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                        {!region && (
                            <FieldDescription id="property-municipality-description">
                                The list shows the assemblies in the region you choose.
                            </FieldDescription>
                        )}
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
                        <DigitalAddressInput
                            id={FIELD_IDS.digital_address}
                            value={digitalAddress}
                            onChange={(value) => updateLocation({ digital_address: value })}
                            regionLetter={regionLetter}
                            invalid={!!errors.digital_address}
                            describedBy="property-digital-address-description"
                        />
                        <FieldDescription id="property-digital-address-description">
                            Find it in the GhanaPost GPS app or on the plate on the building.
                            {regionLetter && ` Addresses in ${region} start with ${regionLetter}.`}
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

                <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                    <BackButton />
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
