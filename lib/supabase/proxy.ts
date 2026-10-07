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
    const isLogin = pathname === '/login'
    const isOnboarding = pathname === '/onboarding' || pathname.startsWith('/onboarding/')
    const isDashboard = pathname === '/dashboard' || pathname.startsWith('/dashboard/')

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
        if (isOnboarding || isDashboard) {
            return redirectTo('/login')
        }
        return supabaseResponse
    }

    if (isLogin) {
        return redirectTo('/dashboard')
    }

    if (isOnboarding || isDashboard) {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarding_complete')
            .eq('id', userId)
            .maybeSingle()

        // Valid token but no profile row: the user was deleted (or never finished signup).
        // Clear the stale session so they can log in again.
        if (!profile && !profileError) {
            await supabase.auth.signOut({ scope: 'local' })
            return redirectTo('/login')
        }

        const onboardingComplete = profile?.onboarding_complete === true

        if (isOnboarding && onboardingComplete) {
            return redirectTo('/dashboard')
        }
        if (isDashboard && !onboardingComplete) {
            return redirectTo('/onboarding')
        }
    }

    return supabaseResponse
}