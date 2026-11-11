import { Check } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import {
    BoundaryMap,
    PropertyHeader,
    RecordSheet,
    SAMPLE_PROPERTY,
} from "@/app/(public)/_components/property-record"

function Logo({ className }: { className?: string }) {
    return (
        <Link href="/" className={className} aria-label="OurProps home">
            <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-auto object-contain" priority />
            <span className="text-lg font-bold tracking-tight text-ink">OurProps</span>
        </Link>
    )
}

const PROMISES = ["Checked by a real review team", "Your documents stay private", "Free to create an account"]

// Layout for sign-in, sign-up and the setup screens, in the homepage's language: an orange block with the site-plan
// grid and a sample record beside the form, a big ink headline, and what you can count on. The panel is decorative and
// only shows on wide screens, so the form never depends on it.
export default function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <main className="grid min-h-screen bg-card text-foreground lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
            <div className="hidden p-3 lg:block">
                <aside className="block-panel survey-grid flex h-full flex-col justify-between gap-10 bg-block-orange p-10 [--grid-line:rgba(255,107,53,0.12)] xl:p-14">
                    <Logo className="flex w-fit items-center gap-2" />

                    <div>
                        <p className="text-section max-w-lg text-ink">Know the land before you pay for it.</p>
                        <ul className="mt-6 grid gap-2.5">
                            {PROMISES.map((promise) => (
                                <li key={promise} className="flex items-center gap-2.5 font-medium text-ink">
                                    <span className="flex size-5 items-center justify-center rounded-full bg-ink text-white" aria-hidden>
                                        <Check size={12} strokeWidth={3} />
                                    </span>
                                    {promise}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="w-full max-w-md -rotate-1 shadow-[0_30px_80px_-30px_rgba(11,30,51,0.45)]" aria-hidden>
                        <RecordSheet reference={SAMPLE_PROPERTY.parcelId} className="text-foreground">
                            <PropertyHeader
                                name={SAMPLE_PROPERTY.name}
                                type={SAMPLE_PROPERTY.type}
                                location={SAMPLE_PROPERTY.location}
                                status={SAMPLE_PROPERTY.status}
                            />
                            <BoundaryMap className="mt-4 h-36" coordinates={SAMPLE_PROPERTY.coordinates} />
                        </RecordSheet>
                    </div>
                </aside>
            </div>

            <div className="flex flex-col items-center justify-center px-5 py-10 sm:px-8">
                <Logo className="mb-10 flex items-center gap-2 lg:hidden" />
                <div className="w-full max-w-sm">{children}</div>
            </div>
        </main>
    )
}
