"use client"

import { CircleCheck } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

import { saveOwnDetails } from "./actions"

export function DetailsForm({ fullName, phoneNumber }: { fullName: string; phoneNumber: string | null }) {
    const [state, save, saving] = useActionState(saveOwnDetails, null)

    return (
        <form action={save} className="grid gap-5">
            <div className="grid gap-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" defaultValue={fullName} required autoComplete="name" className="h-11 text-base sm:text-sm" />
                <p className="text-xs text-muted-foreground">As it is on your Ghana Card or passport. We check the two match.</p>
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="phone_number">Phone number</Label>
                <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    inputMode="tel"
                    defaultValue={phoneNumber ?? ""}
                    required
                    autoComplete="tel"
                    placeholder="024 123 4567"
                    className="h-11 text-base sm:w-72 sm:text-sm"
                />
                <p className="text-xs text-muted-foreground">So our team can reach you about your property. Include the country code if it isn&apos;t a Ghana number.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={saving} className="h-11 w-full sm:w-fit sm:px-6">
                    {saving ? <Spinner /> : null}
                    {saving ? "Saving…" : "Save changes"}
                </Button>
                <p role="status" aria-live="polite" className="text-sm">
                    {state && "saved" in state ? (
                        <span className="flex items-center gap-1.5 text-success">
                            <CircleCheck size={16} aria-hidden /> Saved
                        </span>
                    ) : state && "error" in state ? (
                        <span className="text-destructive">{state.error}</span>
                    ) : null}
                </p>
            </div>
        </form>
    )
}
