import BrandMark from "@/components/brand-mark"

type StatusPageProps = {
    title: string
    description: React.ReactNode
    /** Buttons and links under the text */
    actions: React.ReactNode
    /** Anything between the text and the actions, such as an error reference */
    children?: React.ReactNode
}

// A full-page message with the brand mark's lost-boundary picture: used by the error and not-found pages
export default function StatusPage({ title, description, actions, children }: StatusPageProps) {
    return (
        <main className="survey-grid flex min-h-screen items-center justify-center bg-background px-5 py-16 text-foreground">
            <div className="flex w-full max-w-md flex-col items-start">
                <BrandMark lost className="-ml-3 size-24" />

                <h1 className="text-title mt-4 text-[2rem]">{title}</h1>
                <p className="mt-3 text-[15px] leading-relaxed text-copy">{description}</p>

                {children}

                <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{actions}</div>
            </div>
        </main>
    )
}
