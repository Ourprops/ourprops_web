"use client"

import { ArrowRight } from "lucide-react"
import { useState, type SubmitEvent } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
    FieldLegend,
    FieldSet,
    FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useAutosaveDraft } from "@/lib/queries/property"
import { detailsSchema, type Details as DetailsValues, type PropertyType } from "@/lib/validators/property"
import { useNewPropertyStore } from "@/stores/new-property-store"
import { TYPE_OPTIONS } from "@/lib/types/property"

type FieldErrors = Partial<Record<keyof DetailsValues, string[]>>

export default function Details() {
    // One selector per field, so typing in one field doesn't re-render for the others
    const name = useNewPropertyStore((state) => state.details.name ?? "")
    const type = useNewPropertyStore((state) => state.details.type)
    const description = useNewPropertyStore((state) => state.details.description ?? "")
    const updateDetails = useNewPropertyStore((state) => state.updateDetails)
    const handleNext = useNewPropertyStore((state) => state.handleNext)

    // Errors only show after the first attempt to continue, then update as the user fixes them
    const [submitted, setSubmitted] = useState(false)

    useAutosaveDraft([name, type, description])

    // The schema trims the text, so the raw values can be checked as they are
    const result = detailsSchema.safeParse({ name, type, description })
    const errors: FieldErrors = submitted && !result.success ? z.flattenError(result.error).fieldErrors : {}

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        setSubmitted(true)

        if (!result.success) {
            // Move focus to the first field that needs fixing, in the order the fields appear
            const invalid = new Set(result.error.issues.map((issue) => issue.path[0]))
            const target = invalid.has("name") ? "property-name" : `property-type-${TYPE_OPTIONS[0].value}`
            document.getElementById(target)?.focus()
            return
        }

        // Store the trimmed values; any unsaved change is saved as the screen closes
        updateDetails(result.data)
        handleNext()
    }

    return (
        <section className="mx-auto w-full max-w-xl px-5 py-10 md:py-14">
            <h1 className="text-heading text-foreground md:text-2xl">Tell us about the property</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-copy">
                Give it a name you&apos;ll recognise and choose the type that fits best.
            </p>

            <form noValidate onSubmit={handleSubmit} className="mt-8">
                <FieldGroup className="gap-8">
                    <Field data-invalid={!!errors.name}>
                        <FieldLabel htmlFor="property-name">Property name</FieldLabel>
                        <Input
                            id="property-name"
                            name="name"
                            value={name}
                            onChange={(event) => updateDetails({ name: event.target.value })}
                            placeholder="For example, East Legon family house"
                            autoComplete="off"
                            aria-invalid={!!errors.name}
                            aria-describedby="property-name-description"
                            className="h-11 bg-card"
                        />
                        <FieldDescription id="property-name-description">
                            Only you and people you share the property with will see this name.
                        </FieldDescription>
                        <FieldError errors={errors.name?.map((message) => ({ message }))} />
                    </Field>

                    <FieldSet data-invalid={!!errors.type}>
                        <FieldLegend variant="label">Property type</FieldLegend>
                        <RadioGroup
                            value={type ?? null}
                            onValueChange={(value) => updateDetails({ type: value as PropertyType })}
                            aria-invalid={!!errors.type}
                            className="grid-cols-1 gap-3 sm:grid-cols-2"
                        >
                            {TYPE_OPTIONS.map((option) => (
                                <FieldLabel
                                    key={option.value}
                                    htmlFor={`property-type-${option.value}`}
                                    className="bg-card"
                                >
                                    <Field orientation="horizontal" className="items-start gap-3 p-3.5!">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary">
                                            <option.icon size={18} aria-hidden />
                                        </span>
                                        <FieldContent className="gap-0.5">
                                            <FieldTitle>{option.title}</FieldTitle>
                                            <FieldDescription className="text-[13px] leading-snug">
                                                {option.description}
                                            </FieldDescription>
                                        </FieldContent>
                                        <RadioGroupItem
                                            id={`property-type-${option.value}`}
                                            value={option.value}
                                            aria-invalid={!!errors.type}
                                            className="mt-0.5"
                                        />
                                    </Field>
                                </FieldLabel>
                            ))}
                        </RadioGroup>
                        <FieldError errors={errors.type?.map((message) => ({ message }))} />
                    </FieldSet>

                    <Field>
                        <FieldLabel htmlFor="property-description">
                            Description <span className="font-normal text-muted-foreground">(optional)</span>
                        </FieldLabel>
                        <Textarea
                            id="property-description"
                            name="description"
                            value={description}
                            onChange={(event) => updateDetails({ description: event.target.value })}
                            placeholder="Anything that helps identify it, such as the number of rooms or nearby landmarks."
                            className="min-h-28 bg-card"
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
