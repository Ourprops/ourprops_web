import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MAX_NOTE_LENGTH } from "@/lib/validators/admin"

// The fields the review forms are built from. Each posts under its name, so the actions read them from FormData.

export function FormField({
    id,
    label,
    hint,
    children,
}: {
    id: string
    label: string
    hint?: string
    children: React.ReactNode
}) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            {children}
            {hint ? (
                <p id={`${id}-hint`} className="text-xs text-muted-foreground">
                    {hint}
                </p>
            ) : null}
        </div>
    )
}

// One of a fixed set of values, labelled for the admin
export function ChoiceField({
    id,
    name,
    label,
    options,
    defaultValue = null,
    placeholder = "Choose one",
}: {
    id: string
    name: string
    label: string
    options: Record<string, string>
    defaultValue?: string | null
    placeholder?: string
}) {
    // A value that isn't one of the options, such as 'unreviewed', starts empty so the admin picks deliberately
    const current = defaultValue !== null && defaultValue in options ? defaultValue : null

    return (
        <FormField id={id} label={label}>
            <Select name={name} items={options} defaultValue={current}>
                <SelectTrigger id={id} className="h-9 w-full sm:w-72">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(options).map(([value, text]) => (
                        <SelectItem key={value} value={value}>
                            {text}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </FormField>
    )
}

export function TextField({
    id,
    name,
    label,
    maxLength,
}: {
    id: string
    name: string
    label: string
    maxLength: number
}) {
    return (
        <FormField id={id} label={label}>
            <Input id={id} name={name} maxLength={maxLength} className="h-9 sm:w-72" />
        </FormField>
    )
}

export function NoteField({
    id,
    name,
    label,
    hint,
    defaultValue,
    required = false,
}: {
    id: string
    name: string
    label: string
    hint?: string
    defaultValue?: string | null
    // The browser stops the form and points here while it's empty; the action and the database check again
    required?: boolean
}) {
    return (
        <FormField id={id} label={required ? `${label} (required)` : label} hint={hint}>
            <Textarea
                id={id}
                name={name}
                defaultValue={defaultValue ?? ""}
                maxLength={MAX_NOTE_LENGTH}
                required={required}
                aria-describedby={hint ? `${id}-hint` : undefined}
            />
        </FormField>
    )
}

// Yes or no with nothing chosen at first, when the admin has to decide rather than accept a default.
// Native radios, so the answer posts with the form; nothing chosen posts nothing.
export function YesNoField({
    name,
    legend,
    defaultValue,
}: {
    name: string
    legend: string
    defaultValue?: boolean
}) {
    return (
        <fieldset className="grid gap-1.5">
            <legend className="text-sm font-medium">{legend}</legend>
            <div className="flex gap-4 text-sm">
                {(["yes", "no"] as const).map((value) => (
                    <label key={value} className="flex items-center gap-2">
                        <input
                            type="radio"
                            name={name}
                            value={value}
                            defaultChecked={defaultValue === undefined ? false : defaultValue === (value === "yes")}
                            className="size-4 accent-primary"
                        />
                        {value === "yes" ? "Yes" : "No"}
                    </label>
                ))}
            </div>
        </fieldset>
    )
}
