import { createClient } from '@/lib/supabase/server';
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    const next = searchParams.get("next") ?? "/onboarding";
    const redirectTo = request.nextUrl.clone();
    redirectTo.pathname = next;

    console.log("token_hash:", token_hash);
    console.log("type:", type);
    console.log("next:", next);

    if (token_hash && type) {
        const supabase = await createClient();

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        });

        if (error) {
            console.error("verifyOtp error:", error.message);
        } else {
            console.log("Redirecting to:", redirectTo.toString());
            return NextResponse.redirect(redirectTo);
        }
    }

    // Return the user to an error page with some instructions
    redirectTo.pathname = "/error";
    console.log("Redirecting to error page:", redirectTo.toString());
    return NextResponse.redirect(redirectTo);
}