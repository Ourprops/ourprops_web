# OurProps admin console

This document proposes how to build the internal console that administrators use to review submitted properties. It builds on `docs/architecture.md`, which remains the source for the domain model and authorization principles. Where this document decides something the architecture leaves open, it says so.

Written 2026-10-15 against the local database at migration `20261015140000_submit_property.sql`. Updated 2026-10-17 with the V1 decisions (section 10).

## 1. Recommendation in brief

1. **Build the console inside this Next.js app**, under `/admin`, rather than as a separate app or with a third-party admin tool.
2. **Admins use their own signed-in session, not the service role.** Row level security grants admins the reads they need, and every change goes through a database function that checks the caller's role, validates the change and writes the audit log in the same transaction.
3. **Admins only in V1.** Partner verifiers are not part of V1. Every review action, including making a property active and suspending it, is an admin action.
4. **Every admin uses a second factor**, checked in the database, not just at sign-in. Owners and developers can turn it on but don't have to (section 4).
5. **Admins see Word files only as PDFs.** Word documents are converted to PDF in an isolated converter, and reviewers never open the original (section 7).
6. **A property becomes active when ownership is `verified` and every other checkpoint is `verified` or `waived`**, and every document has been reviewed (section 5).
7. **When changes are requested, owners can edit their answers but can upload only the documents the admin asked for** (section 5).
8. **Identity documents are optional.** An owner can add and submit properties with or without one; the dashboard simply recommends it (section 5).

## 2. What the database has today

### The `profiles` table

| Column                | Type        | Notes                                                     |
| --------------------- | ----------- | --------------------------------------------------------- |
| `id`                  | uuid        | Primary key; references `auth.users(id)`, deleted with it |
| `full_name`           | text        | Required                                                  |
| `phone_number`        | text        | Optional                                                  |
| `role`                | text        | Required, default `owner`                                 |
| `onboarding_complete` | boolean     | Default `false`                                           |
| `created_at`          | timestamptz |                                                           |
| `updated_at`          | timestamptz | Set by the `profiles_guard_self_update` trigger           |

`role` is one of `owner`, `developer`, `partner_verifier` or `admin` (`profiles_role_check`).

How roles are protected today:

- Users can read and update only their own profile (`profiles_select_own`, `profiles_update_own`).
- The `profiles_guard_self_update` trigger lets a signed-in user change their own role only to `owner` or `developer`, and only before onboarding is complete. `partner_verifier` and `admin` can only be set through the service role, so today an engineer grants them by hand.
- There is no insert policy, so users can't create profile rows; sign-up creates them with the service role (`app/api/auth/signup/route.ts`).

What this means for the console:

- **One role per person.** A person is either an admin or an owner, not both. That suits a small internal team, but admins can't register their own properties with the same account. Keep it that way for V1: admins use separate accounts.
- **No way to deactivate an admin.** Removing access means changing the role back to `owner` or banning the user in Supabase Auth. Both should be audited (section 6).
- **No organisations or assignments.** The architecture expects partner verifiers to work only on "assigned or authorized records", and nothing records an assignment yet. This is one reason V1 is admins only.
- **Grants tidied up.** `anon` and `authenticated` used to hold every privilege on `profiles` and the review tables, each one mistaken policy away from mattering (an insert policy on `profiles` would have let users create an `admin` profile). `20261019120000_revoke_unused_table_grants.sql` removes them: users keep only reading their own profile and updating its allowed columns, and the review, audit and notification tables are closed to users entirely. The admin console grants back the reads it needs, together with its policies.

### Tables the console works on

| Table                       | What admins do with it                                                                      | Status today                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `properties`                | Move through `submitted → under_review → active`, or out to `action_required` / `suspended` | Owners read their own; only drafts are editable                                                |
| `property_boundaries`       | View on a map against neighbouring properties                                               | Owners read their own                                                                          |
| `property_documents`        | Open, set the final `document_type`, mark `accepted` / `rejected` / `superseded`            | Owners read their own; `slot` and `declared_type` are hints                                    |
| `property_checkpoints`      | Six checkpoints per property, each with a status, public notes and internal notes           | No policies; nothing creates the rows yet                                                      |
| `property_overlap_flags`    | Investigate and resolve (`resolved_valid`, `resolved_false_positive`)                       | Created by the boundary overlap trigger; no policies                                           |
| `audit_logs`                | Read a property's history; every admin action writes here                                   | Written by `submit_property`; no policies                                                      |
| `notifications`             | Created when admins act (for example `property.changes_requested`)                          | Table and types exist; nothing sends them yet                                                  |
| `identity_documents`        | Check the owner's Ghana Card or passport (`identity_verified` checkpoint)                   | Replaces `ghana_card_records`; owners save their own (`20261017130000_identity_documents.sql`) |
| `data_room_access_requests` | Approve or deny requests                                                                    | Not used yet; out of scope for V1                                                              |

## 3. Where the console lives

**Recommended: an `/admin` route group in this app.**

```text
app/(admin)/admin/
├── layout.tsx                  # requireAdmin() on the server; noindex
├── page.tsx                    # Review queue
├── mfa/page.tsx                # Second-factor challenge for admins signed in without one
└── properties/[id]/page.tsx    # One property: answers, map, documents, checkpoints, history
app/(app)/account/security/     # Set up a second factor (any signed-in user)
app/api/admin/...               # Route handlers, as the rest of the app uses
lib/admin/                      # Queries and actions for the console
lib/auth/staff.ts               # requireAdmin(), staffRole()
```

Why here:

- It reuses sign-in, the Supabase clients, and the labels and validators already written for registration (`lib/types/property.ts`, `lib/validators/property.ts`). An admin sees the same wording an owner chose.
- There is one deployment and one set of migrations, so the console can't drift from the schema.

The alternatives considered:

| Option                                | Why not now                                                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A separate app or `admin.` subdomain  | Stronger isolation, but a second deployment and shared-code setup for a small team. Worth revisiting when outside partner verifiers sign in.      |
| Supabase Studio                       | Full database access with no record of who changed what. Keep it for engineers in emergencies only, never as the review tool.                     |
| Retool or another low-code admin tool | Fast to start, but it needs service-role credentials, records actions under one shared identity, and adds a vendor that sees ownership documents. |

## 4. Authorization

The architecture states that "UI route guards do not replace RLS". The console follows that with three layers:

1. **`proxy.ts`** redirects signed-out users and non-admins away from `/admin`. This layer is only for usability.
2. **`app/(admin)/admin/layout.tsx`** calls `requireAdmin()` on the server before rendering anything. Non-admins get not found, so the console's existence isn't advertised. An admin signed in without a second factor is sent to `/admin/mfa`.
3. **The database** enforces everything: read policies for admins, and functions for every change.

### Why admins don't use the service role

The service role bypasses row level security completely. If the console used it:

- any bug in a query would expose or change every row;
- the database would see every action as the same anonymous service, so `audit_logs.actor_id` would depend on the app remembering to set it.

When admins use their own session, `auth.uid()` identifies the admin in every policy and function. The service role stays where it is today: sign-up and similar narrow server tasks.

### The building blocks

A helper the policies and functions share:

```sql
-- the signed-in user's staff role, if they signed in with a second factor.
-- V1 recognises admins only; partner_verifier is added here when assignments exist.
create function public.staff_role() returns text
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles
  where id = (select auth.uid())
    and role = 'admin'
    and (select auth.jwt() ->> 'aal') = 'aal2'
$$;
```

- **Reads:** add `select` policies such as `using (public.staff_role() = 'admin')` on `properties`, `property_boundaries`, `property_documents`, `property_checkpoints`, `property_overlap_flags` and `audit_logs`, plus a storage policy on `property-documents` that lets admins read only files that are safe to view (section 7). Admins open documents through short-lived signed URLs created with their own session.
- **Writes:** grant no `insert` or `update` privileges on these tables. Every change is a `security definer` function, following the pattern already used by `save_draft_boundary` and `submit_property`: check the role, lock the row, validate the transition, apply it, and write `audit_logs` (and a `notifications` row where relevant) in one transaction.

The extra lookup in `staff_role()` costs one primary-key read per check. If that ever matters, the role can be added to the JWT with a Supabase custom access token hook.

### Multi-factor authentication for admins

Admins can open every owner's ownership documents, so every admin must use a second factor (TOTP through Supabase Auth). Because `staff_role()` checks `aal2`, a stolen password reaches nothing, even if someone calls the API directly.

- **Set up the factor before the role.** A new admin creates an ordinary account and enrols TOTP at `/account/security` first. The script that grants `admin` refuses unless the account already has a verified factor in `auth.mfa_factors`. Otherwise there is a window where the account is an admin with only a password, and whoever has that password could enrol their own factor.
- **Signing in.** After the password step the session is `aal1`. The admin layout sends the admin to `/admin/mfa` to enter a code, which raises the session to `aal2`.
- **Lost devices.** Supabase has no backup codes. Each admin enrols two factors, for example a phone app and a password manager. If both are lost, an engineer removes the factors and the role through the reviewed script; the person re-enrols before the role is granted again.

### Should owners have to use MFA?

**Not in V1. Offer it, don't force it.** The same `/account/security` page lets any user turn on TOTP.

- **What is at stake is smaller.** An owner's account reaches only that owner's own properties and documents. An admin's account reaches everyone's.
- **It costs more for owners.** Many owners won't have an authenticator app, and SMS codes cost money per message and are open to SIM-swap fraud, which defeats the point.
- **When to revisit:** once owners can do things that affect other people, such as approving data-room requests, delegating to an agent or changing an active property's public page. Then require `aal2` for those actions (a step-up check in the function), not at every sign-in.

### Granting and removing admins

V1: an engineer runs a reviewed SQL script that checks for a verified factor, sets the role, and writes an `audit_logs` entry (`action = 'role_changed'`, with the old and new role in `metadata`). A screen for managing admins can come later, built on the same kind of audited function.

## 5. Review workflow

### Status changes

Each change is one function. All review actions are admin-only in V1 (this answers the open question in `docs/architecture.md` on who may make a property active or suspend it).

| From              | To                | Function                                           | Who   | Also does                                                                          |
| ----------------- | ----------------- | -------------------------------------------------- | ----- | ---------------------------------------------------------------------------------- |
| `submitted`       | `under_review`    | `start_review(property_id)`                        | Admin | Creates the six checkpoint rows if missing; records the reviewer                   |
| `under_review`    | `action_required` | `request_changes(property_id, message, documents)` | Admin | Records the requested documents; notifies the owner (`property.changes_requested`) |
| `action_required` | `under_review`    | `resubmit_property(property_id)`                   | Owner | Requires every requested document; resets affected checkpoints                     |
| `under_review`    | `active`          | `approve_property(property_id)`                    | Admin | Checks the conditions below; notifies the owner (`property.approved`)              |
| `active`          | `suspended`       | `suspend_property(property_id, reason)`            | Admin | Reason is required; notifies the owner                                             |
| `suspended`       | `under_review`    | `reopen_review(property_id, note, checkpoints)`    | Admin | Resets at least one checkpoint to `unverified`; see below                          |

### Bringing back a suspended property

A suspended property never goes straight back to `active`. `reopen_review` moves it to `under_review` and resets the checkpoints the suspension was about (the admin must choose at least one). From there the normal path applies: the admin can request changes, and the property becomes active again only through `approve_property` and all its conditions. A suspension means something stopped being true; going back through review makes someone check it again.

While a property is suspended, its public property page stays up and says "This property is not currently verified" rather than returning not found. A buyer or lender who saved the link needs to learn it is no longer valid, not wonder whether the link broke.

### When a property can become active

`approve_property` refuses unless all of these hold, checked inside the function:

- the property is `under_review`;
- `ownership_claim_verified` is `verified`;
- every other checkpoint is `verified` or `waived`;
- no document is still `unreviewed`;
- no document request is still open.

Ownership is the one check that can't be waived: it is what makes a property worth showing as verified. An admin waives any other checkpoint through `update_checkpoint`, with a public note saying why. The public property page shows a waived checkpoint as "Waived", never as "Checked".

### When changes are requested

`request_changes` takes a message and a list of requested documents, each a slot and a note. They are stored in a new table:

```text
property_document_requests
  id, property_id, slot, note, requested_by, created_at, fulfilled_by_document_id, fulfilled_at
```

While the property is `action_required`, the owner:

- **can edit their answers**, the same fields as in a draft, including the boundary. The overlap trigger runs again on a new boundary. This means the owner policies and the registration flow, which today allow edits only to drafts, must also allow `action_required`;
- **can upload only into an open request.** The storage policy and the `property_documents` insert check that an open request exists for that property and slot, and the upload marks the request fulfilled;
- **can't delete or replace documents already submitted.**

`resubmit_property` requires every request to be fulfilled. It writes `audit_logs` with the names (not the values) of the fields that changed, so the admin can see what to look at again. It also resets checkpoints whose evidence changed back to `unverified`:

| What the owner changed | Checkpoints reset                                               |
| ---------------------- | --------------------------------------------------------------- |
| The boundary           | `boundary_mapped`, `cadastral_cross_check`, `overlap_clearance` |
| Any other answer       | `ownership_claim_verified`, `official_search_status`            |

`identity_verified` is not reset, because owners can't change their identity through the property flow.

### What owners see

Owners see the outcome and what to do next, never how admins reached it.

| Owners see                                         | Owners don't see                                   |
| -------------------------------------------------- | -------------------------------------------------- |
| The property's status, in plain words              | `internal_notes`                                   |
| Each checkpoint's status and its public note       | The admin's name (shown as "OurProps review team") |
| Each document's outcome, with a reason if rejected | Whose property overlaps theirs, or its boundary    |
| The documents an admin asked for, and why          | The audit log                                      |

Overlaps need care: telling an owner whose land overlaps theirs would leak another owner's data. Say "Your boundary overlaps another registered property" and nothing more.

Property status wording:

| Status            | Owner sees                                                     |
| ----------------- | -------------------------------------------------------------- |
| `submitted`       | Submitted. We'll start reviewing soon.                         |
| `under_review`    | In review                                                      |
| `action_required` | We need something from you                                     |
| `active`          | Your property is verified                                      |
| `suspended`       | Your property's verification is paused, followed by the reason |

Checkpoint status wording collapses six statuses into five: `unverified` and `submitted` show as "Not checked yet", `in_progress` as "Being checked", `verified` as "Checked", `waived` as "Waived" with the public note, and `flagged` as "Needs attention" with the public note.

Notifications, in the app and by email, go out only for `property.changes_requested`, `property.approved` and suspension. Not for each checkpoint change: six messages that mean nothing until approval would be noise. The `checkpoint.verified` and `checkpoint.flagged` types stay unused in V1. Admins write public notes from short templates they can edit, because free text written under time pressure is where alarming or legally risky wording slips in.

### Identity documents

Identity documents are optional. An owner who adds one does it once, not for each property. If an owner hasn't added one, the admin waives `identity_verified`.

- **What we take:** a Ghana Card, or a passport for owners abroad who don't have one. Many in the diaspora haven't registered for a Ghana Card, and foreign nationals can't get one unless they live in Ghana. We record the document number, the issuing country (always Ghana for a Ghana Card), the expiry date, and a photo or scan: the front of the Ghana Card, or the passport's photo page. Most owners will take it with their phone camera.
- **No selfie in V1.** An admin can't reliably match a selfie to a small ID photo, and it would double the biometric data we hold. Matching a face to a document belongs with an identity provider later.
- **Where and when:** on its own page, `/account/identity`. The dashboard recommends it with a "Verify your identity" card until a document is saved. Property registration doesn't mention it, and `submit_property` doesn't check for it.
- **Where it is stored:** `identity_documents`, one row per user, where a document number can be linked to only one account; and the private `identity-documents` bucket, at `{profile_id}/{file name}`. Owners write only through `save_identity_document`, which checks the expiry date and that the photo is in their own folder, and sends a replaced document back for review. Once verified, an owner can't change it.
- **What the admin checks:** the name on the document matches the profile and the ownership documents, the photo is legible and the document is in date. Passports make names harder (married names, other spellings, a dropped middle name), so the admin records their reasoning in the internal notes. A foreign passport holder registering `private_freehold` land needs a closer look: non-citizens can hold land only on leases of up to 50 years (Article 266 of the Constitution).
- **`review_identity_document(profile_id, status, note)`** marks the document `verified` or `rejected`, with a note the owner sees. `update_checkpoint` refuses to set `identity_verified` to `verified` unless the owner's document is verified.
- **Company and family land:** the document identifies the person acting for the owner. Admins ask for proof of their authority (a board resolution, or a letter from the family head) through a document request.
- **Handling:** this is national ID data. It is never logged (the audit log records only the document type and country), never shown on the public property page, and viewed under the same rules as other documents (section 7).

### Documents

`review_document(document_id, document_type, verification_status, note)` sets the final type and the outcome. The owner's `slot` and `declared_type` stay untouched as a record of what they said. Showing all three side by side helps the admin.

### Checkpoints

The six checkpoints (`identity_verified`, `ownership_claim_verified`, `boundary_mapped`, `cadastral_cross_check`, `overlap_clearance`, `official_search_status`) each get a status and notes through `update_checkpoint(...)`. `internal_notes` must never reach owners. When owners are given read access to checkpoints, give it through a view or column grants that leave `internal_notes` out.

### Overlap flags

`resolve_overlap(flag_id, status, note)` moves a flag to `investigating`, `resolved_valid` or `resolved_false_positive`. The property page should show both boundaries on one map.

## 6. Audit

Every function above writes `audit_logs` with `actor_id = auth.uid()`, the property, an action name and a small `metadata` object. Use `submit_property` as the model. Also record when an admin creates a signed URL for a document, because the architecture counts document access as a material action. Admins read audit entries through a select policy, and nobody can edit or delete them.

## 7. Before admins open documents

The `property-documents` bucket accepts files by their declared type and nothing looks inside them (Known risks, `docs/architecture.md`). Admins are the people this exposes. Admins never open an uploaded file in its original form unless it is a format the browser can display safely.

| Uploaded as     | What the admin sees                                    |
| --------------- | ------------------------------------------------------ |
| PDF             | The PDF, in the in-page viewer                         |
| JPEG, PNG, WebP | The image, in the page                                 |
| DOC, DOCX, ODT  | A PDF converted from it                                |
| HEIC, TIFF      | A PDF converted from it (browsers can't display these) |

How it works:

1. **Check the type.** After upload, compare the file's first bytes with its declared type. A mismatch marks the document `rejected` for review and it is never converted.
2. **Convert in isolation.** A converter (for example LibreOffice behind Gotenberg) turns the file into a PDF. Converting means the converter parses the untrusted file, so it runs in its own container with no network access except to receive the file and return the PDF, no service-role key and no access to the database. Macros are never run.
3. **Store the PDF next to the original**, at a separate path, and record it on `property_documents` (`preview_path`, `preview_status` of `pending`, `ready` or `failed`).
4. **Admins read only the viewable copy.** The admin storage policy allows original PDFs and images and the converted PDFs, never the original Word, HEIC or TIFF file. Until a conversion is `ready`, the console shows "being prepared" instead of a link.

A malware scan of the original is still worth adding, but conversion and in-browser viewing close the main risk (macros running on an admin's machine), so the console can ship before it. Never open documents on a machine that holds service-role keys.

Converted PDFs are what admins review, so if a conversion loses something (unusual fonts, tracked changes), the admin can ask for the document again as a PDF through `request_changes`.

### Where the converter runs

Self-hosted Gotenberg on a container service that scales to zero (Google Cloud Run or Fly.io). Supabase Edge Functions can't run LibreOffice, so the converter has to live somewhere else either way.

- **Flow:** a storage upload triggers an edge function, which downloads the file, posts it to Gotenberg, receives the PDF and stores it. Gotenberg only receives requests, so it runs with outbound network access blocked and holds no Supabase credentials. Callers authenticate with a shared secret or the platform's identity check.
- **Cost:** volume is low, so a container that sleeps when idle costs close to nothing.
- **Why not a conversion service:** it would be another company processing ownership documents, which has to be disclosed under Ghana's Data Protection Act and justified as a transfer abroad. Running one Docker image is a small price to avoid that. If nobody can run it, a service with a data-processing agreement is the fallback, recorded under Known risks.

## 8. Screens for V1

1. **Review queue.** Properties in `submitted`, `under_review` and `action_required`, oldest first, with what's missing (no boundary, empty checklist items), the number of open overlap flags and who is reviewing each.
2. **Property review page.** The owner's answers, as on their review screen, with fields changed since the last request highlighted; the map with the boundary and any overlapping boundaries; documents with slot, owner's type, final type and status; the six checkpoints; overlap flags; open document requests; the history from `audit_logs`; and the actions in section 5. The approve button lists whatever is still blocking approval.
3. **Second-factor screens.** `/account/security` to set up TOTP (any user) and `/admin/mfa` to enter a code.

On the owner's side, `/account/identity` collects the optional identity document, the dashboard recommends it until it is saved, and `action_required` needs the admin's message, editable answers and an upload control only for each requested document.

Later: partner verifiers, admin management, data-room requests, checking identity documents with the National Identification Authority or an identity provider, and reporting.

## 9. Build order

1. **Foundation.** `staff_role()` (admin only, with the `aal2` check); admin read grants and policies on tables (the old blanket grants are already revoked); the `/admin` gate in `proxy.ts` and the layout; `/account/security` and `/admin/mfa`; and the script that grants the first admin only after a factor is verified.
2. **Document safety.** Type check, isolated conversion to PDF, `preview_path` and `preview_status`, and the admin storage policy that allows only viewable files (section 7).
3. **Read-only console.** Queue and property page, with documents opened through signed URLs.
4. **Review actions.** `start_review`, `review_document`, `update_checkpoint`, `resolve_overlap`, `approve_property` (with its conditions), `suspend_property`, `reopen_review` and `review_identity_document`, each with tests.
5. **Requesting changes.** `property_document_requests`, `request_changes`, owner editing and request-only uploads in `action_required`, and `resubmit_property` with checkpoint resets.
6. **Identity documents.** The `identity_documents` migration (written, with tests in `supabase/tests/identity_documents.test.sql`), then `/account/identity` and the dashboard card.

### Testing

- **Each function:** test as an owner, a partner verifier (who must get nothing in V1), an admin without MFA, and an admin with MFA. Also test the invalid transitions (for example approving a draft). These are the RLS tests `docs/architecture.md` asks for.
- **Approval:** one test per condition in section 5, each showing that approval is refused when only that condition fails; approval succeeds with waived checkpoints but not with a waived `ownership_claim_verified`.
- **Owner changes:** an upload with no open request is refused; an upload into a request fulfils it; resubmitting with an open request is refused; a boundary change resets exactly the three boundary checkpoints.
- **Identity documents:** an expired document, a file in another user's folder, a number already on another account and a change to a verified document are each refused; a user can't mark their own document verified or see anyone else's; document numbers never reach the audit log.
- **Documents:** an admin can't create a signed URL for an original Word file, only for its converted PDF.
- **How to run them:** SQL tests that run inside a transaction and roll back work against the local database. Route handlers keep the mocked-client tests the app already uses (`__tests__/property-*-api.test.ts`).

## 10. Decisions

Decided for V1 (2026-10-17):

1. **Activation and suspension:** admins only. Ownership must be `verified`; every other checkpoint `verified` or `waived` (section 5).
2. **Partner verifiers:** not in V1.
3. **Owners in `action_required`:** can edit their answers; can upload only the documents an admin requested.
4. **Second factor:** required for every admin from day one. Optional for owners and developers.
5. **Word documents:** admins see them only as converted PDFs.
6. **What owners see:** outcomes and next steps in plain words; never internal notes, admin names or other owners' data. Notifications only for changes requested, approved and suspended (section 5).
7. **Suspended properties:** come back only through `reopen_review` and full approval; the public page says "not currently verified" while suspended (section 5).
8. **Converter:** self-hosted Gotenberg with outbound network blocked (section 7).
9. **Identity:** optional. A Ghana Card or a passport, once per owner, with a photo and no selfie; recommended on the dashboard, never asked for during registration (section 5).

Still open:

1. Do we keep the photo of an identity document after it is verified (evidence if a claim is disputed) or delete it and keep only who verified it and when (less sensitive data held)?
2. How does an admin settle a document number that someone else has already linked to their account?
3. Can a diaspora owner register through someone in Ghana acting with power of attorney in V1, with the power of attorney sent as a document, or only themselves?
