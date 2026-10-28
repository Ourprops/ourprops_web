import { ArrowRight, FileText, Map, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { HomeContent } from "@/lib/content/defaults"
import { getIcon } from "./icons"
import {
    BoundaryMap,
    DocumentRow,
    InfoRow,
    PlanFrame,
    PropertyHeader,
    RecordSheet,
    SAMPLE_PROPERTY,
} from "./property-record"

function GhanaFlag() {
    return (
        <svg className="h-3 w-4 shrink-0 overflow-hidden rounded-[2px] shadow-xs" viewBox="0 0 640 480" aria-hidden>
            <path d="M0 0h640v160H0z" fill="#CE1126" />
            <path d="M0 160h640v160H0z" fill="#FCD116" />
            <path d="M0 320h640v160H0z" fill="#006B3F" />
            <polygon
                fill="#000000"
                points="320,165 344,238 421,238 359,283 382,356 320,311 258,356 281,283 219,238 296,238"
            />
        </svg>
    )
}

export default function Hero({ content }: { content: HomeContent["hero"] }) {
    return (
        <section className="relative overflow-hidden border-b border-border">
            <div className="mx-auto grid w-full max-w-310 grid-cols-1 items-center gap-14 px-5 pb-20 pt-14 md:px-8 md:pt-20 lg:grid-cols-12 lg:gap-16 lg:pb-24">
                <div className="flex flex-col items-start lg:col-span-6">
                    <p className="text-eyebrow text-secondary">{content.eyebrow}</p>

                    <h1 className="text-display mt-4 text-foreground">{content.heading}</h1>

                    <p className="text-lead mt-6 max-w-xl text-copy">{content.subheading}</p>

                    <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                        <Button
                            className="pressable h-12 rounded-lg bg-secondary px-6 text-[15px] text-secondary-foreground hover:bg-secondary/90"
                            render={<a href={content.primaryCta.href} />}
                            nativeButton={false}
                        >
                            {content.primaryCta.label}
                            <ArrowRight size={16} aria-hidden />
                        </Button>
                        <Button
                            variant="outline"
                            className="pressable h-12 rounded-lg bg-card px-6 text-[15px] text-primary hover:bg-background"
                            render={<a href={content.secondaryCta.href} />}
                            nativeButton={false}
                        >
                            {content.secondaryCta.label}
                        </Button>
                    </div>

                    <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6 text-sm text-copy">
                        <li className="flex items-center gap-2">
                            <GhanaFlag />
                            {content.launchNote}
                        </li>
                        {content.trustPoints.map((point) => {
                            const Icon = getIcon(point.icon)

                            return (
                                <li key={point.text} className="flex items-center gap-2">
                                    <Icon size={15} className="text-primary" aria-hidden />
                                    {point.text}
                                </li>
                            )
                        })}
                    </ul>
                </div>

                {/* The record sits on a site plan's coordinate grid */}
                <PlanFrame className="p-4 sm:p-8 lg:col-span-6">
                    <RecordSheet reference={SAMPLE_PROPERTY.parcelId}>
                        <PropertyHeader
                            name={SAMPLE_PROPERTY.name}
                            type={SAMPLE_PROPERTY.type}
                            location={SAMPLE_PROPERTY.location}
                            status={SAMPLE_PROPERTY.status}
                        />

                        <dl className="mt-5 grid grid-cols-2 gap-4 border-y border-border py-4 sm:grid-cols-3">
                            {SAMPLE_PROPERTY.details.map((detail) => (
                                <InfoRow key={detail.label} {...detail} />
                            ))}
                        </dl>

                        <BoundaryMap className="mt-4 h-40 sm:h-44" coordinates={SAMPLE_PROPERTY.coordinates} />

                        <p className="text-eyebrow mt-5 text-muted-foreground">Documents</p>
                        <ul className="mt-1 divide-y divide-border">
                            <DocumentRow icon={FileText} name="Indenture" detail="Signed deed · PDF" status="complete" />
                            <DocumentRow icon={Map} name="Site plan" detail="Surveyor's coordinate sheet" status="in-review" />
                            <DocumentRow icon={ShieldCheck} name="Search report" detail="Supporting document" status="complete" />
                        </ul>
                    </RecordSheet>
                </PlanFrame>
            </div>
        </section>
    )
}
