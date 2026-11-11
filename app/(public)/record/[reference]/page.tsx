import { BadgeCheck, CircleMinus, CirclePause, LockKeyhole, MapPin, MessageCircle, Ruler } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { ownerInter } from "@/components/owner/owner-fonts"
import { buttonVariants } from "@/components/ui/button"
import { PUBLIC_CHECKS, describeRecordArea, getPublicRecord } from "@/lib/public-record"
import { supportWhatsAppUrl } from "@/lib/support"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { TYPE_OPTIONS } from "@/lib/types/property"

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })

export async function generateMetadata({ params }: PageProps<"/record/[reference]">): Promise<Metadata> {
    const { reference } = await params
    const record = await getPublicRecord(await createClient(), reference)
    return {
        title: record ? `${record.name ?? "Property"}: OurProps record` : "Record not found",
        description: record?.status === "active" ? "Verified by OurProps. See what was checked." : undefined,
        // Shared by link, not listed: search engines don't index records
        robots: { index: false, follow: false },
    }
}

// A property's public record: what someone deciding whether to trust it needs, and nothing private. Reached by the
// link its owner shares; it isn't listed or searchable anywhere.
export default async function PublicRecordPage({ params }: PageProps<"/record/[reference]">) {
    const { reference } = await params
    const record = await getPublicRecord(await createClient(), reference)
    if (!record) notFound()

    const verified = record.status === "active"
    const place = [record.city_town, record.district_municipality, record.region].filter(Boolean).join(", ")
    const type = TYPE_OPTIONS.find((option) => option.value === record.property_type)?.title ?? record.property_type
    const area = describeRecordArea(record)
    const checks = PUBLIC_CHECKS.map((check) => ({ ...check, result: record.checkpoints?.find((each) => each.key === check.key) }))

    return (
        <div className={cn(ownerInter.variable, "owner-ui mx-auto grid max-w-2xl gap-6 px-4 py-10 sm:px-6 sm:py-14")}>
            <section className="animate-rise grid gap-5 rounded-2xl border border-border bg-card p-5 shadow-card motion-reduce:animate-none sm:p-6">
                {verified ? (
                    <p className="flex w-fit items-center gap-2 rounded-full bg-success-soft px-3 py-1 text-sm font-medium text-success">
                        <BadgeCheck size={16} aria-hidden /> Verified by OurProps
                    </p>
                ) : (
                    <p className="flex w-fit items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-sm font-medium text-warning">
                        <CirclePause size={16} aria-hidden /> Not currently verified
                    </p>
                )}

                <div className="grid gap-2">
                    <h1 className="text-display text-primary wrap-anywhere">{record.name ?? "A property"}</h1>
                    <ul className="grid gap-1 text-sm text-copy">
                        {place ? (
                            <li className="flex items-center gap-2">
                                <MapPin size={15} className="shrink-0" aria-hidden /> {type} in {place}
                            </li>
                        ) : null}
                        {area ? (
                            // says where the number comes from, so a sketch is never read as a survey
                            <li className="flex items-start gap-2">
                                <Ruler size={15} className="mt-0.5 shrink-0" aria-hidden />
                                <span>
                                    {area.text}, <span className={area.checked ? "font-medium text-success" : undefined}>{area.source}</span>
                                </span>
                            </li>
                        ) : null}
                    </ul>
                </div>

                <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 border-t border-border pt-4 text-sm">
                    <dt className="text-muted-foreground">Reference</dt>
                    <dd className="text-data font-medium">{record.prop_id}</dd>
                    {verified && record.verified_at ? (
                        <>
                            <dt className="text-muted-foreground">Verified on</dt>
                            <dd>{dateFormat.format(new Date(record.verified_at))}</dd>
                        </>
                    ) : null}
                </dl>

                {!verified ? (
                    <p className="rounded-lg bg-muted/50 p-3 text-sm text-copy">
                        This property was verified before, and our team is checking it again. Until that&apos;s done, don&apos;t rely on
                        its earlier result.
                    </p>
                ) : null}
            </section>

            {verified ? (
                <section aria-labelledby="checks-title" className="grid gap-3">
                    <h2 id="checks-title" className="font-medium">
                        What we checked
                    </h2>
                    <ul className="divide-y divide-border rounded-2xl border border-border bg-card shadow-card">
                        {checks.map((check) => {
                            const passed = check.result?.status === "verified"
                            return (
                                <li key={check.key} className="flex gap-3 px-4 py-3">
                                    {passed ? (
                                        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-success" aria-label="Checked" />
                                    ) : (
                                        <CircleMinus className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="Not checked" />
                                    )}
                                    <span className="grid gap-0.5">
                                        <span className="font-medium">
                                            {check.title}
                                            {passed ? null : <span className="font-normal text-muted-foreground">: not checked</span>}
                                        </span>
                                        <span className="text-sm text-copy">{passed ? check.text : check.result?.note ?? "We didn't check this for this property."}</span>
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                </section>
            ) : null}

            <section className="grid gap-3 rounded-xl bg-muted/50 p-5 text-sm text-copy">
                <p className="font-medium text-foreground">What this means</p>
                <p>
                    “Verified” is OurProps&apos; review of the evidence the owner gave us, against our review rules. It isn&apos;t a
                    guarantee of legal title, and it doesn&apos;t replace a Lands Commission search, a surveyor or a lawyer. If you&apos;re
                    buying, still do your own checks.
                </p>
                <p className="flex items-start gap-2">
                    <LockKeyhole size={15} className="mt-0.5 shrink-0" aria-hidden />
                    The owner&apos;s documents and identity are private. This record shows only what we checked.
                </p>
            </section>

            <div className="flex flex-wrap gap-2">
                <Link href="/help#verified" className={buttonVariants({ variant: "outline", className: "h-10" })}>
                    How verification works
                </Link>
                <a
                    href={supportWhatsAppUrl(`Hello OurProps, I have a question about the property ${record.prop_id}: `)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({ variant: "outline", className: "h-10" })}
                >
                    <MessageCircle aria-hidden /> Report a concern
                </a>
            </div>
        </div>
    )
}
