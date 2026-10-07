import { createClient } from "./client";
import type { SignUpInput } from "@/lib/validators/signup";


// Sign up runs server-side (/api/auth/signup) so the profile row can be created with the service role
export async function signUp(input: SignUpInput) {
    const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        const error = {
            message: body?.error?.message ?? "Unable to create account. Please try again.",
            code: body?.error?.code,
            status: response.status,
        };
        console.error("Error signing up:", error);
        throw error;
    }
}

export async function signIn(email: string, password: string) {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Error signing in:", error);
        throw error;
    }

    return data;
}

export async function signOut() {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error("Error signing out:", error);
        throw error;
    }
}

interface AuthError {
    message: string
    status?: number
    code?: string
}

export function formatAuthError(error: unknown): AuthError {
    if (!error) {
        return { message: 'An unknown error occurred. Please try again.' }
    }

    // Handle Supabase errors
    if (typeof error === 'object' && 'message' in error) {
        const err = error as { message: string; status?: number; code?: string }
        const message = err.message || ''

        // Map specific Supabase error messages to user-friendly messages
        if (message.includes('Invalid login credentials')) {
            return {
                message: 'Incorrect email or password. Please try again.',
                status: err.status,
                code: err.code,
            }
        }
        if (message.toLowerCase().includes('captcha')) {
            return {
                message: 'CAPTCHA verification failed. Please try again.',
                status: err.status,
                code: err.code,
            }
        }
        if (message.includes('Email not confirmed')) {
            return {
                message: 'Please confirm your email before signing in. Check your inbox for the confirmation link.',
                status: err.status,
                code: err.code,
            }
        }
        if (message.includes('User already registered')) {
            return {
                message: 'This email is already registered. Please sign in instead.',
                status: err.status,
                code: err.code,
            }
        }
        if (message.includes('Password')) {
            return {
                message: 'Password does not meet security requirements. Please choose a stronger password.',
                status: err.status,
                code: err.code,
            }
        }
        if (message.includes('rate')) {
            return {
                message: 'Too many attempts. Please wait a few minutes before trying again.',
                status: err.status,
                code: err.code,
            }
        }

        return {
            message,
            status: err.status,
            code: err.code,
        }
    }

    // Handle Error objects
    if (error instanceof Error) {
        return { message: error.message }
    }

    // Handle string errors
    if (typeof error === 'string') {
        return { message: error }
    }

    return { message: 'An unexpected error occurred. Please try again.' }
}