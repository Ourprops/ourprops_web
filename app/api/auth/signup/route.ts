import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceRoleClient } from "@/lib/supabase/service-role";
import { signUpSchema } from "@/lib/validators/signup";

export async function POST(request: NextRequest) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: { message: "Invalid request body." } }, { status: 400 });
    }

    const parsed = signUpSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json(
            { error: { message: parsed.error.issues[0]?.message ?? "Invalid sign up details." } },
            { status: 400 }
        );
    }

    const { email, password, fullName } = parsed.data;

    try {
        // Regular signUp (not admin.createUser) so Supabase still sends the confirmation email
        const supabase = await createClient();
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (error) {
            return Response.json(
                { error: { message: error.message, code: error.code } },
                { status: error.status ?? 400 }
            );
        }

        const user = data.user;
        if (!user) {
            return Response.json({ error: { message: "Unable to create account." } }, { status: 500 });
        }

        // Email already registered: Supabase returns an obfuscated user with no identities.
        // Respond like a normal signup so we don't reveal which emails exist.
        if (user.identities?.length === 0) {
            return Response.json({ ok: true }, { status: 201 });
        }

        const admin = createServiceRoleClient();
        const { error: profileError } = await admin.from("profiles").insert({
            id: user.id,
            full_name: fullName,
        });

        if (profileError) {
            console.error("Error creating profile:", profileError);
            // Roll back so the user isn't left without a profile and can retry
            const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
            if (deleteError) {
                console.error("Error rolling back user after profile failure:", deleteError);
            }
            return Response.json({ error: { message: "Unable to create account. Please try again." } }, { status: 500 });
        }

        return Response.json({ ok: true }, { status: 201 });
    } catch (error) {
        console.error("Error signing up:", error);
        return Response.json({ error: { message: "Unable to create account. Please try again." } }, { status: 500 });
    }
}
