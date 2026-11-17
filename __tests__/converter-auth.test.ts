// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const getVercelOidcToken = vi.hoisted(() => vi.fn())
vi.mock('@vercel/oidc', () => ({ getVercelOidcToken }))

import {
    ConverterAuthError,
    clearConverterTokenCache,
    getConverterIdToken,
    jwtExpiry,
    readGcpConfig,
    type GcpConfig,
} from '../lib/admin/converter-auth'

const CONFIG: GcpConfig = {
    projectNumber: '123456',
    poolId: 'vercel',
    providerId: 'vercel',
    serviceAccountEmail: 'converter-caller@proj.iam.gserviceaccount.com',
}
const AUDIENCE = 'https://document-converter-abc-ew.a.run.app'
const NOW = Date.UTC(2026, 10, 17, 12, 0, 0)

// A JWT-shaped token expiring at `exp` (seconds); the signature isn't checked here, Cloud Run does that
function idToken(exp: number | undefined, marker = 'sig') {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
    return `${encode({ alg: 'RS256' })}.${encode(exp === undefined ? {} : { exp })}.${marker}`
}
const ONE_HOUR_ON = Math.floor(NOW / 1000) + 3600

const fetchMock = vi.fn()

function answerWith(id = idToken(ONE_HOUR_ON)) {
    fetchMock.mockImplementation(async (url: string) =>
        String(url).startsWith('https://sts.googleapis.com')
            ? Response.json({ access_token: 'federated-token', token_type: 'Bearer', expires_in: 3600 })
            : Response.json({ token: id })
    )
}

beforeEach(() => {
    clearConverterTokenCache()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    getVercelOidcToken.mockReset().mockResolvedValue('vercel-oidc-token')
    answerWith()
})
afterEach(() => vi.unstubAllGlobals())

describe('readGcpConfig', () => {
    const ALL = {
        GCP_PROJECT_NUMBER: '123456',
        GCP_WORKLOAD_IDENTITY_POOL_ID: 'vercel',
        GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: 'vercel',
        GCP_SERVICE_ACCOUNT_EMAIL: 'converter-caller@proj.iam.gserviceaccount.com',
    }

    test('reads all four settings', () => {
        expect(readGcpConfig(ALL)).toEqual(CONFIG)
    })

    test('none set means the local converter, which needs no token', () => {
        expect(readGcpConfig({})).toBeNull()
        expect(readGcpConfig({ GCP_PROJECT_NUMBER: '  ' })).toBeNull()
    })

    test('refuses a half-set-up deploy, naming what is missing, instead of calling without a token', () => {
        const threeOfFour = { ...ALL, GCP_SERVICE_ACCOUNT_EMAIL: undefined }
        expect(() => readGcpConfig(threeOfFour)).toThrow(ConverterAuthError)
        expect(() => readGcpConfig(threeOfFour)).toThrow('missing GCP_SERVICE_ACCOUNT_EMAIL')
    })
})

describe('getConverterIdToken', () => {
    test("swaps Vercel's token at Google STS for this pool's provider", async () => {
        await getConverterIdToken(CONFIG, AUDIENCE, NOW)

        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://sts.googleapis.com/v1/token')
        expect(init.headers.Authorization).toBeUndefined()
        expect(JSON.parse(init.body)).toEqual({
            grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
            audience: '//iam.googleapis.com/projects/123456/locations/global/workloadIdentityPools/vercel/providers/vercel',
            scope: 'https://www.googleapis.com/auth/cloud-platform',
            requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
            subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
            subjectToken: 'vercel-oidc-token',
        })
    })

    test('asks IAM, with the federated token, for an ID token as the caller account for the converter URL', async () => {
        const token = await getConverterIdToken(CONFIG, AUDIENCE, NOW)

        const [url, init] = fetchMock.mock.calls[1]
        expect(url).toBe(
            'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/converter-caller%40proj.iam.gserviceaccount.com:generateIdToken'
        )
        expect(init.headers.Authorization).toBe('Bearer federated-token')
        expect(JSON.parse(init.body)).toEqual({ audience: AUDIENCE, includeEmail: true })
        expect(token).toBe(idToken(ONE_HOUR_ON))
    })

    test('reuses the token while it has more than five minutes left, then gets a new one', async () => {
        await getConverterIdToken(CONFIG, AUDIENCE, NOW)
        await getConverterIdToken(CONFIG, AUDIENCE, NOW + 54 * 60 * 1000)
        expect(fetchMock).toHaveBeenCalledTimes(2)

        await getConverterIdToken(CONFIG, AUDIENCE, NOW + 56 * 60 * 1000)
        expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    test("never hands a token for one URL to another", async () => {
        await getConverterIdToken(CONFIG, AUDIENCE, NOW)
        await getConverterIdToken(CONFIG, 'https://other.a.run.app', NOW)
        expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    test("doesn't keep a token whose expiry it can't read", async () => {
        answerWith(idToken(undefined))
        await getConverterIdToken(CONFIG, AUDIENCE, NOW)
        await getConverterIdToken(CONFIG, AUDIENCE, NOW)
        expect(fetchMock).toHaveBeenCalledTimes(4)
    })

    test('stops before calling Google when Vercel gives no token (OIDC off, or not on Vercel)', async () => {
        getVercelOidcToken.mockRejectedValue(new Error('no token in this request'))
        await expect(getConverterIdToken(CONFIG, AUDIENCE, NOW)).rejects.toThrow('No Vercel OIDC token')

        getVercelOidcToken.mockResolvedValue('')
        await expect(getConverterIdToken(CONFIG, AUDIENCE, NOW)).rejects.toThrow('No Vercel OIDC token')
        expect(fetchMock).not.toHaveBeenCalled()
    })

    test("says which step refused, without repeating Google's error body, and caches nothing", async () => {
        fetchMock.mockResolvedValueOnce(Response.json({ error_description: 'subject vercel-oidc-token rejected' }, { status: 403 }))

        const error = await getConverterIdToken(CONFIG, AUDIENCE, NOW).catch((caught: Error) => caught)
        expect(error).toBeInstanceOf(ConverterAuthError)
        expect((error as Error).message).toBe('Google STS answered 403.')

        answerWith()
        await getConverterIdToken(CONFIG, AUDIENCE, NOW)
        expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    test('fails when IAM refuses the account (missing token-creator role)', async () => {
        fetchMock
            .mockResolvedValueOnce(Response.json({ access_token: 'federated-token' }))
            .mockResolvedValueOnce(new Response('denied', { status: 403 }))

        await expect(getConverterIdToken(CONFIG, AUDIENCE, NOW)).rejects.toThrow('IAM generateIdToken answered 403.')
    })

    test('fails when an answer has no token in it', async () => {
        fetchMock.mockResolvedValueOnce(Response.json({}))
        await expect(getConverterIdToken(CONFIG, AUDIENCE, NOW)).rejects.toThrow('Google STS answered without an access token.')
    })
})

describe('jwtExpiry', () => {
    test('reads exp as milliseconds, and gives up on anything that is not a JWT', () => {
        expect(jwtExpiry(idToken(1_800_000_000))).toBe(1_800_000_000_000)
        expect(jwtExpiry('not-a-jwt')).toBeUndefined()
        expect(jwtExpiry('a.!!!.c')).toBeUndefined()
        expect(jwtExpiry(idToken(undefined))).toBeUndefined()
    })
})
