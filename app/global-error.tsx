"use client" // Error boundaries must be Client Components

import ErrorView from "@/components/error-view"
import { plexMono, plexSans } from "./fonts"
import "./globals.css"

// Replaces the root layout when the layout itself fails, so it brings its own document, styles and fonts.
// Metadata exports aren't supported here, hence the <title> element.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
    return (
        <html lang="en" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
            <body className="min-h-full">
                <title>Something went wrong · OurProps</title>
                <ErrorView error={error} retry={retry} />
            </body>
        </html>
    )
}
