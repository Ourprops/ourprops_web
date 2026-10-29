import Link from "next/link"

import StatusPage from "@/components/status-page"
import { Button } from "@/components/ui/button"

// Shown for any URL that doesn't exist, and wherever a page calls notFound(), such as a draft that isn't the user's
export default function NotFound() {
    return (
        <>
            <title>Page not found · OurProps</title>
            <StatusPage
                title="No record at this address"
                description="The page you're looking for doesn't exist or has moved. Check the address for typos, or start again from the homepage."
                actions={
                    <>
                        <Button
                            render={<Link href="/" />}
                            nativeButton={false}
                            className="pressable h-12 rounded-lg bg-secondary px-6 text-[15px] text-secondary-foreground hover:bg-secondary/90"
                        >
                            Go to the homepage
                        </Button>
                        {/* Signed-out visitors are sent on to log in by the proxy */}
                        <Button
                            variant="outline"
                            render={<Link href="/account/dashboard" />}
                            nativeButton={false}
                            className="pressable h-12 rounded-lg bg-card px-6 text-[15px] text-primary hover:bg-background"
                        >
                            Go to your dashboard
                        </Button>
                    </>
                }
            >
                <p className="text-data mt-5 text-sm text-muted-foreground">Error 404</p>
            </StatusPage>
        </>
    )
}
