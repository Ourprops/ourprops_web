"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { OnboardingInput } from "@/lib/validators/onboarding";

export type Profile = {
    id: string;
    full_name: string;
    phone_number: string | null;
    role: string | null;
    onboarding_complete: boolean;
};

export const profileKeys = {
    me: ["profile", "me"] as const,
};

// Returns null when nobody is signed in
async function fetchMyProfile(): Promise<Profile | null> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, phone_number, role, onboarding_complete")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Error fetching profile:", error);
        throw error;
    }

    return data;
}

export function useMyProfile() {
    return useQuery({
        queryKey: profileKeys.me,
        queryFn: fetchMyProfile,
    });
}

export function useCompleteOnboarding() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, role, phoneNumber }: OnboardingInput & { userId: string }) => {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("profiles")
                .update({
                    role,
                    phone_number: phoneNumber,
                    onboarding_complete: true,
                })
                .eq("id", userId)
                .select("id, full_name, phone_number, role, onboarding_complete")
                .single();

            if (error) {
                throw error;
            }

            return data as Profile;
        },
        onSuccess: (profile) => {
            queryClient.setQueryData(profileKeys.me, profile);
        },
    });
}
