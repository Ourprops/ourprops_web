"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Factor } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type MfaStatus = {
    // Authenticator apps the user has finished setting up
    factors: Factor[];
    // Signed in with a password, and has an app whose code they haven't entered yet
    needsCode: boolean;
    // This session has entered a code (aal2)
    enteredCode: boolean;
};

export type PendingTotp = {
    factorId: string;
    qrCode: string;
    secret: string;
};

export const mfaKeys = {
    status: ["mfa", "status"] as const,
};

async function fetchMfaStatus(): Promise<MfaStatus> {
    const supabase = createClient();
    // listFactors asks the server, so a factor removed elsewhere doesn't show here
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
        throw factorsError;
    }

    const { data: assurance, error: assuranceError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) {
        throw assuranceError;
    }

    const enteredCode = assurance.currentLevel === "aal2";

    return {
        factors: factors.totp,
        needsCode: !enteredCode && factors.totp.length > 0,
        enteredCode,
    };
}

export function useMfaStatus() {
    return useQuery({
        queryKey: mfaKeys.status,
        queryFn: fetchMfaStatus,
    });
}

// Raises the session to aal2 with a code from one of the user's apps
export function useVerifyCode() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ factorId, code }: { factorId: string; code: string }) => {
            const supabase = createClient();
            const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
            if (error) {
                throw error;
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: mfaKeys.status }),
    });
}

// Starts setting up an app: returns the QR code to scan. It counts once a code from it is verified.
export function useEnrollTotp() {
    return useMutation({
        mutationFn: async ({ friendlyName }: { friendlyName: string }): Promise<PendingTotp> => {
            const supabase = createClient();

            // An app left half set up (QR code shown, no code entered) would block a new one with the same name
            const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
            if (listError) {
                throw listError;
            }
            for (const factor of factors.all) {
                if (factor.factor_type === "totp" && factor.status === "unverified") {
                    await supabase.auth.mfa.unenroll({ factorId: factor.id });
                }
            }

            const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName });
            if (error) {
                throw error;
            }

            return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
        },
    });
}

export function useRemoveFactor() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ factorId }: { factorId: string }) => {
            const supabase = createClient();
            const { error } = await supabase.auth.mfa.unenroll({ factorId });
            if (error) {
                throw error;
            }
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: mfaKeys.status }),
    });
}
