"use client"

import { ArrowRight, CloudCheck, FileText, House, MapPinned, type LucideIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { useNewPropertyStore } from "@/stores/new-property-store"

// Where Cancel goes, the same place as leaving from the progress header
const EXIT_HREF = "/account/dashboard"

type Step = {
    icon: LucideIcon
    title: string
    description: string
}

const STEPS: Step[] = [
    {
        icon: House,
        title: "Property details",
        description: "Name, property type and size.",
    },
    {
        icon: MapPinned,
        title: "Location and boundary",
        description: "Find the property on the map and mark its boundary.",
    },
    {
        icon: FileText,
        title: "Ownership and documents",
        description: "How you acquired the property, plus documents such as an ownership document or site plan.",
    },
]

export default function StartScreen() {
    const handleNext = useNewPropertyStore((state) => state.handleNext)

    return (
        <section className="mx-auto flex w-full max-w-xl flex-col px-5 py-14 md:py-20">
            <h1 className="text-title text-foreground">Register a property</h1>
            <p className="text-lead mt-4 max-w-md text-copy">
                Register your property on OurProps in three steps. You&apos;ll check everything before you submit.
            </p>

            {/* The record the user is about to fill in, with each part still empty */}
            <div className="survey-grid mt-10 rounded-xl border border-dashed border-primary/15 p-3 sm:p-5">
                <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
                    <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-2 text-muted-foreground sm:px-5">
                        <span className="text-eyebrow text-[10px]">New property record</span>
                        <span className="text-data text-[11px]">Draft</span>
                    </div>
                    <ol className="divide-y divide-border">
                        {STEPS.map((step, index) => (
                            <li key={step.title} className="flex items-start gap-4 p-4 sm:p-5">
                                <span className="text-data w-6 shrink-0 pt-0.5 text-sm text-secondary">
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                                        <step.icon size={16} className="shrink-0 text-primary" aria-hidden />
                                        {step.title}
                                    </h2>
                                    <p className="mt-1 text-sm leading-relaxed text-copy">{step.description}</p>
                                </div>
                                <span className="hidden shrink-0 rounded-full px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-border sm:inline">
                                    Not started
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>

            <p className="mt-5 flex items-center gap-2 text-sm text-copy">
                <CloudCheck size={15} className="shrink-0 text-success" aria-hidden />
                We save your progress as a draft as you go, so you can finish later.
            </p>

            <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row-reverse sm:justify-start">
                <Button
                    type="button"
                    onClick={handleNext}
                    className="pressable h-12 rounded-lg bg-secondary px-8 text-[15px] text-secondary-foreground hover:bg-secondary/90"
                >
                    Get started
                    <ArrowRight size={16} aria-hidden />
                </Button>
                <Button
                    variant="ghost"
                    render={<Link href={EXIT_HREF} />}
                    nativeButton={false}
                    className="pressable h-12 rounded-lg px-6 text-[15px] text-primary hover:bg-card"
                >
                    Cancel
                </Button>
            </div>
        </section>
    )
}
