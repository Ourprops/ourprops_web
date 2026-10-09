import { cn } from "@/lib/utils"

type SectionHeadingProps = {
    eyebrow?: string
    heading: string
    description?: string
    align?: "left" | "center"
    className?: string
}

// Mirrors the `sectionHeader` object in the Sanity schema
export default function SectionHeading({
    eyebrow,
    heading,
    description,
    align = "left",
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
            <h2 className="text-title text-foreground mt-3">{heading}</h2>
            {description && <p className="text-lead text-copy mt-4">{description}</p>}
        </div>
    )
}
