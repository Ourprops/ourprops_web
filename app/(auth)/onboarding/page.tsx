"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAuthError } from "@/lib/supabase/auth";
import { type Profile, useCompleteOnboarding, useMyProfile } from "@/lib/queries/profile";
import { ONBOARDING_ROLE_LABELS, ONBOARDING_ROLES, onboardingSchema } from "@/lib/validators/onboarding";

type OnboardingRole = (typeof ONBOARDING_ROLES)[number];

type FormErrors = {
    role?: string;
    phoneNumber?: string;
    form?: string;
};

// Where users land once onboarding is done
const AFTER_ONBOARDING_PATH = "/dashboard";

export default function OnboardingPage() {
    const router = useRouter();
    const { data: profile, isPending, isError } = useMyProfile();

    useEffect(() => {
        if (profile === null) {
            router.replace("/login");
        } else if (profile?.onboarding_complete) {
            router.replace(AFTER_ONBOARDING_PATH);
        }
    }, [profile, router]);

    const isReady = profile != null && !profile.onboarding_complete;

    return (
        <main className="min-h-screen bg-[#F7F9FB] text-[#102A43] flex items-center justify-center px-4 py-8">
            <section className="w-full max-w-115 rounded-2xl border border-[#D9E2EC] bg-white p-5 sm:p-8 shadow-[0_10px_24px_rgba(16,42,67,0.08)]">
                <div className="mb-4 flex justify-center">
                    <Image
                        src="/logo.svg"
                        alt="OurProps"
                        width={180}
                        height={40}
                        priority
                        className="h-auto w-auto"
                    />
                </div>

                {isReady ? (
                    <OnboardingForm profile={profile} />
                ) : (
                    <div className="flex justify-center py-10" role="status" aria-label="Loading">
                        {isError && !isPending ? (
                            <p className="text-sm text-[#C0392B]">
                                We couldn&apos;t load your profile. Please refresh and try again.
                            </p>
                        ) : (
                            <span
                                aria-hidden="true"
                                className="h-6 w-6 animate-spin rounded-full border-2 border-[#003366]/70 border-t-transparent"
                            />
                        )}
                    </div>
                )}
            </section>
        </main>
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
            <header className="mb-6 text-center">
                <h1 className="text-2xl font-semibold text-[#003366]">
                    {firstName ? `Welcome, ${firstName}` : "Welcome to OurProps"}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-[#334E68]">
                    Tell us a little about yourself to finish setting up your account.
                </p>
            </header>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                <div>
                    <span id="role-label" className="mb-1.5 block text-sm font-medium text-[#102A43]">
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
                                className={`h-11 rounded-lg text-sm font-medium transition ${
                                    role === option
                                        ? "border-[#003366] bg-[#F0F4F8] text-[#003366]"
                                        : "border-[#D9E2EC] text-[#486581] hover:text-[#003366]"
                                }`}
                            >
                                {ONBOARDING_ROLE_LABELS[option]}
                            </Button>
                        ))}
                    </div>
                    {errors.role ? (
                        <p id="role-error" className="mt-1.5 text-sm text-[#C0392B]">
                            {errors.role}
                        </p>
                    ) : null}
                </div>

                <div>
                    <label htmlFor="phone-number" className="mb-1.5 block text-sm font-medium text-[#102A43]">
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
                        className="h-11 rounded-lg border-[#D9E2EC] bg-white px-3 text-sm text-[#102A43] placeholder:text-[#7B8794] focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#003366]/30"
                        placeholder="+233 20 000 0000"
                    />
                    {errors.phoneNumber ? (
                        <p id="phone-number-error" className="mt-1.5 text-sm text-[#C0392B]">
                            {errors.phoneNumber}
                        </p>
                    ) : null}
                </div>

                {errors.form ? <p className="text-sm text-[#C0392B]">{errors.form}</p> : null}

                <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-11 w-full bg-[#FF6B35] text-sm font-semibold text-white hover:bg-[#E55D2B] focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#003366]/40"
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
