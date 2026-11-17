// Gets a Google ID token for calling the private converter on Cloud Run (converter/deploy.sh), with no key stored
// anywhere: Vercel vouches for this deployment with an OIDC token, Google STS swaps it for a short-lived federated
// token, and that is used to ask IAM for an ID token as the converter-caller service account. Google only accepts
// Vercel tokens from the ourprops-web production environment, so previews and local dev can't get one.
// Server only.

import { getVercelOidcToken } from "@vercel/oidc"

export type GcpConfig = {
    projectNumber: string
    poolId: string
    providerId: string
    serviceAccountEmail: string
}

const CONFIG_VARS = {
    projectNumber: "GCP_PROJECT_NUMBER",
    poolId: "GCP_WORKLOAD_IDENTITY_POOL_ID",
    providerId: "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID",
    serviceAccountEmail: "GCP_SERVICE_ACCOUNT_EMAIL",
} as const

const STS_URL = "https://sts.googleapis.com/v1/token"
const IAM_CREDENTIALS_URL = "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts"

// Fetched a little before it runs out, so a token never expires between being read here and reaching Cloud Run
const REFRESH_MARGIN_MS = 5 * 60 * 1000
const REQUEST_TIMEOUT_MS = 10_000

/** Why a token couldn't be had. The message names the step that failed, never a token. */
export class ConverterAuthError extends Error {}

/**
 * The workload identity settings, or null when none are set, which means the converter is the local one from
 * converter/compose.yaml and needs no token. Some set and some not is a broken deploy, so it throws rather than
 * quietly calling without a token.
 */
export function readGcpConfig(env: Record<string, string | undefined> = process.env): GcpConfig | null {
    const entries = Object.entries(CONFIG_VARS).map(([key, name]) => [key, env[name]?.trim() ?? ""] as const)
    const missing = entries.filter(([, value]) => !value).map(([key]) => CONFIG_VARS[key as keyof GcpConfig])

    if (missing.length === entries.length) return null
    if (missing.length > 0) {
        throw new ConverterAuthError(`Converter credentials are half set up; missing ${missing.join(", ")}.`)
    }
    return Object.fromEntries(entries) as GcpConfig
}

let cached: { audience: string; token: string; refreshAt: number } | undefined

/** For tests: forget the cached token */
export function clearConverterTokenCache() {
    cached = undefined
}

/** An ID token whose audience is the converter's URL, from the cache while it has more than a few minutes left */
export async function getConverterIdToken(config: GcpConfig, audience: string, now = Date.now()): Promise<string> {
    if (cached && cached.audience === audience && now < cached.refreshAt) {
        return cached.token
    }

    const vercelToken = await readVercelToken()
    const federatedToken = await exchangeForFederatedToken(config, vercelToken)
    const idToken = await generateIdToken(config, federatedToken, audience)

    const expiresAt = jwtExpiry(idToken)
    // A token we can't read the expiry of is used once and not kept
    cached = expiresAt ? { audience, token: idToken, refreshAt: expiresAt - REFRESH_MARGIN_MS } : undefined
    return idToken
}

async function readVercelToken(): Promise<string> {
    try {
        const token = await getVercelOidcToken()
        if (token) return token
    } catch (error) {
        throw new ConverterAuthError("No Vercel OIDC token; is OIDC federation on for this project?", { cause: error })
    }
    throw new ConverterAuthError("No Vercel OIDC token; is OIDC federation on for this project?")
}

async function exchangeForFederatedToken(config: GcpConfig, subjectToken: string): Promise<string> {
    const body = await postJson(
        STS_URL,
        {
            grantType: "urn:ietf:params:oauth:grant-type:token-exchange",
            audience: `//iam.googleapis.com/projects/${config.projectNumber}/locations/global/workloadIdentityPools/${config.poolId}/providers/${config.providerId}`,
            scope: "https://www.googleapis.com/auth/cloud-platform",
            requestedTokenType: "urn:ietf:params:oauth:token-type:access_token",
            subjectTokenType: "urn:ietf:params:oauth:token-type:jwt",
            subjectToken,
        },
        undefined,
        "Google STS"
    )
    if (typeof body.access_token !== "string" || !body.access_token) {
        throw new ConverterAuthError("Google STS answered without an access token.")
    }
    return body.access_token
}

async function generateIdToken(config: GcpConfig, federatedToken: string, audience: string): Promise<string> {
    const body = await postJson(
        `${IAM_CREDENTIALS_URL}/${encodeURIComponent(config.serviceAccountEmail)}:generateIdToken`,
        { audience, includeEmail: true },
        federatedToken,
        "IAM generateIdToken"
    )
    if (typeof body.token !== "string" || !body.token) {
        throw new ConverterAuthError("IAM answered without an ID token.")
    }
    return body.token
}

async function postJson(
    url: string,
    payload: unknown,
    bearer: string | undefined,
    step: string
): Promise<Record<string, unknown>> {
    let response: Response
    try {
        response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
    } catch (error) {
        throw new ConverterAuthError(`${step} couldn't be reached.`, { cause: error })
    }
    // Only the status goes in the message: Google's error bodies can echo parts of the request
    if (!response.ok) {
        throw new ConverterAuthError(`${step} answered ${response.status}.`)
    }
    try {
        return (await response.json()) as Record<string, unknown>
    } catch (error) {
        throw new ConverterAuthError(`${step} didn't answer with JSON.`, { cause: error })
    }
}

/** When a JWT runs out, in ms, read from its payload. Not a verification: Cloud Run checks the token itself. */
export function jwtExpiry(token: string): number | undefined {
    const payload = token.split(".")[1]
    if (!payload) return undefined
    try {
        const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: unknown }
        return typeof exp === "number" ? exp * 1000 : undefined
    } catch {
        return undefined
    }
}
