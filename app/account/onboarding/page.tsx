"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import BrandLoader from "@/components/brand-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAuthError } from "@/lib/supabase/auth";
import { type Profile, useCompleteOnboarding, useMyProfile } from "@/lib/queries/profile";
import { ONBOARDING_ROLE_LABELS, ONBOARDING_ROLES, onboardingSchema } from "@/lib/validators/onboarding";
import AuthShell from "../_components/auth-shell";

type OnboardingRole = (typeof ONBOARDING_ROLES)[number];

type FormErrors = {
    role?: string;
    phoneNumber?: string;
    form?: string;
};

// Where users land once onboarding is done
const AFTER_ONBOARDING_PATH = "/account/dashboard";

// Access is enforced by the proxy: signed-out users are sent to /login and
// users who have finished onboarding are sent to /account/dashboard before this renders.
export default function OnboardingPage() {
    const { data: profile, isPending, isError } = useMyProfile();

    const isReady = profile != null && !profile.onboarding_complete;
    // The proxy keeps finished users off this page, so a finished profile here means the form was
    // just submitted: show the loading screen while the dashboard loads
    const isFinished = profile?.onboarding_complete === true;

    return (
        <AuthShell>
            <section>
                {isReady ? (
                    <OnboardingForm profile={profile} />
                ) : (
                    <div className="flex justify-center py-10" role="status" aria-label="Loading">
                        {(isError && !isPending) || profile === null ? (
                            <p className="text-sm text-destructive">
                                We couldn&apos;t load your profile. Please refresh and try again.
                            </p>
                        ) : (
                            <span
                                aria-hidden="true"
                                className="h-6 w-6 animate-spin rounded-full border-2 border-primary/70 border-t-transparent"
                            />
                        )}
                    </div>
                )}
            </section>
            {isFinished && <BrandLoader overlay message="Setting up your account" />}
        </AuthShell>
    );
}

function OnboardingForm({ profile }: { profile: Profile }) {
    const router = useRouter();
    const completeOnboarding = useCompleteOnboarding();
    const [errors, setErrors] = useState<FormErrors>({});

    const [role, setRole] = useState<OnboardingRole | "">(
        ONBOARDING_ROLES.find((option) => option === profile.role) ?? ""
    );
    const [phoneNumber, setPhoneNumber] = useState(profile.phone_number ?? "");

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const parsed = onboardingSchema.safeParse({ role, phoneNumber });

        if (!parsed.success) {
            const next: FormErrors = {};
            for (const issue of parsed.error.issues) {
                const field = issue.path[0];
                if (field === "role") next.role ??= issue.message;
                if (field === "phoneNumber") next.phoneNumber ??= issue.message;
            }
            setErrors(next);
            return;
        }

        setErrors({});
        completeOnboarding.mutate(
            { userId: profile.id, ...parsed.data },
            {
                onSuccess: () => router.replace(AFTER_ONBOARDING_PATH),
                onError: (error) => {
                    console.error("Error completing onboarding:", error);
                    setErrors({ form: formatAuthError(error).message });
                },
            }
        );
    }

    const isLoading = completeOnboarding.isPending;
    const firstName = profile.full_name.trim().split(/\s+/)[0];

    return (
        <>
            <header className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                    {firstName ? `Welcome, ${firstName}` : "Welcome to OurProps"}
                </h1>
                <p className="mt-2 text-[15px] leading-relaxed text-copy">
                    Tell us a little about yourself to finish setting up your account.
                </p>
            </header>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div>
                    <span id="role-label" className="mb-1.5 block text-sm font-medium text-foreground">
                        I am a
                    </span>
                    <div
                        role="radiogroup"
                        aria-labelledby="role-label"
                        aria-invalid={Boolean(errors.role)}
                        aria-describedby={errors.role ? "role-error" : undefined}
                        className="grid grid-cols-2 gap-2"
                    >
                        {ONBOARDING_ROLES.map((option) => (
                            <Button
                                key={option}
                                type="button"
                                role="radio"
                                aria-checked={role === option}
                                variant="outline"
                                onClick={() => setRole(option)}
                                className={`pressable h-11 rounded-lg text-sm font-medium transition ${
                                    role === option
                                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                                        : "border-border bg-card text-copy hover:text-primary"
                                }`}
                            >
                                {ONBOARDING_ROLE_LABELS[option]}
                            </Button>
                        ))}
                    </div>
                    {errors.role ? (
                        <p id="role-error" className="mt-1.5 text-sm text-destructive">
                            {errors.role}
                        </p>
                    ) : null}
                </div>

                <div>
                    <label htmlFor="phone-number" className="mb-1.5 block text-sm font-medium text-foreground">
                        Phone number
                    </label>
                    <Input
                        id="phone-number"
                        type="tel"
                        autoComplete="tel"
                        value={phoneNumber}
                        onChange={(event) => setPhoneNumber(event.target.value)}
                        aria-invalid={Boolean(errors.phoneNumber)}
                        aria-describedby={errors.phoneNumber ? "phone-number-error" : undefined}
                        className="text-data h-11 bg-card px-3"
                        placeholder="+233 20 000 0000"
                    />
                    {errors.phoneNumber ? (
                        <p id="phone-number-error" className="mt-1.5 text-sm text-destructive">
                            {errors.phoneNumber}
                        </p>
                    ) : null}
                </div>

                {errors.form ? <p className="text-sm text-destructive">{errors.form}</p> : null}

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="pressable h-11 w-full bg-secondary text-[15px] font-semibold text-secondary-foreground hover:bg-secondary/90"
                >
                    {isLoading ? (
                        <span
                            aria-hidden="true"
                            className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"
                        />
                    ) : null}
                    {isLoading ? "Saving..." : "Continue"}
                </Button>
            </form>
        </>
    );
}
