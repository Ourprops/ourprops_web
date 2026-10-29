"use client"

import { RotateCcw } from "lucide-react"
import { useEffect } from "react"

import StatusPage from "@/components/status-page"
import { Button } from "@/components/ui/button"

type ErrorViewProps = {
    error: Error & { digest?: string }
    /** Next's retry: fetches and renders the failed part of the page again */
    retry: () => void
}

// The page shown when something breaks: app/error.tsx inside the site, app/global-error.tsx when the layout itself fails
export default function ErrorView({ error, retry }: ErrorViewProps) {
    useEffect(() => {
        // Shows in the browser console; server errors are also in the server logs under the same digest
        console.error(error)
    }, [error])

    return (
        <StatusPage
            title="Something went wrong"
            description="This page didn't load properly. It's usually temporary, so try again. Anything you had already saved is still there."
            actions={
                <>
                    <Button
                        type="button"
                        onClick={retry}
                        className="pressable h-12 rounded-lg bg-secondary px-6 text-[15px] text-secondary-foreground hover:bg-secondary/90"
                    >
                        <RotateCcw size={16} aria-hidden />
                        Try again
                    </Button>
                    <Button
                        variant="outline"
                        // A full page load on purpose, not <Link>: nothing from the broken page is carried over
                        // eslint-disable-next-line @next/next/no-html-link-for-pages
                        render={<a href="/" />}
                        nativeButton={false}
                        className="pressable h-12 rounded-lg bg-card px-6 text-[15px] text-primary hover:bg-background"
                    >
                        Go to the homepage
                    </Button>
                </>
            }
        >
            {/* The digest matches the server logs, so support can find the real error from it */}
            {error.digest && (
                <p className="mt-5 text-sm text-copy">
                    If it keeps happening, contact us with this reference:{" "}
                    <span className="text-data rounded bg-card px-1.5 py-0.5 text-foreground ring-1 ring-border">
                        {error.digest}
                    </span>
                </p>
            )}

            {/* Only in development: the message can include details that shouldn't reach users */}
            {process.env.NODE_ENV === "development" && error.message && (
                <pre className="text-data mt-5 w-full overflow-x-auto rounded-lg border border-destructive/30 bg-card p-3 text-xs whitespace-pre-wrap text-destructive">
                    {error.message}
                </pre>
            )}
        </StatusPage>
    )
}
