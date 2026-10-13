import { notFound } from "next/navigation"

import { getDraft } from "@/lib/supabase/property-drafts"
import { createClient } from "@/lib/supabase/server"

import NewPropertyFlow from "./_components/new-property-flow"

export default async function NewPropertyPage({
    searchParams,
}: {
    searchParams: Promise<{ draft?: string | string[] }>
}) {
    const { draft: draftId } = await searchParams

    // ?draft=<id> resumes a saved draft; the user can only load their own
    const draft = typeof draftId === "string" ? await getDraft(await createClient(), draftId) : null
    if (typeof draftId === "string" && !draft) notFound()

    return <NewPropertyFlow draft={draft} />
}
