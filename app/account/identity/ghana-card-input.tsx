"use client"

import { Check } from "lucide-react"
import { useState } from "react"

import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"
import { formatGhanaCardDigits, ghanaCardDigits } from "@/lib/validators/identity"

// The Ghana Card number as it is printed: GHA- is already there, the phone shows its number pad, and the dash before
// the last digit appears on its own. Pasting the whole number, with or without GHA and dashes, works too.
// Posts the full number, GHA-123456789-0, as document_number.
export function GhanaCardInput() {
    const [digits, setDigits] = useState("")
    const complete = digits.length === 10

    return (
        <div className="grid gap-1.5">
            <Label htmlFor="ghana_card_number">Personal ID Number</Label>
            <InputGroup className="h-11 sm:w-72">
                <InputGroupAddon>
                    <InputGroupText className="text-data font-medium text-foreground">GHA-</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                    id="ghana_card_number"
                    inputMode="numeric"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="123456789-0"
                    value={formatGhanaCardDigits(digits)}
                    onChange={(event) => setDigits(ghanaCardDigits(event.target.value))}
                    aria-describedby="ghana_card_number-hint"
                    className="text-data text-base tracking-wide"
                />
                {complete ? (
                    <InputGroupAddon align="inline-end">
                        <Check size={18} className="text-success" aria-label="Complete" />
                    </InputGroupAddon>
                ) : null}
            </InputGroup>
            <input type="hidden" name="document_number" value={digits ? `GHA-${formatGhanaCardDigits(digits)}` : ""} />
            <p id="ghana_card_number-hint" className="text-xs text-muted-foreground">
                On the front of your card, under &ldquo;Personal ID Number&rdquo;. Type the 10 digits after GHA.
                {digits.length > 0 && !complete ? ` ${10 - digits.length} more to go.` : ""}
            </p>
        </div>
    )
}
