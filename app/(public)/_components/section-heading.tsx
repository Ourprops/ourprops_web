import { cn } from "@/lib/utils"

type SectionHeadingProps = {
    eyebrow?: string
    heading: string
    description?: string
    align?: "left" | "center"
    /** h1 when the section opens its own page (/how-it-works, /about…); h2 on the homepage */
    as?: "h1" | "h2"
    /** for aria-labelledby on the section */
    id?: string
    className?: string
}

// Mirrors the `sectionHeader` object in the Sanity schema
export default function SectionHeading({
    eyebrow,
    heading,
    description,
    align = "left",
    as: Heading = "h2",
    id,
    className,
}: SectionHeadingProps) {
    return (
        <div
            className={cn(
                "max-w-3xl",
                align === "center" && "mx-auto text-center",
                className
            )}
        >
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {/* a plain string, not cn(): tailwind-merge reads text-hero/text-section and text-ink as the same group and drops the size */}
            <Heading id={id} className={`${Heading === "h1" ? "text-hero" : "text-section"} mt-4 text-ink`}>{heading}</Heading>
            {description && <p className="text-lead text-copy mt-5">{description}</p>}
        </div>
    )
}

// A small label above a headline: dark text with an orange dot, as orange text this small fails contrast on white
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p
            className={cn(
                "inline-flex items-center gap-2 rounded-full bg-ink/5 px-3 py-1 text-sm font-semibold text-ink",
                className
            )}
        >
            <span className="size-1.5 rounded-full bg-secondary" aria-hidden />
            {children}
        </p>
    )
}
