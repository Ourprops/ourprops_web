import { cn } from "@/lib/utils"

type SectionHeadingProps = {
    eyebrow?: string
    heading: string
    description?: string
    align?: "left" | "center"
    /** h1 when the section opens its own page (/how-it-works, /about…); h2 on the homepage */
    as?: "h1" | "h2"
    className?: string
}

// Mirrors the `sectionHeader` object in the Sanity schema
export default function SectionHeading({
    eyebrow,
    heading,
    description,
    align = "left",
    as: Heading = "h2",
    className,
}: SectionHeadingProps) {
    return (
        <div
            className={cn(
                "max-w-2xl",
                align === "center" && "mx-auto text-center",
                className
            )}
        >
            {eyebrow && <p className="text-eyebrow text-secondary">{eyebrow}</p>}
            <Heading className={cn(Heading === "h1" ? "text-display" : "text-title", "text-foreground mt-3")}>{heading}</Heading>
            {description && <p className="text-lead text-copy mt-4">{description}</p>}
        </div>
    )
}
