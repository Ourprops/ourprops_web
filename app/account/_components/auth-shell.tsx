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
            <Image src="/logo.svg" alt="" width={21} height={28} className="h-7 w-auto" priority />
            <span className="text-lg font-semibold tracking-tight">OurProps</span>
        </Link>
    )
}

// Layout for the signed-out and setup screens: a deep-blue panel showing a property record beside the form.
// The panel is decorative and only shows on wide screens, so the form never depends on it.
export default function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <aside className="survey-grid hidden flex-col justify-between gap-10 bg-primary p-10 text-primary-foreground [--grid-line:rgba(255,255,255,0.05)] lg:flex xl:p-14">
                <Logo className="flex w-fit items-center gap-2 text-white" />

                <div className="mx-auto w-full max-w-md" aria-hidden>
                    <RecordSheet reference={SAMPLE_PROPERTY.parcelId} className="text-foreground">
                        <PropertyHeader
                            name={SAMPLE_PROPERTY.name}
                            type={SAMPLE_PROPERTY.type}
                            location={SAMPLE_PROPERTY.location}
                            status={SAMPLE_PROPERTY.status}
                        />
                        <BoundaryMap className="mt-4 h-44" coordinates={SAMPLE_PROPERTY.coordinates} />
                    </RecordSheet>
                </div>

                <div>
                    <p className="text-title max-w-md text-[2rem]">Every property, one clear record.</p>
                    <p className="mt-3 max-w-md text-white/70">
                        Documents, boundaries, and who can see them, kept together in one place.
                    </p>
                </div>
            </aside>

            <div className="flex flex-col items-center justify-center px-5 py-10 sm:px-8">
                <Logo className="mb-10 flex items-center gap-2 text-primary lg:hidden" />
                <div className="w-full max-w-sm">{children}</div>
            </div>
        </main>
    )
}
