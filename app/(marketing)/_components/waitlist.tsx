"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
	WAITLIST_ROLES,
	type WaitlistSignupInput,
	waitlistSignupSchema,
} from "@/lib/validators/waitlist"
import { useJoinWaitlist } from "@/lib/queries/waitlist"
import type { HomeContent } from "@/lib/content/defaults"

const fieldClassName =
	"w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:border-ring aria-invalid:border-destructive"

export default function Waitlist({ content }: { content: HomeContent["waitlist"] }) {
	const [email, setEmail] = useState("")
	const [role, setRole] = useState<WaitlistSignupInput["role"] | "">("")
	const [emailTouched, setEmailTouched] = useState(false)
	const [roleError, setRoleError] = useState<string | null>(null)
	const joinWaitlist = useJoinWaitlist()

	const submitted = joinWaitlist.isSuccess
	const isSubmitting = joinWaitlist.isPending

	// Validate the email once the person has left the field, not only on submit
	const emailValid = waitlistSignupSchema.shape.email.safeParse(email).success
	const emailError = emailTouched && !emailValid ? "Enter a valid email address." : null

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()

		setEmailTouched(true)
		setRoleError(role ? null : "Choose the option that describes you best.")
		joinWaitlist.reset()

		const parsed = waitlistSignupSchema.safeParse({ email, role })
		if (!parsed.success) return

		joinWaitlist.mutate(parsed.data)
	}

	return (
		<section className="w-full bg-primary py-20 text-primary-foreground md:py-28" id="waitlist">
			<div className="mx-auto max-w-310 px-5 md:px-8">
				<div className="mx-auto flex max-w-2xl flex-col items-center text-center">
					<p className="text-eyebrow text-white/70">{content.header.eyebrow}</p>

					<h2 className="text-title mt-3">{content.header.heading}</h2>

					<p className="text-lead mt-4 max-w-xl text-white/80">{content.header.description}</p>

					<div className="mt-10 w-full max-w-lg rounded-2xl bg-card p-6 text-left text-foreground shadow-[0_32px_64px_-24px_rgba(0,0,0,0.45)] sm:p-8">
						{!submitted ? (
							<form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
								<div>
									<label className="mb-1.5 block text-sm font-medium" htmlFor="waitlist-email">
										Email address
									</label>
									<input
										id="waitlist-email"
										name="email"
										type="email"
										autoComplete="email"
										inputMode="email"
										required
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										onBlur={() => setEmailTouched(email.length > 0)}
										placeholder="you@example.com"
										aria-invalid={emailError ? true : undefined}
										aria-describedby={emailError ? "waitlist-email-error" : undefined}
										className={fieldClassName}
									/>
									{emailError && (
										<p id="waitlist-email-error" className="mt-1.5 text-sm text-destructive">
											{emailError}
										</p>
									)}
								</div>

								<div>
									<label className="mb-1.5 block text-sm font-medium" htmlFor="waitlist-role">
										I am a…
									</label>
									<Select
										value={role}
										onValueChange={(value) => {
											setRole(value as WaitlistSignupInput["role"])
											setRoleError(null)
										}}
									>
										<SelectTrigger
											id="waitlist-role"
											className={cn(fieldClassName, "data-[size=default]:h-12 text-base data-placeholder:text-muted-foreground")}
											aria-invalid={roleError ? true : undefined}
											aria-describedby={roleError ? "waitlist-role-error" : undefined}
										>
											<SelectValue placeholder="Select your role" />
										</SelectTrigger>
										<SelectContent>
											{WAITLIST_ROLES.map((roleName) => (
												<SelectItem key={roleName} value={roleName}>
													{roleName}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{roleError && (
										<p id="waitlist-role-error" className="mt-1.5 text-sm text-destructive">
											{roleError}
										</p>
									)}
								</div>

								<Button
									type="submit"
									disabled={isSubmitting}
									className="pressable mt-1 h-12 w-full rounded-lg bg-secondary text-[15px] text-secondary-foreground hover:bg-secondary/90"
								>
									{isSubmitting ? "Joining…" : content.submitLabel}
									{!isSubmitting && <ArrowRight size={16} aria-hidden />}
								</Button>

								{joinWaitlist.error && (
									<p role="alert" className="text-center text-sm text-destructive">
										{joinWaitlist.error.message}
									</p>
								)}

								<p className="text-center text-sm text-copy">
									{content.privacyNote}
								</p>
							</form>
						) : (
							<div className="flex flex-col items-center py-6 text-center" role="status">
								<span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
									<CheckCircle2 size={26} aria-hidden />
								</span>
								<h3 className="text-heading mt-4">{content.successTitle}</h3>
								<p className="mt-2 text-base text-copy">
									{content.successMessage}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</section>
	)
}
