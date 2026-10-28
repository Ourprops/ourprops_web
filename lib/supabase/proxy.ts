import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet, headers) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                    Object.entries(headers).forEach(([key, value]) =>
                        supabaseResponse.headers.set(key, value)
                    )
                },
            },
        }
    )

    // Do not run code between createServerClient and
    // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    // IMPORTANT: If you remove getClaims() and you use server-side rendering
    // with the Supabase client, your users may be randomly logged out.
    const { data } = await supabase.auth.getClaims()
    const userId = data?.claims?.sub
    
    const { pathname } = request.nextUrl
    const isLogin = pathname === '/account/login'
    // Where users set up an authenticator app, and enter its code after their password
    const isSecurity = pathname === '/account/security'
    const isOnboarding = pathname === '/account/onboarding' || pathname.startsWith('/account/onboarding/')
    // Signed-in pages that also need onboarding finished
    const isAppPage =
        pathname === '/account/dashboard' || pathname.startsWith('/account/dashboard/')
    // Only a convenience: the database refuses non-admins and admins without a second factor (staff_role())
    const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/')

    // Redirect while keeping any refreshed auth cookies set above
    function redirectTo(path: string) {
        const url = request.nextUrl.clone()
        url.pathname = path
        url.search = ''
        const response = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
        return response
    }

    if (!userId) {
        if (isOnboarding || isAppPage || isAdminPage || isSecurity) {
            return redirectTo('/account/login')
        }
        return supabaseResponse
    }

    // Read from the session cookie, without a network call. Users with an authenticator app sign in
    // at aal1 and reach aal2 by entering its code on /account/security.
    const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    const enteredCode = assurance?.currentLevel === 'aal2'
    const needsCode = assurance?.currentLevel === 'aal1' && assurance.nextLevel === 'aal2'

    if (isLogin) {
        return redirectTo(needsCode ? '/account/security' : '/account/dashboard')
    }

    if (needsCode && (isOnboarding || isAppPage || isAdminPage)) {
        return redirectTo('/account/security')
    }

    if (isOnboarding || isAppPage || isAdminPage) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_complete, role')
            .eq('id', userId)
            .maybeSingle()

        // Valid token but no profile row: the user was deleted (or never finished signup).
        // Clear the stale session so they can log in again.
        if (!profile && !profileError) {
            await supabase.auth.signOut({ scope: 'local' })
            return redirectTo('/account/login')
        }

        if (isAdminPage) {
            if (profile?.role !== 'admin') {
                return redirectTo('/account/dashboard')
            }
            // An admin without a second factor sets one up first
            if (!enteredCode) {
                return redirectTo('/account/security')
            }
            return supabaseResponse
        }

        const onboardingComplete = profile?.onboarding_complete === true

        if (isOnboarding && onboardingComplete) {
            return redirectTo('/account/dashboard')
        }
        if (isAppPage && !onboardingComplete) {
            return redirectTo('/account/onboarding')
        }
    }

    return supabaseResponse
}