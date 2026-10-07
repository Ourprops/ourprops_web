"use client"

import { useState } from "react"
import { ArrowRight, CheckCircle2, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	WAITLIST_ROLES,
	type WaitlistSignupInput,
	waitlistSignupSchema,
} from "@/lib/validators/waitlist"
import { useJoinWaitlist } from "@/lib/queries/waitlist"

export default function Waitlist() {
	const [email, setEmail] = useState("")
	const [role, setRole] = useState<WaitlistSignupInput["role"] | "">("")
	const [validationError, setValidationError] = useState<string | null>(null)
	const joinWaitlist = useJoinWaitlist()

	const submitted = joinWaitlist.isSuccess
	const isSubmitting = joinWaitlist.isPending
	const errorMessage = validationError ?? joinWaitlist.error?.message ?? null

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()

		setValidationError(null)
		joinWaitlist.reset()

		const parsed = waitlistSignupSchema.safeParse({ email, role })
		if (!parsed.success) {
			setValidationError("Please enter a valid email and choose your role.")
			return
		}

		joinWaitlist.mutate(parsed.data)
	}

	return (
		<section
			className="w-full bg-primary text-primary-foreground py-14 sm:py-20 md:py-28"
			id="waitlist"
		>
			<div className="max-w-310 mx-auto px-4 md:px-8">
				<div className="max-w-2xl mx-auto text-center flex flex-col items-center">
					<span className="px-3 py-1 rounded-full bg-white/10 text-white/85 text-xs font-semibold uppercase tracking-widest mb-4">
						Early Access Registration
					</span>

					<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance">
						Be among the first to use OurProps.
					</h2>

					<p className="text-base sm:text-lg text-white/80 mt-4 max-w-xl">
						Join our list to get launch updates, new features, and practical
						insights for managing land and property confidently.
					</p>

					<div className="w-full max-w-lg mt-8 sm:mt-10 p-4 sm:p-6 md:p-8 rounded-2xl bg-card text-foreground shadow-xl">
						{!submitted ? (
							<form className="flex flex-col gap-4 text-left" onSubmit={handleSubmit}>
								<div>
									<label
										className="block text-sm font-medium text-foreground mb-1.5"
										htmlFor="waitlist-email"
									>
										Email address
									</label>
									<input
										id="waitlist-email"
										name="email"
										type="email"
										required
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										placeholder="Enter your email"
										className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
									/>
								</div>

								<div>
									<label
										className="block text-sm font-medium text-foreground mb-1.5"
										htmlFor="waitlist-role"
									>
										I am a...
									</label>
										<Select value={role} onValueChange={(value) => setRole(value as WaitlistSignupInput["role"])}>
										<SelectTrigger
											id="waitlist-role"
											className="w-full h-12 px-4 bg-background"
											size="default"
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
								</div>

								<Button
									type="submit"
									disabled={isSubmitting}
									className="w-full h-12 mt-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm"
								>
									{isSubmitting ? "Submitting..." : "Join the waitlist"}
									<ArrowRight size={18} />
								</Button>

								{errorMessage && (
									<p className="text-sm text-destructive text-center mt-1">{errorMessage}</p>
								)}

								<p className="text-xs sm:text-sm text-muted-foreground text-center mt-1">
									No spam. We&apos;ll only share product updates, launch news, and
									important platform announcements.
								</p>
							</form>
						) : (
							<div className="text-center py-4 sm:py-6 flex flex-col items-center">
								<div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
									<CheckCircle2 size={28} />
								</div>
								<h4 className="text-xl sm:text-2xl text-foreground font-semibold">
									You&apos;re on the list.
								</h4>
								<p className="text-sm sm:text-base text-muted-foreground mt-2">
									Thank you for signing up. We&apos;ll be in touch as soon as access
									opens.
								</p>
							</div>
						)}
					</div>

					<div className="mt-6 sm:mt-8 text-white/70 text-xs sm:text-sm flex items-start sm:items-center gap-2 text-left sm:text-center">
						<Info size={16} className="shrink-0 mt-0.5 sm:mt-0" />
						<span>
							Independent digital organization tool. Not a substitute for
							statutory land registry processes.
						</span>
					</div>
				</div>
			</div>
		</section>
	)
}
