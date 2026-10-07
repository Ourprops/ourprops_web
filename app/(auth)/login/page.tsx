"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAuthError, signIn, signUp } from "@/lib/supabase/auth";

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

const signUpSchema = z
    .object({
        fullName: z.string().trim().min(1, "Full name is required."),
        email: z.email("Invalid email address."),
        password: z
            .string()
            .regex(
                /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
                "Weak password. Use at least 8 characters with letters and numbers."
            ),
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
    const [isLoading, setIsLoading] = useState(false);
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
            email: email.trim(),
            password,
            confirmPassword,
        });

        if (parsed.success) {
            return {};
        }

        return toFormErrors(parsed.error.issues, "signup");
    }

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        try {
            event.preventDefault();
            const formErrors = validateLoginForm();
            setErrors(formErrors);
    
            if (Object.keys(formErrors).length > 0) {
                return;
            }
    
            setIsLoading(true);
    
            await signIn(email.trim(), password);
            setErrors({ form: "Authentication is not connected yet for MVP." });
            setIsLoading(false);
        } catch (error) {
            const { message } = formatAuthError(error);
            setErrors({ form: message });
            setIsLoading(false);
        }
    }

    async function handleSignUp(event: FormEvent<HTMLFormElement>) {
        try {
            event.preventDefault();
            const formErrors = validateSignUpForm();
            setErrors(formErrors);
    
            if (Object.keys(formErrors).length > 0) {
                return;
            }
    
            setIsLoading(true);
    
            await signUp(email.trim(), password, fullName);
    
            setSignupSuccess(true);
            setIsLoading(false);
        } catch (error) {
            const { message } = formatAuthError(error);
            setErrors({ form: message });
            setIsLoading(false);
        }
    }

    const buttonText = isLoading
        ? mode === "signup"
            ? "Creating account..."
            : "Logging in..."
        : mode === "signup"
            ? "Create account"
            : "Log in";

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

                {!signupSuccess ? (
                    <>
                        <header className="mb-6 text-center">
                            <h1 className="text-2xl font-semibold text-[#003366]">Welcome to OurProps</h1>
                            <p className="mt-2 text-sm sm:text-base text-[#334E68]">
                                Manage your property information in one clear, organized place.
                            </p>
                        </header>

                        <div
                            className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-[#D9E2EC] bg-[#F7F9FB] p-1"
                            role="tablist"
                            aria-label="Authentication tabs"
                        >
                            <Button
                                type="button"
                                role="tab"
                                aria-selected={mode === "login"}
                                variant="ghost"
                                className={`h-9 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                    mode === "login"
                                        ? "bg-white text-[#003366] shadow-sm"
                                        : "text-[#486581] hover:text-[#003366]"
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
                                className={`h-9 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                                    mode === "signup"
                                        ? "bg-white text-[#003366] shadow-sm"
                                        : "text-[#486581] hover:text-[#003366]"
                                }`}
                                onClick={() => switchMode("signup")}
                            >
                                Sign up
                            </Button>
                        </div>

                        {mode === "login" ? (
                            <form className="space-y-4" onSubmit={handleLogin} noValidate>
                                <div>
                                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#102A43]">
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
                                        className="h-11 rounded-lg border-[#D9E2EC] bg-white px-3 text-sm text-[#102A43] placeholder:text-[#7B8794] focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#003366]/30"
                                        placeholder="you@example.com"
                                    />
                                    {errors.email ? (
                                        <p id="email-error" className="mt-1.5 text-sm text-[#C0392B]">
                                            {errors.email}
                                        </p>
                                    ) : null}
                                </div>

                                <div>
                                    <div className="mb-1.5 flex items-center justify-between">
                                        <label htmlFor="password" className="block text-sm font-medium text-[#102A43]">
                                            Password
                                        </label>
                                        <Link
                                            href="#"
                                            className="text-sm font-medium text-[#003366] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]"
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
                                            className="h-11 rounded-lg border-[#D9E2EC] bg-white px-3 pr-16 text-sm text-[#102A43] placeholder:text-[#7B8794] focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#003366]/30"
                                            placeholder="Enter your password"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="absolute inset-y-0 right-2 my-auto h-8 px-2 text-sm font-medium text-[#003366] hover:bg-[#F0F4F8]"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </Button>
                                    </div>
                                    {errors.password ? (
                                        <p id="password-error" className="mt-1.5 text-sm text-[#C0392B]">
                                            {errors.password}
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
                                    {buttonText}
                                </Button>

                                <p className="text-center text-sm text-[#486581]">
                                    Don&apos;t have an account?{" "}
                                    <Button
                                        type="button"
                                        variant="link"
                                        onClick={() => switchMode("signup")}
                                        className="h-auto p-0 font-semibold text-[#003366]"
                                    >
                                        Sign up
                                    </Button>
                                </p>
                            </form>
                        ) : (
                            <form className="space-y-4" onSubmit={handleSignUp} noValidate>
                                <div>
                                    <label htmlFor="full-name" className="mb-1.5 block text-sm font-medium text-[#102A43]">
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
                                        className="h-11 rounded-lg border-[#D9E2EC] bg-white px-3 text-sm text-[#102A43] placeholder:text-[#7B8794] focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#003366]/30"
                                        placeholder="Your full name"
                                    />
                                    {errors.fullName ? (
                                        <p id="full-name-error" className="mt-1.5 text-sm text-[#C0392B]">
                                            {errors.fullName}
                                        </p>
                                    ) : null}
                                </div>

                                <div>
                                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#102A43]">
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
                                        className="h-11 rounded-lg border-[#D9E2EC] bg-white px-3 text-sm text-[#102A43] placeholder:text-[#7B8794] focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#003366]/30"
                                        placeholder="you@example.com"
                                    />
                                    {errors.email ? (
                                        <p id="email-error" className="mt-1.5 text-sm text-[#C0392B]">
                                            {errors.email}
                                        </p>
                                    ) : null}
                                </div>

                                <div>
                                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#102A43]">
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
                                            className="h-11 rounded-lg border-[#D9E2EC] bg-white px-3 pr-16 text-sm text-[#102A43] placeholder:text-[#7B8794] focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#003366]/30"
                                            placeholder="Create a password"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="absolute inset-y-0 right-2 my-auto h-8 px-2 text-sm font-medium text-[#003366] hover:bg-[#F0F4F8]"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? "Hide" : "Show"}
                                        </Button>
                                    </div>
                                    {errors.password ? (
                                        <p id="password-error" className="mt-1.5 text-sm text-[#C0392B]">
                                            {errors.password}
                                        </p>
                                    ) : null}
                                </div>

                                <div>
                                    <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-[#102A43]">
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
                                            className="h-11 rounded-lg border-[#D9E2EC] bg-white px-3 pr-16 text-sm text-[#102A43] placeholder:text-[#7B8794] focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#003366]/30"
                                            placeholder="Confirm your password"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                                            className="absolute inset-y-0 right-2 my-auto h-8 px-2 text-sm font-medium text-[#003366] hover:bg-[#F0F4F8]"
                                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                        >
                                            {showConfirmPassword ? "Hide" : "Show"}
                                        </Button>
                                    </div>
                                    {errors.confirmPassword ? (
                                        <p id="confirm-password-error" className="mt-1.5 text-sm text-[#C0392B]">
                                            {errors.confirmPassword}
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
                                    {buttonText}
                                </Button>

                                <p className="text-xs text-[#486581]">
                                    By creating an account, you agree to our Terms and Privacy Policy.
                                </p>

                                <p className="text-center text-sm text-[#486581]">
                                    Already have an account?{" "}
                                    <Button
                                        type="button"
                                        variant="link"
                                        onClick={() => switchMode("login")}
                                        className="h-auto p-0 font-semibold text-[#003366]"
                                    >
                                        Log in
                                    </Button>
                                </p>
                            </form>
                        )}
                    </>
                ) : (
                    <div className="space-y-4 py-4 text-center">
                        <h2 className="text-2xl font-semibold text-[#003366]">Check your email</h2>
                        <p className="text-sm sm:text-base text-[#334E68]">
                            {`We've sent a confirmation link to ${email}. Confirm your email to continue.`}
                        </p>
                        <Button
                            type="button"
                            onClick={() => {
                                setSignupSuccess(false);
                                switchMode("login");
                            }}
                            className="h-11 bg-[#FF6B35] px-4 text-sm font-semibold text-white hover:bg-[#E55D2B] focus-visible:border-[#003366] focus-visible:ring-2 focus-visible:ring-[#003366]/40"
                        >
                            Back to login
                        </Button>
                    </div>
                )}
            </section>
        </main>
    );
}