import { FileText, IdCard, LockKeyhole, MapPinned } from "lucide-react"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"

const STEPS = [
    { title: "Tell us about the property", text: "Where it is, how you got it, and its boundary on a map if you can." },
    { title: "Send your documents", text: "Photos or scans are fine. Not sure what something is? Send it anyway; we'll sort it." },
    { title: "We check it", text: "Our team reviews everything and tells you if anything is missing." },
]

const READY = [
    { icon: IdCard, text: "Your Ghana Card, or passport if you live abroad" },
    { icon: FileText, text: "Your indenture, site plan or other papers for the property" },
    { icon: MapPinned, text: "Roughly where the property is" },
]

// What a new owner sees before they've registered anything: how it works, what to have ready, and where to start
export function Welcome() {
    return (
        <section aria-labelledby="welcome-title" className="grid gap-6 rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="grid gap-2">
                <h2 id="welcome-title" className="text-lg font-semibold">
                    Register your first property
                </h2>
                <p className="text-copy">
                    OurProps checks the ownership evidence for your property, so buyers and family can trust it. You can save as you go
                    and come back any time.
                </p>
            </div>

            <ol className="grid gap-4">
                {STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {index + 1}
                        </span>
                        <span className="grid gap-0.5">
                            <span className="font-medium">{step.title}</span>
                            <span className="text-sm text-copy">{step.text}</span>
                        </span>
                    </li>
                ))}
            </ol>

            <div className="grid gap-2 rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium">Good to have ready</p>
                <ul className="grid gap-2">
                    {READY.map(({ icon: Icon, text }) => (
                        <li key={text} className="flex items-start gap-2 text-sm text-copy">
                            <Icon size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden /> {text}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="grid gap-3">
                <Link href="/account/dashboard/properties/new" className={buttonVariants({ size: "lg", className: "h-11 w-full sm:w-fit sm:px-6" })}>
                    Register a property
                </Link>
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <LockKeyhole size={14} className="mt-0.5 shrink-0" aria-hidden />
                    Your documents stay private. Only our verification team sees them, never the public.
                </p>
            </div>
        </section>
    )
}
