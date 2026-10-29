"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import type { Factor } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAuthError, signOut } from "@/lib/supabase/auth";
import { type Profile, useMyProfile } from "@/lib/queries/profile";
import {
    type MfaStatus,
    type PendingTotp,
    useEnrollTotp,
    useMfaStatus,
    useRemoveFactor,
    useVerifyCode,
} from "@/lib/queries/mfa";

const inputClassName =
    "h-11 rounded-lg border-[#D9E2EC] bg-white px-3 text-sm text-[#102A43] placeholder:text-[#7B8794] focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#003366]/30";
const primaryButtonClassName =
    "h-11 w-full bg-[#FF6B35] text-sm font-semibold text-white hover:bg-[#E55D2B] focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#003366]/40";

// Codes are six digits; people often type or paste them with a space in the middle
function normaliseCode(value: string) {
    return value.replace(/\s/g, "");
}

function isValidCode(code: string) {
    return /^\d{6}$/.test(code);
}

// Where a user goes once they've entered a code
function homePath(profile: Profile) {
    return profile.role === "admin" ? "/admin" : "/account/dashboard";
}

// Access is enforced by the proxy: signed-out users are sent to /account/login, and users who sign in
// with an authenticator app are sent here to enter its code before any other signed-in page.
export default function SecurityPage() {
    const profile = useMyProfile();
    const mfa = useMfaStatus();

    const isError = profile.isError || mfa.isError || profile.data === null;

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

                {profile.data && mfa.data ? (
                    mfa.data.needsCode ? (
                        <EnterCode profile={profile.data} factors={mfa.data.factors} />
                    ) : (
                        <ManageApps profile={profile.data} status={mfa.data} />
                    )
                ) : (
                    <div className="flex justify-center py-10" role="status" aria-label="Loading">
                        {isError ? (
                            <p className="text-sm text-[#C0392B]">
                                We couldn&apos;t load your security settings. Please refresh and try again.
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

// After the password: a code from one of the user's apps raises the session to aal2
function EnterCode({ profile, factors }: { profile: Profile; factors: Factor[] }) {
    const router = useRouter();
    const verifyCode = useVerifyCode();
    const [factorId, setFactorId] = useState(factors[0].id);
    const [code, setCode] = useState("");
    const [error, setError] = useState<string>();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const normalised = normaliseCode(code);

        if (!isValidCode(normalised)) {
            setError("Enter the 6-digit code from your authenticator app.");
            return;
        }

        setError(undefined);
        verifyCode.mutate(
            { factorId, code: normalised },
            {
                onSuccess: () => {
                    router.replace(homePath(profile));
                    router.refresh();
                },
                onError: (mutationError) => {
                    setCode("");
                    setError(formatAuthError(mutationError).message);
                },
            }
        );
    }

    async function handleSignOut() {
        await signOut();
        router.replace("/account/login");
    }

    return (
        <>
            <header className="mb-6 text-center">
                <h1 className="text-2xl font-semibold text-[#003366]">Enter your code</h1>
                <p className="mt-2 text-sm sm:text-base text-[#334E68]">
                    Open your authenticator app and enter the 6-digit code for OurProps.
                </p>
            </header>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
                {factors.length > 1 ? (
                    <div>
                        <label htmlFor="factor" className="mb-1.5 block text-sm font-medium text-[#102A43]">
                            App
                        </label>
                        <select
                            id="factor"
                            value={factorId}
                            onChange={(event) => setFactorId(event.target.value)}
                            className={`w-full border ${inputClassName}`}
                        >
                            {factors.map((factor) => (
                                <option key={factor.id} value={factor.id}>
                                    {factor.friendly_name || "Authenticator app"}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}

                <CodeInput value={code} onChange={setCode} error={error} />

                <Button type="submit" disabled={verifyCode.isPending} className={primaryButtonClassName}>
                    {verifyCode.isPending ? "Checking..." : "Continue"}
                </Button>

                <p className="text-center text-sm text-[#486581]">
                    Not you?{" "}
                    <Button
                        type="button"
                        variant="link"
                        onClick={handleSignOut}
                        className="h-auto p-0 font-semibold text-[#003366]"
                    >
                        Sign out
                    </Button>
                </p>
            </form>
        </>
    );
}

// Signed in with a code, or with no app yet: list, add and remove apps
function ManageApps({ profile, status }: { profile: Profile; status: MfaStatus }) {
    const removeFactor = useRemoveFactor();
    const [error, setError] = useState<string>();
    const isAdmin = profile.role === "admin";

    function handleRemove(factor: Factor) {
        const isLast = status.factors.length === 1;
        const warning =
            isAdmin && isLast
                ? "This is your only app. Removing it ends your access to the admin console until you add another. Remove it?"
                : `Remove ${factor.friendly_name || "this app"}? You won't be able to sign in with it any more.`;

        if (!window.confirm(warning)) {
            return;
        }

        setError(undefined);
        removeFactor.mutate(
            { factorId: factor.id },
            { onError: (mutationError) => setError(formatAuthError(mutationError).message) }
        );
    }

    return (
        <>
            <header className="mb-6 text-center">
                <h1 className="text-2xl font-semibold text-[#003366]">Sign-in security</h1>
                <p className="mt-2 text-sm sm:text-base text-[#334E68]">
                    With an authenticator app, signing in needs a code from your phone as well as your password.
                </p>
            </header>

            {isAdmin && status.factors.length === 0 ? (
                <p className="mb-4 rounded-lg border border-[#F5C6A5] bg-[#FFF4EC] p-3 text-sm text-[#102A43]">
                    Admins must add an authenticator app before they can use the admin console.
                </p>
            ) : null}
            {isAdmin && status.factors.length === 1 ? (
                <p className="mb-4 rounded-lg border border-[#D9E2EC] bg-[#F7F9FB] p-3 text-sm text-[#334E68]">
                    Add a second app, such as a password manager, so you can still sign in if you lose your phone.
                </p>
            ) : null}

            {status.factors.length > 0 ? (
                <ul className="mb-4 divide-y divide-[#D9E2EC] rounded-lg border border-[#D9E2EC]">
                    {status.factors.map((factor) => (
                        <li key={factor.id} className="flex items-center justify-between gap-3 p-3">
                            <div>
                                <p className="text-sm font-medium text-[#102A43]">
                                    {factor.friendly_name || "Authenticator app"}
                                </p>
                                <p className="text-xs text-[#486581]">
                                    Added {new Date(factor.created_at).toLocaleDateString()}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={removeFactor.isPending}
                                onClick={() => handleRemove(factor)}
                                className="text-sm font-medium text-[#C0392B] hover:bg-[#FDECEA]"
                            >
                                Remove
                            </Button>
                        </li>
                    ))}
                </ul>
            ) : null}

            {error ? <p className="mb-4 text-sm text-[#C0392B]">{error}</p> : null}

            <AddApp appCount={status.factors.length} />

            <p className="mt-6 text-center text-sm">
                {isAdmin && status.enteredCode ? (
                    <Link href="/admin" className="font-semibold text-[#003366] hover:underline">
                        Go to the admin console
                    </Link>
                ) : (
                    <Link href="/account/dashboard" className="font-semibold text-[#003366] hover:underline">
                        Back to your dashboard
                    </Link>
                )}
            </p>
        </>
    );
}

// Name the app, scan the QR code, then enter a code from it to finish
function AddApp({ appCount }: { appCount: number }) {
    const enrollTotp = useEnrollTotp();
    const verifyCode = useVerifyCode();
    const removeFactor = useRemoveFactor();
    const [isAdding, setIsAdding] = useState(false);
    const [friendlyName, setFriendlyName] = useState("");
    const [pending, setPending] = useState<PendingTotp>();
    const [code, setCode] = useState("");
    const [error, setError] = useState<string>();

    function reset() {
        setIsAdding(false);
        setFriendlyName("");
        setPending(undefined);
        setCode("");
        setError(undefined);
    }

    function handleStart() {
        setIsAdding(true);
        setFriendlyName(appCount === 0 ? "Authenticator app" : `Authenticator app ${appCount + 1}`);
    }

    function handleEnroll(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const name = friendlyName.trim();

        if (!name) {
            setError("Give the app a name, such as the phone it's on.");
            return;
        }

        setError(undefined);
        enrollTotp.mutate(
            { friendlyName: name },
            {
                onSuccess: setPending,
                onError: (mutationError) => setError(formatAuthError(mutationError).message),
            }
        );
    }

    function handleVerify(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const normalised = normaliseCode(code);

        if (!pending || !isValidCode(normalised)) {
            setError("Enter the 6-digit code your app shows.");
            return;
        }

        setError(undefined);
        verifyCode.mutate(
            { factorId: pending.factorId, code: normalised },
            {
                onSuccess: reset,
                onError: (mutationError) => {
                    setCode("");
                    setError(formatAuthError(mutationError).message);
                },
            }
        );
    }

    // The half-set-up app is removed so it doesn't linger; it would be cleared on the next try anyway
    function handleCancel() {
        if (pending) {
            removeFactor.mutate({ factorId: pending.factorId });
        }
        reset();
    }

    if (!isAdding) {
        return (
            <Button type="button" onClick={handleStart} className={primaryButtonClassName}>
                Add an authenticator app
            </Button>
        );
    }

    if (!pending) {
        return (
            <form className="space-y-4" onSubmit={handleEnroll} noValidate>
                <div>
                    <label htmlFor="friendly-name" className="mb-1.5 block text-sm font-medium text-[#102A43]">
                        Name this app
                    </label>
                    <Input
                        id="friendly-name"
                        type="text"
                        value={friendlyName}
                        onChange={(event) => setFriendlyName(event.target.value)}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "friendly-name-error" : undefined}
                        className={inputClassName}
                        placeholder="For example, Google Authenticator on my phone"
                    />
                    {error ? (
                        <p id="friendly-name-error" className="mt-1.5 text-sm text-[#C0392B]">
                            {error}
                        </p>
                    ) : null}
                </div>
                <Button type="submit" disabled={enrollTotp.isPending} className={primaryButtonClassName}>
                    {enrollTotp.isPending ? "Preparing..." : "Continue"}
                </Button>
                <Button type="button" variant="ghost" onClick={handleCancel} className="h-11 w-full text-sm text-[#486581]">
                    Cancel
                </Button>
            </form>
        );
    }

    return (
        <form className="space-y-4" onSubmit={handleVerify} noValidate>
            <p className="text-sm text-[#334E68]">
                Scan this QR code with an authenticator app, such as Google Authenticator, Microsoft
                Authenticator or a password manager.
            </p>
            <div className="flex justify-center">
                <Image
                    src={pending.qrCode}
                    alt="QR code for your authenticator app"
                    width={180}
                    height={180}
                    unoptimized
                />
            </div>
            <div>
                <p className="text-xs text-[#486581]">Can&apos;t scan it? Enter this key in the app instead:</p>
                <p className="mt-1 break-all rounded-md bg-[#F7F9FB] p-2 font-mono text-sm text-[#102A43]">
                    {pending.secret}
                </p>
            </div>

            <CodeInput value={code} onChange={setCode} error={error} />

            <Button type="submit" disabled={verifyCode.isPending} className={primaryButtonClassName}>
                {verifyCode.isPending ? "Checking..." : "Finish setting up"}
            </Button>
            <Button type="button" variant="ghost" onClick={handleCancel} className="h-11 w-full text-sm text-[#486581]">
                Cancel
            </Button>
        </form>
    );
}

function CodeInput({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
    return (
        <div>
            <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-[#102A43]">
                6-digit code
            </label>
            <Input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "code-error" : undefined}
                className={`${inputClassName} tracking-widest`}
                placeholder="123456"
            />
            {error ? (
                <p id="code-error" className="mt-1.5 text-sm text-[#C0392B]">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
