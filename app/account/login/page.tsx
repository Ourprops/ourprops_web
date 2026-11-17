import LoginForm from "./login-form"

// "Register" buttons on the site link here with ?mode=signup (SIGN_UP_PATH), so new owners land on the sign-up form.
// Anything else, or nothing, opens the sign-in form as before.
export default async function LoginPage({ searchParams }: PageProps<"/account/login">) {
    const { mode, link } = await searchParams
    // ?link=expired: an email link that didn't work (app/api/auth/confirm)
    return <LoginForm initialMode={mode === "signup" ? "signup" : "login"} linkExpired={link === "expired"} />
}
