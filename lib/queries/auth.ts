"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signIn, signUp } from "@/lib/supabase/auth";
import type { SignUpInput } from "@/lib/validators/signup";

export function useSignIn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ email, password }: { email: string; password: string }) => signIn(email, password),
        // Drop anything cached for a previous user
        onSuccess: () => queryClient.clear(),
    });
}

export function useSignUp() {
    return useMutation({
        mutationFn: (input: SignUpInput) => signUp(input),
    });
}
