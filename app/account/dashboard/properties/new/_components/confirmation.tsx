"use client"

import { ArrowRight, Check, TriangleAlert } from "lucide-react"
import Link from "next/link"

import BrandMark from "@/components/brand-mark"
import { Button } from "@/components/ui/button"
import { useDraftDocuments } from "@/lib/queries/property"
import { cn } from "@/lib/utils"
import { useNewPropertyStore } from "@/stores/new-property-store"

import { findGaps } from "./review"

// Where the user goes once they are done
const DASHBOARD_HREF = "/account/dashboard"

const NEXT_STEPS = [
    {
        title: "A reviewer checks your property",
        description: "They go through your documents and compare where the property is with others registered on OurProps.",
    },
    {
        title: "They get in touch if they need anything",
        description: "For example, a clearer copy of a document or the boundary of the land.",
    },
    {
        title: "Your property is verified",
        description: "Once every check is done, your property gets a page you can share.",
    },
]

export default function Confirmation() {
    const details = useNewPropertyStore((state) => state.details)
    const location = useNewPropertyStore((state) => state.location)
    const boundary = useNewPropertyStore((state) => state.boundary)
    const acquisition = useNewPropertyStore((state) => state.acquisition)
    const reset = useNewPropertyStore((state) => state.reset)
    // Already loaded on review, so this reads what was submitted rather than fetching again
    const documents = useDraftDocuments()

    // What was left out, so the user can have it ready if the reviewer asks
    const gaps = findGaps({ details, location, boundary, acquisition }, documents.data)

    return (
        <section className="mx-auto w-full max-w-xl px-5 py-12 md:py-20">
            {/* The pin lands on the plot and its boundary draws in, then the check confirms it's filed */}
            <div className="relative w-fit">
                <BrandMark className="-ml-3 size-24" />
                <span
                    className="absolute right-0 bottom-2 flex size-8 animate-pop-in items-center justify-center rounded-full bg-success text-white ring-4 ring-background motion-reduce:animate-none"
                    style={{ animationDelay: "1300ms" }}
                >
                    <Check size={16} strokeWidth={3} aria-hidden />
                </span>
            </div>
            <h1 className="mt-4 text-heading text-foreground md:text-2xl">Property submitted</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-copy">
                {details.name ? (
                    <>
                        <span className="font-medium text-foreground">{details.name}</span> has been sent for review.
                    </>
                ) : (
                    "Your property has been sent for review."
                )}
            </p>

            <div className="mt-8 rounded-xl border border-border bg-card p-5">
                <h2 className="text-[15px] font-semibold text-foreground">What happens next</h2>
                {/* A timeline: the line joins the markers, and the first step is the one happening now */}
                <ol className="mt-4 flex flex-col">
                    {NEXT_STEPS.map((step, index) => (
                        <li
                            key={step.title}
                            className="relative flex gap-3 pb-5 last:pb-0 before:absolute before:top-7 before:bottom-0 before:left-3.25 before:w-px before:bg-border last:before:hidden"
                        >
                            <span
                                aria-hidden
                                className={cn(
                                    "text-data relative flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                                    index === 0
                                        ? "bg-secondary text-secondary-foreground"
                                        : "bg-background text-muted-foreground ring-1 ring-border"
                                )}
                            >
                                {String(index + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0 pt-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-foreground">{step.title}</p>
                                    {index === 0 && (
                                        <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
                                            Now
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-sm leading-relaxed text-copy">{step.description}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </div>

            {gaps.length > 0 && (
                <div className="mt-4 rounded-xl border border-warning/30 bg-warning-soft p-5">
                    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                        <TriangleAlert size={18} className="shrink-0 text-warning" aria-hidden />
                        Have these ready
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-copy">
                        You submitted without them, so a reviewer may ask you for them.
                    </p>
                    <ul className="mt-3 list-disc pl-5 text-sm text-foreground marker:text-warning">
                        {gaps.map((gap) => (
                            <li key={gap.key} className="py-0.5">
                                {gap.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button
                    render={<Link href={DASHBOARD_HREF} />}
                    nativeButton={false}
                    className="pressable h-12 rounded-lg bg-secondary px-6 text-[15px] text-secondary-foreground hover:bg-secondary/90"
                >
                    Go to your dashboard
                    <ArrowRight size={16} aria-hidden />
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    // Starts a new registration from the start screen
                    onClick={reset}
                    className="pressable h-12 rounded-lg bg-card px-6 text-[15px] text-primary hover:bg-background"
                >
                    Register another property
                </Button>
            </div>
        </section>
    )
}
