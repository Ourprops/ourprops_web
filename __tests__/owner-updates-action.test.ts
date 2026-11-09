// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { markNotificationsSeen } from '../app/account/dashboard/actions'

const claims = vi.fn()
const rpc = vi.fn()
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getClaims: () => claims() }, rpc }) }))

const ID = 'aaaaaaaa-0000-4000-8000-000000000001'

describe('markNotificationsSeen', () => {
    beforeEach(() => {
        claims.mockReset().mockResolvedValue({ data: { claims: { sub: 'owner' } } })
        rpc.mockReset().mockResolvedValue({ data: null, error: null })
    })

    test('marks the ids it was given seen, as the signed-in owner', async () => {
        await markNotificationsSeen([ID])
        expect(rpc).toHaveBeenCalledWith('mark_notifications_seen', { notification_ids: [ID] })
    })

    test('does nothing for a signed-out caller', async () => {
        claims.mockResolvedValue({ data: null })
        await markNotificationsSeen([ID])
        expect(rpc).not.toHaveBeenCalled()
    })

    test("does nothing with ids that aren't ids, or too many of them", async () => {
        await markNotificationsSeen(['not-an-id'])
        await markNotificationsSeen(new Array(51).fill(ID))
        await markNotificationsSeen([])
        expect(rpc).not.toHaveBeenCalled()
    })
})
