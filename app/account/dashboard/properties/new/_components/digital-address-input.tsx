"use client"

import { useLayoutEffect, useRef, type ChangeEvent, type FocusEvent, type KeyboardEvent } from "react"

import { Input } from "@/components/ui/input"
import { formatDigitalAddress, splitDigitalAddress } from "@/lib/digital-address"

type DigitalAddressInputProps = {
    id: string
    value: string
    onChange: (value: string) => void
    regionLetter?: string
    invalid?: boolean
    describedBy?: string
}

// A GhanaPost GPS address as two boxes that act as one: the letters, then the numbers on the phone's number keypad
export default function DigitalAddressInput({ id, value, onChange, regionLetter, invalid, describedBy }: DigitalAddressInputProps) {
    const lettersRef = useRef<HTMLInputElement>(null)
    const numbersRef = useRef<HTMLInputElement>(null)
    // Where the caret goes in the numbers box after the dashes are redrawn, counted in digits so a dash doesn't shift it
    const caretDigits = useRef<number | null>(null)

    const { letters, numbers } = splitDigitalAddress(value)

    useLayoutEffect(() => {
        const input = numbersRef.current
        if (caretDigits.current === null || !input) return

        let position = 0
        for (let seen = 0; position < input.value.length && seen < caretDigits.current; position++) {
            if (/\d/.test(input.value[position])) seen++
        }
        input.setSelectionRange(position, position)
        caretDigits.current = null
    })

    function handleLettersFocus() {
        // Start with the region's letter, selected, so typing the district letter or the whole prefix both work
        if (value || !regionLetter) return
        onChange(regionLetter)
        requestAnimationFrame(() => lettersRef.current?.select())
    }

    function handleLettersChange(event: ChangeEvent<HTMLInputElement>) {
        const text = event.target.value

        // A whole address typed or pasted here is spread across both boxes
        if (/\d/.test(text)) {
            onChange(formatDigitalAddress(text, regionLetter))
            numbersRef.current?.focus()
            return
        }

        const typed = text.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2)
        const next = formatDigitalAddress(typed + numbers, regionLetter)
        onChange(next)
        // Move on once both letters are in; deleting a letter never completes them, so it stays put
        const nextLetters = splitDigitalAddress(next).letters
        if (nextLetters.length === 2 && nextLetters !== letters) numbersRef.current?.focus()
    }

    function handleNumbersChange(event: ChangeEvent<HTMLInputElement>) {
        const input = event.target

        // A whole address pasted here, letters and all
        if (/[a-z]/i.test(input.value)) {
            onChange(formatDigitalAddress(input.value, regionLetter))
            return
        }

        caretDigits.current = input.value.slice(0, input.selectionStart ?? input.value.length).replace(/\D/g, "").length
        onChange(formatDigitalAddress((letters || regionLetter || "") + input.value, regionLetter))
    }

    function handleNumbersKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        // Backspace at the start of the numbers carries on into the letters, as it would in one field
        const { selectionStart, selectionEnd } = event.currentTarget
        if (event.key === "Backspace" && selectionStart === 0 && selectionEnd === 0) {
            event.preventDefault()
            lettersRef.current?.focus()
        }
    }

    function handleBlur(event: FocusEvent<HTMLDivElement>) {
        // Leaving with only the prefilled letter means the field wasn't used, so it stays empty and optional
        if (event.currentTarget.contains(event.relatedTarget)) return
        if (regionLetter && value === regionLetter) onChange("")
    }

    return (
        <div className="flex items-center gap-2" onBlur={handleBlur}>
            <Input
                ref={lettersRef}
                id={id}
                name="digital_address_letters"
                value={letters}
                onFocus={handleLettersFocus}
                onChange={handleLettersChange}
                placeholder={regionLetter ?? "GA"}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={invalid}
                aria-describedby={describedBy}
                className="h-11 w-16 bg-card text-center tracking-widest uppercase placeholder:normal-case"
            />
            <span aria-hidden className="text-muted-foreground">
                –
            </span>
            <Input
                ref={numbersRef}
                name="digital_address_numbers"
                value={numbers}
                onChange={handleNumbersChange}
                onKeyDown={handleNumbersKeyDown}
                inputMode="numeric"
                placeholder="183-4290"
                autoComplete="off"
                aria-label="Digital address numbers"
                aria-invalid={invalid}
                aria-describedby={describedBy}
                className="h-11 flex-1 bg-card tracking-wider"
            />
        </div>
    )
}
