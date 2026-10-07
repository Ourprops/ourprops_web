"use client";

import { useMutation } from "@tanstack/react-query";
import type { WaitlistSignupInput } from "@/lib/validators/waitlist";

export function useJoinWaitlist() {
    return useMutation({
        mutationFn: async (input: WaitlistSignupInput) => {
            const response = await fetch("/api/marketing/waitlist", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                const data = (await response.json().catch(() => ({}))) as { error?: string };
                throw new Error(data.error ?? "Unable to submit right now. Please try again.");
            }
        },
    });
}
