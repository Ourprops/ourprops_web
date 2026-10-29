"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import BrandLoader from "@/components/brand-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAuthError } from "@/lib/supabase/auth";
import { useSignIn, useSignUp } from "@/lib/queries/auth";
import { signUpSchema as baseSignUpSchema } from "@/lib/validators/signup";
import AuthShell from "../_components/auth-shell";

type AuthMode = "login" | "signup";

type FormErrors = {
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    form?: string;
};

const loginSchema = z.object({
    email: z.email("Invalid email address."),
    password: z.string().min(1, "Password is required."),
});

const signUpSchema = baseSignUpSchema
    .extend({
        confirmPassword: z.string(),
    })
    .refine((values) => values.password === values.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords don't match.",
    });

function toFormErrors(
    issues: z.core.$ZodIssue[],
    mode: AuthMode
): FormErrors {
    const next: FormErrors = {};

    for (const issue of issues) {
        const field = issue.path[0];

        if (field === "email") {
            next.email ??= issue.message;
        }

        if (field === "password") {
            next.password ??= issue.message;
        }

        if (field === "fullName") {
            next.fullName ??= issue.message;
        }

        if (field === "confirmPassword") {
            next.confirmPassword ??= issue.message;
        }
    }

    if (Object.keys(next).length === 0) {
        next.form =
            mode === "login"
                ? "Authentication failed. Please try again."
                : "Unable to create account. Please try again.";
    }

    return next;
}

export default function LoginPage() {
    const [mode, setMode] = useState<AuthMode>("login");
    const [signupSuccess, setSignupSuccess] = useState(false);
    // Set once sign-in succeeds; covers the screen until the next page arrives
    const [signedIn, setSignedIn] = useState(false);
    const router = useRouter();
    const signInMutation = useSignIn();
    const signUpMutation = useSignUp();
    const isLoading = signInMutation.isPending || signUpMutation.isPending;
    const [errors, setErrors] = useState<FormErrors>({});

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    function switchMode(nextMode: AuthMode) {
        setMode(nextMode);
        setErrors({});
        setSignupSuccess(false);
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
    }

    function validateLoginForm() {
        const parsed = loginSchema.safeParse({
            email: email.trim(),
            password,
        });

        if (parsed.success) {
            return {};
        }

        return toFormErrors(parsed.error.issues, "login");
    }

    function validateSignUpForm() {
        const parsed = signUpSchema.safeParse({
            fullName,
            email,
            password,
            confirmPassword,
        });

        if (parsed.success) {
            return { errors: {}, data: parsed.data };
        }

        return { errors: toFormErrors(parsed.error.issues, "signup") };
    }

    function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formErrors = validateLoginForm();
        setErrors(formErrors);

        if (Object.keys(formErrors).length > 0) {
            return;
        }

        signInMutation.mutate(
            { email: email.trim(), password },
            {
                // The proxy sends users with an authenticator app on to /account/security for its code,
                // and users who haven't finished onboarding on to /account/onboarding
                onSuccess: () => {
                    setSignedIn(true);
                    router.replace("/account/dashboard");
                },
                onError: (error) => setErrors({ form: formatAuthError(error).message }),
            }
        );
    }

    function handleSignUp(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const { errors: formErrors, data } = validateSignUpForm();
        setErrors(formErrors);

        if (!data) {
            return;
        }

        signUpMutation.mutate(
            {
                fullName: data.fullName,
                email: data.email,
                password: data.password,
            },
            {
                onSuccess: () => setSignupSuccess(true),
                onError: (error) => setErrors({ form: formatAuthError(error).message }),
            }
        );
    }

    const buttonText = isLoading
        ? mode === "signup"
            ? "Creating account..."
            : "Logging in..."
        : mode === "signup"
            ? "Create account"
            : "Log in";

    return (
        <AuthShell>
            <section>
                {!signupSuccess ? (
                    <>
                        <header className="mb-8">
                            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome to OurProps</h1>
                            <p className="mt-2 text-[15px] leading-relaxed text-copy">
                                Manage your property information in one clear, organized place.
                            </p>
                        </header>

                        <div
                            className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1"
                            role="tablist"
                            aria-label="Authentication tabs"
                        >
                            <Button
                                type="button"
                                role="tab"
                                aria-selected={mode === "login"}
                                variant="ghost"
                                className={`h-9 rounded-md px-3 py-2 text-sm font-semibold transition ${
                                    mode === "login"
                                        ? "bg-card text-primary shadow-xs"
                                        : "text-copy hover:text-primary"
                                }`}
                                onClick={() => switchMode("login")}
                            >
                                Log in
                            </Button>
                            <Button
                                type="button"
                                role="tab"
                                aria-selected={mode === "signup"}
                                variant="ghost"
                                className={`h-9 rounded-md px-3 py-2 text-sm font-semibold transition ${
                                    mode === "signup"
                                        ? "bg-card text-primary shadow-xs"
                                        : "text-copy hover:text-primary"
                                }`}
                                onClick={() => switchMode("signup")}
                            >
                                Sign up
                            </Button>
                        </div>

                        {mode === "login" ? (
                            <form className="space-y-4" onSubmit={handleLogin} noValidate>
                                <div>
                                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                                        Email
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={errors.email ? "email-error" : undefined}
                                        className="h-11 bg-card px-3"
                                        placeholder="you@example.com"
                                    />
                                    {errors.email ? (
                                        <p id="email-error" className="mt-1.5 text-sm text-destructive">
                                            {errors.email}
                                        </p>
                                    ) : null}
                                </div>

                                <div>
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <label htmlFor="password" className="block text-sm font-medium text-foreground">
                                            Password
                                        </label>
                                        <Link
                                            href="#"
                                            className="rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="current-password"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            aria-invalid={Boolean(errors.password)}
                                            aria-describedby={errors.password ? "password-error" : undefined}
                                            className="h-11 bg-card px-3 pr-16"
                                            placeholder="Enter your password"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="absolute inset-y-0 right-2 my-auto h-8 px-2 text-sm font-medium text-primary hover:bg-muted"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </Button>
                                    </div>
                                    {errors.password ? (
                                        <p id="password-error" className="mt-1.5 text-sm text-destructive">
                                            {errors.password}
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
                                    {buttonText}
                                </Button>

                                <p className="text-center text-sm text-copy">
                                    Don&apos;t have an account?{" "}
                                    <Button
                                        type="button"
                                        variant="link"
                                        onClick={() => switchMode("signup")}
                                        className="h-auto p-0 font-semibold text-primary"
                                    >
                                        Sign up
                                    </Button>
                                </p>
                            </form>
                        ) : (
                            <form className="space-y-4" onSubmit={handleSignUp} noValidate>
                                <div>
                                    <label htmlFor="full-name" className="mb-1.5 block text-sm font-medium text-foreground">
                                        Full name
                                    </label>
                                    <Input
                                        id="full-name"
                                        type="text"
                                        autoComplete="name"
                                        value={fullName}
                                        onChange={(event) => setFullName(event.target.value)}
                                        aria-invalid={Boolean(errors.fullName)}
                                        aria-describedby={errors.fullName ? "full-name-error" : undefined}
                                        className="h-11 bg-card px-3"
                                        placeholder="Your full name"
                                    />
                                    {errors.fullName ? (
                                        <p id="full-name-error" className="mt-1.5 text-sm text-destructive">
                                            {errors.fullName}
                                        </p>
                                    ) : null}
                                </div>

                                <div>
                                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                                        Email
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        aria-invalid={Boolean(errors.email)}
                                        aria-describedby={errors.email ? "email-error" : undefined}
                                        className="h-11 bg-card px-3"
                                        placeholder="you@example.com"
                                    />
                                    {errors.email ? (
                                        <p id="email-error" className="mt-1.5 text-sm text-destructive">
                                            {errors.email}
                                        </p>
                                    ) : null}
                                </div>

                                <div>
                                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            aria-invalid={Boolean(errors.password)}
                                            aria-describedby={errors.password ? "password-error" : undefined}
                                            className="h-11 bg-card px-3 pr-16"
                                            placeholder="Create a password"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="absolute inset-y-0 right-2 my-auto h-8 px-2 text-sm font-medium text-primary hover:bg-muted"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </Button>
                                    </div>
                                    {errors.password ? (
                                        <p id="password-error" className="mt-1.5 text-sm text-destructive">
                                            {errors.password}
                                        </p>
                                    ) : null}
                                </div>

                                <div>
                                    <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-foreground">
                                        Confirm password
                                    </label>
                                    <div className="relative">
                                        <Input
                                            id="confirm-password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            value={confirmPassword}
                                            onChange={(event) => setConfirmPassword(event.target.value)}
                                            aria-invalid={Boolean(errors.confirmPassword)}
                                            aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                                            className="h-11 bg-card px-3 pr-16"
                                            placeholder="Confirm your password"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                                            className="absolute inset-y-0 right-2 my-auto h-8 px-2 text-sm font-medium text-primary hover:bg-muted"
                                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        >
                                            {showConfirmPassword ? "Hide" : "Show"}
                                        </Button>
                                    </div>
                                    {errors.confirmPassword ? (
                                        <p id="confirm-password-error" className="mt-1.5 text-sm text-destructive">
                                            {errors.confirmPassword}
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
                                    {buttonText}
                                </Button>

                                <p className="text-xs leading-relaxed text-copy">
                                    By creating an account, you agree to our Terms and Privacy Policy.
                                </p>

                                <p className="text-center text-sm text-copy">
                                    Already have an account?{" "}
                                    <Button
                                        type="button"
                                        variant="link"
                                        onClick={() => switchMode("login")}
                                        className="h-auto p-0 font-semibold text-primary"
                                    >
                                        Log in
                                    </Button>
                                </p>
                            </form>
                        )}
                    </>
                ) : (
                    <div className="space-y-4 py-4">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Check your email</h2>
                        <p className="text-[15px] leading-relaxed text-copy">
                            {`We've sent a confirmation link to ${email}. Confirm your email to continue.`}
                        </p>
                        <Button
                            type="button"
                            onClick={() => {
                                setSignupSuccess(false);
                                switchMode("login");
                            }}
                            className="pressable h-11 bg-secondary px-5 text-[15px] font-semibold text-secondary-foreground hover:bg-secondary/90"
                        >
                            Back to login
                        </Button>
                    </div>
                )}
            </section>
            {signedIn && <BrandLoader overlay message="Signing you in" />}
        </AuthShell>
    );
}