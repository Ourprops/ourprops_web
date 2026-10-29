"use client"

import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useNewPropertyStore } from "@/stores/new-property-store"

type BackButtonProps = {
    /** Holds the user on the screen while something, such as an upload, would be lost by leaving it */
    disabled?: boolean
    className?: string
}

// Goes to the previous screen, or back to review when the user came from there, like the arrow in the header
export default function BackButton({ disabled, className }: BackButtonProps) {
    const handleBack = useNewPropertyStore((state) => state.handleBack)

    return (
        <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={disabled}
            className={cn("pressable h-12 w-full rounded-lg px-6 text-[15px] text-primary hover:bg-card sm:w-auto", className)}
        >
            <ArrowLeft size={16} aria-hidden />
            Back
        </Button>
    )
}
