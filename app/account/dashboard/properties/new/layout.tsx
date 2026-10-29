import ProgressIndicator from "./_components/progress-indicator"

export default function NewPropertyLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <ProgressIndicator />
            {children}
        </div>
    )
}
