"use client"

import { ArrowRight, Clock, FileText, House, MapPinned, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useNewPropertyStore } from "@/stores/new-property-store"

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
        <section className="mx-auto flex w-full max-w-xl flex-col items-center px-5 py-16 text-center md:py-24">
            <span className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-xs">
                <House size={24} aria-hidden />
            </span>

            <h1 className="text-title mt-8 text-foreground">Register a property</h1>
            <p className="text-lead mt-4 max-w-md text-copy">
                Register your property on OurProps in three steps. You&apos;ll check everything before you submit.
            </p>

            <Card className="mt-10 w-full gap-0 rounded-2xl py-0 text-left shadow-[0_1px_2px_rgba(16,42,67,0.04)] ring-border">
                <CardContent className="px-0">
                    <ol>
                        {STEPS.map((step, index) => (
                            <li key={step.title}>
                                {index > 0 && <Separator />}
                                <div className="flex items-start gap-4 p-5">
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-primary">
                                        <step.icon size={18} aria-hidden />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <h2 className="text-base font-semibold text-foreground">{step.title}</h2>
                                            <Badge variant="outline" className="text-muted-foreground">
                                                Step {index + 1}
                                            </Badge>
                                        </div>
                                        <p className="mt-1 text-sm leading-relaxed text-copy">{step.description}</p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ol>
                </CardContent>
            </Card>

            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={15} aria-hidden />
                You can save a draft and finish later.
            </p>

            <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row-reverse">
                <Button
                    type="button"
                    onClick={handleNext}
                    className="pressable h-12 rounded-lg bg-secondary px-8 text-[15px] text-secondary-foreground hover:bg-secondary/90"
                >
                    Get started
                    <ArrowRight size={16} aria-hidden />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    className="pressable h-12 rounded-lg px-6 text-[15px] text-primary hover:bg-card"
                >
                    Cancel
                </Button>
            </div>
        </section>
    )
}
