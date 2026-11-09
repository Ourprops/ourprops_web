import { BadgeCheck, CircleHelp, FileText, IdCard, LockKeyhole, MapPinned, MessageCircle } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { SUPPORT_WHATSAPP_IS_PLACEHOLDER, supportWhatsAppUrl } from "@/lib/support"

export const metadata: Metadata = {
    title: "Help",
    description: "How OurProps verification works, what you need, how we protect your documents, and how to reach us.",
}

const STEPS = [
    { title: "Register your property", text: "Tell us where it is, how you got it, and mark its boundary on a map if you can. Save and come back any time." },
    { title: "Send your documents", text: "Indentures, site plans, receipts, letters: photos or scans are fine. If you're not sure what a document is, send it and choose “I'm not sure”." },
    { title: "Verify your identity", text: "Add your Ghana Card, or your passport if you live abroad. You do this once, for all your properties." },
    { title: "We check it", text: "Our team reviews your documents, the boundary, and whether it overlaps another property. If anything is missing, we tell you exactly what." },
    { title: "Share the result", text: "Once verified, your property has a public record you can send to buyers, tenants or family." },
]

const QUESTIONS = [
    {
        question: "How long does checking take?",
        answer: "It depends on the property and the documents. You'll see each step on your dashboard, and we'll tell you as soon as we need anything or have finished.",
    },
    {
        question: "What if I don't have all my documents?",
        answer: "Start anyway. Send what you have; we'll tell you what's missing and whether it stops the property being verified.",
    },
    {
        question: "Can I register a property for a family member?",
        answer: "Not yet. Each owner registers their own property from their own account. They can do it from abroad with a passport, and you can help them.",
    },
    {
        question: "What if someone else has registered my land?",
        answer: "Register it anyway and send us your evidence. When two properties overlap, our team looks into both. Overlaps are a reason to check, not a decision about who owns it.",
    },
]

// Help for owners and for anyone deciding whether to use OurProps: how it works, what to have ready, how documents
// are kept, what "verified" means, and how to reach a person. Plain words, as the rest of the product.
export default function HelpPage() {
    return (
        <div className="mx-auto grid max-w-3xl gap-12 px-4 py-10 sm:px-6 sm:py-14">
            <header className="grid gap-3">
                <p className="flex items-center gap-2 text-sm font-medium text-primary">
                    <CircleHelp size={16} aria-hidden /> Help
                </p>
                <h1 className="text-heading text-primary">How OurProps works</h1>
                <p className="text-copy">
                    OurProps organises the evidence for a property, checks it, and shows clearly what was checked, so you and the people
                    you deal with can make safer decisions.
                </p>
                <nav aria-label="On this page" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <a href="#how-it-works" className="text-primary hover:underline">How it works</a>
                    <a href="#what-you-need" className="text-primary hover:underline">What you need</a>
                    <a href="#your-documents" className="text-primary hover:underline">Your documents</a>
                    <a href="#verified" className="text-primary hover:underline">What “verified” means</a>
                    <a href="#contact" className="text-primary hover:underline">Contact us</a>
                </nav>
            </header>

            <section id="how-it-works" aria-labelledby="how-it-works-title" className="grid scroll-mt-24 gap-5">
                <h2 id="how-it-works-title" className="text-lg font-semibold">How it works</h2>
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
            </section>

            <section id="what-you-need" aria-labelledby="what-you-need-title" className="grid scroll-mt-24 gap-4">
                <h2 id="what-you-need-title" className="text-lg font-semibold">What you need</h2>
                <ul className="grid gap-3 rounded-xl border border-border bg-card p-5">
                    <li className="flex gap-3 text-sm">
                        <IdCard size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                        <span><span className="font-medium">Your Ghana Card</span>, or your passport if you live abroad and don&apos;t have one.</span>
                    </li>
                    <li className="flex gap-3 text-sm">
                        <FileText size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                        <span>
                            <span className="font-medium">Your property papers</span>: an indenture, a site plan, a land title certificate, a
                            deed of assignment, or whatever you have. Photos from your phone are fine.
                        </span>
                    </li>
                    <li className="flex gap-3 text-sm">
                        <MapPinned size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                        <span><span className="font-medium">Where the property is.</span> You can mark it on a map; the exact boundary can come later.</span>
                    </li>
                </ul>
            </section>

            <section id="your-documents" aria-labelledby="your-documents-title" className="grid scroll-mt-24 gap-4">
                <h2 id="your-documents-title" className="flex items-center gap-2 text-lg font-semibold">
                    <LockKeyhole size={18} className="text-primary" aria-hidden /> How we protect your documents
                </h2>
                <ul className="grid list-disc gap-2 pl-5 text-sm text-copy">
                    <li>Your documents are private. Only our verification team can open them, and never the public.</li>
                    <li>A property&apos;s public record shows what we checked, never the documents themselves or who owns it.</li>
                    <li>Our team views Word files and scans only as safe PDF copies, made in an isolated system.</li>
                    <li>Once your identity is verified, we delete the photo of your card or passport and its number.</li>
                    <li>Every decision our team makes about your property is recorded, with the reason, so it can be checked later.</li>
                </ul>
            </section>

            <section id="verified" aria-labelledby="verified-title" className="grid scroll-mt-24 gap-4">
                <h2 id="verified-title" className="flex items-center gap-2 text-lg font-semibold">
                    <BadgeCheck size={18} className="text-success" aria-hidden /> What “verified” means
                </h2>
                <div className="grid gap-2 text-sm text-copy">
                    <p>
                        Verified means our team reviewed the evidence for the property against OurProps&apos; review rules: the owner&apos;s
                        identity, the ownership documents, the boundary, and whether it overlaps another property.
                    </p>
                    <p className="rounded-lg bg-muted/50 p-3">
                        It is OurProps&apos; review status. It isn&apos;t a guarantee of legal title, and it doesn&apos;t replace the Lands
                        Commission, a search, a surveyor or a lawyer. For a purchase, still do your own checks.
                    </p>
                </div>
            </section>

            <section aria-labelledby="questions-title" className="grid gap-4">
                <h2 id="questions-title" className="text-lg font-semibold">Common questions</h2>
                <div className="divide-y divide-border rounded-xl border border-border bg-card">
                    {QUESTIONS.map(({ question, answer }) => (
                        <details key={question} className="group px-5 py-4">
                            <summary className="cursor-pointer list-none font-medium marker:hidden">
                                <span className="flex items-center justify-between gap-3">
                                    {question}
                                    <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                                </span>
                            </summary>
                            <p className="mt-2 text-sm text-copy">{answer}</p>
                        </details>
                    ))}
                </div>
            </section>

            <section id="contact" aria-labelledby="contact-title" className="grid scroll-mt-24 gap-4 rounded-xl border border-border bg-card p-5">
                <h2 id="contact-title" className="text-lg font-semibold">Talk to a person</h2>
                <p className="text-sm text-copy">
                    Stuck, or not sure what to send? Message us on WhatsApp. Include your property&apos;s reference (it starts with PROP-) if
                    you have one. Never send ID numbers or documents in the chat; upload them in the app.
                </p>
                <div className="flex flex-wrap gap-2">
                    <a
                        href={supportWhatsAppUrl("Hello OurProps, I need help with ")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ size: "lg", className: "h-11" })}
                    >
                        <MessageCircle aria-hidden /> Chat on WhatsApp
                    </a>
                    <Link href="/account/dashboard" className={buttonVariants({ variant: "outline", size: "lg", className: "h-11" })}>
                        Go to your properties
                    </Link>
                </div>
                {SUPPORT_WHATSAPP_IS_PLACEHOLDER ? (
                    // Only shown while lib/support.ts still has the placeholder, so it can't go live unnoticed
                    <p className="text-xs text-destructive">Placeholder: the WhatsApp number isn&apos;t set yet (lib/support.ts).</p>
                ) : null}
            </section>
        </div>
    )
}
