"use client" // Error boundaries must be Client Components

import ErrorView from "@/components/error-view"

// Catches errors in any page; the root layout above it keeps working
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
    return <ErrorView error={error} retry={retry} />
}
