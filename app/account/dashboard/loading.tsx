import BrandLoader from "@/components/brand-loader"

// Shown while a dashboard page loads on the server, e.g. right after signing in or when resuming a draft
export default function DashboardLoading() {
    return (
        <main className="survey-grid flex min-h-screen items-center justify-center bg-background">
            <BrandLoader message="Loading" />
        </main>
    )
}
