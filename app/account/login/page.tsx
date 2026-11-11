import LoginForm from "./login-form"

// "Register" buttons on the site link here with ?mode=signup (SIGN_UP_PATH), so new owners land on the sign-up form.
// Anything else, or nothing, opens the sign-in form as before.
export default async function LoginPage({ searchParams }: PageProps<"/account/login">) {
    const { mode } = await searchParams
    return <LoginForm initialMode={mode === "signup" ? "signup" : "login"} />
}
