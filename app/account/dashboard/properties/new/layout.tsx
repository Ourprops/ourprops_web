import { ownerInter } from "@/components/owner/owner-fonts"
import { cn } from "@/lib/utils"

import ProgressIndicator from "./_components/progress-indicator"

export default function NewPropertyLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        // The owner area's look (app/globals.css, owner-ui): Inter and softer corners, on every screen of the flow
        <div className={cn(ownerInter.variable, "owner-ui flex min-h-screen flex-col bg-card")}>
            <ProgressIndicator />
            {children}
        </div>
    )
}
