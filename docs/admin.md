# OurProps admin console

This document proposes how to build the internal console that administrators use to review submitted properties. It builds on `docs/architecture.md`, which remains the source for the domain model and authorization principles. Where this document decides something the architecture leaves open, it says so.

Written 2026-10-15 against the local database at migration `20261015140000_submit_property.sql`. Updated 2026-10-17 with the V1 decisions (section 10). Updated 2026-10-22 with a proposal for stricter verification rules (section 11), which is not yet decided. Updated 2026-10-27 to keep V1 simple: identity is required before a property goes active, identity documents are deleted once verified, admins set the ownership classification, and properties are expired by hand (decisions 10 to 14); then with how a duplicate identity number is settled and that owners register themselves (decisions 15 and 16). Most of section 11 is now rejected for V1. Updated 2026-10-28 with when a property may be deleted (decision 17).

## 1. Recommendation in brief

1. **Build the console inside this Next.js app**, under `/admin`, rather than as a separate app or with a third-party admin tool.
2. **Admins use their own signed-in session, not the service role.** Row level security grants admins the reads they need, and every change goes through a database function that checks the caller's role, validates the change and writes the audit log in the same transaction.
3. **Admins only in V1.** Partner verifiers are not part of V1. Every review action, including making a property active and suspending it, is an admin action.
4. **Every admin uses a second factor**, checked in the database, not just at sign-in. Owners and developers can turn it on but don't have to (section 4).
5. **Admins see Word files only as PDFs.** Word documents are converted to PDF in an isolated converter, and reviewers never open the original (section 7).
6. **A property becomes active when ownership and identity are `verified` and every other checkpoint is `verified` or `waived`**, every document has been reviewed and the admin has set the ownership classification (section 5).
7. **When changes are requested, owners can edit their answers but can upload only the documents the admin asked for** (section 5).
8. **Identity is not needed to submit, but is needed to go active.** An owner can add and submit properties without verifying their identity. The dashboard reminds them from sign-up, an admin asks for it when it's missing, and an owner does it once. The photo is deleted once it is verified (section 5).
9. **Admins set the ownership type and structure.** Owners describe how they got the property; the admin decides what that makes it (section 5).
10. **Properties are expired by hand.** Nothing expires on a timer. When an admin notices a property drawing a lot of views and requests, they suspend it so it is checked again (section 5).

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
app/admin/
├── layout.tsx                  # requireAdmin() on the server; noindex
├── page.tsx                    # Review queue
└── properties/[id]/page.tsx    # One property: answers, map, documents, checkpoints, history
app/account/security/           # Set up a second factor, and enter its code after the password (any signed-in user)
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
2. **`app/admin/layout.tsx`** calls `requireAdmin()` on the server before rendering anything. Non-admins get not found, so the console's existence isn't advertised. An admin signed in without a second factor is sent to `/account/security`. That page is outside `/admin`, so the layout can't redirect to itself.
3. **The database** enforces everything: read policies for admins, and functions for every change.

### Why admins don't use the service role

The service role bypasses row level security completely. If the console used it:

- any bug in a query would expose or change every row;
- the database would see every action as the same anonymous service, so `audit_logs.actor_id` would depend on the app remembering to set it.

When admins use their own session, `auth.uid()` identifies the admin in every policy and function. The service role stays where it is today: sign-up and similar narrow server tasks.

### The building blocks

A helper the policies and functions share:

```sql
-- the signed-in user's staff role, if they signed in with a second factor that still exists.
-- V1 recognises admins only; partner_verifier is added here when assignments exist.
create function public.staff_role() returns text
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles
  where id = (select auth.uid())
    and role = 'admin'
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists (
      select 1 from auth.mfa_factors
      where mfa_factors.user_id = profiles.id
        and mfa_factors.status = 'verified'
    )
$$;
```

The token says `aal2` until it expires, even after its factor is removed. The `auth.mfa_factors` check means removing an admin's factors ends their access straight away.

- **Reads:** add `select` policies such as `using ((select public.staff_role()) = 'admin')` on `properties`, `property_boundaries`, `property_documents`, `property_checkpoints`, `property_overlap_flags` and `audit_logs`, plus a storage policy on `property-documents` that lets admins read only files that are safe to view (section 7). Admins open documents through short-lived signed URLs created with their own session.
- **Writes:** grant no `insert` or `update` privileges on these tables. Every change is a `security definer` function, following the pattern already used by `save_draft_boundary` and `submit_property`: check the role, lock the row, validate the transition, apply it, and write `audit_logs` (and a `notifications` row where relevant) in one transaction.

Each call to `staff_role()` costs two indexed reads (`profiles` and `auth.mfa_factors`). Always write it as `(select public.staff_role())` in a policy. Bare, Postgres calls it once for every row the policy checks whenever the policy also tests a column, as in "staff, or the row's owner". Wrapped, it runs once per query. Locally, a 10,000-row check took 175 ms bare and 1.4 ms wrapped. If the remaining once-per-query cost ever matters, the role can be added to the JWT with a Supabase custom access token hook.

### Multi-factor authentication for admins

Admins can open every owner's ownership documents, so every admin must use a second factor (TOTP through Supabase Auth). Because `staff_role()` checks `aal2`, a stolen password reaches nothing, even if someone calls the API directly.

- **Set up the factor before the role.** A new admin creates an ordinary account and enrols TOTP at `/account/security` first. The script that grants `admin` refuses unless the account already has a verified factor in `auth.mfa_factors`. Otherwise there is a window where the account is an admin with only a password, and whoever has that password could enrol their own factor.
- **Signing in.** Admins sign in at `/account/login` like everyone else. After the password step the session is `aal1`, and `proxy.ts` sends anyone with a verified factor to `/account/security` to enter a code, which raises the session to `aal2`. Admins then go to `/admin`. This applies to owners who turned on TOTP too; otherwise turning it on would protect nothing.
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

| From              | To                | Function                                                              | Who   | Also does                                                                                                          |
| ----------------- | ----------------- | --------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------ |
| `submitted`       | `under_review`    | `start_review(property_id)`                                           | Admin | Creates the six checkpoint rows if missing; records the reviewer                                                   |
| `under_review`    | `under_review`    | `classify_property(property_id, ownership_type, ownership_structure)` | Admin | Sets the ownership classification (see below); can be changed until approval                                       |
| `under_review`    | `action_required` | `request_changes(property_id, message, documents, identity)`          | Admin | Records the requested documents, and whether identity is needed; notifies the owner (`property.changes_requested`) |
| `action_required` | `under_review`    | `resubmit_property(property_id)`                                      | Owner | Requires every requested document, and an identity document if one was asked for; resets affected checkpoints      |
| `under_review`    | `active`          | `approve_property(property_id)`                                       | Admin | Checks the conditions below; notifies the owner (`property.approved`)                                              |
| `active`          | `suspended`       | `suspend_property(property_id, reason)`                               | Admin | Reason is required; notifies the owner                                                                             |
| `suspended`       | `under_review`    | `reopen_review(property_id, note, checkpoints)`                       | Admin | Resets at least one checkpoint to `unverified`; see below                                                          |

### Expiring a property

Nothing expires on a timer in V1. When an admin notices a property drawing a lot of views and requests, which is when a stale verification would do the most harm, they expire it by suspending it with `suspend_property` and the reason template "Verification expired". It then follows the same path as any suspension: the public page says "not currently verified", and it comes back only through `reopen_review` and full approval. There is no separate `expired` status, so nothing new to migrate, word or test.

### Deleting and withdrawing

Only drafts are ever deleted. Once a property is submitted it is kept for good, and an owner who no longer wants it withdraws it instead.

- **Drafts are hard-deleted.** Only the owner has seen a draft, no reviewer has acted on it and it has no audit history (the first entry is written at submit), so nothing is lost. `deleteDraft` in `lib/supabase/property-drafts.ts` removes every file in the draft's folder in `property-documents`, then the row; its boundary, document records and other child rows go with it (`on delete cascade`). The files go first because the storage delete policy only lets the owner remove files while the draft exists: deleting the row first would leave the files behind for good. If removing the files fails, the row is kept so the owner can try again. The owner deletes a draft from the exit dialog in the registration flow.
- **Submitted properties are never deleted.** A record that was submitted, reviewed or flagged is evidence: in an overlap or a dispute it is exactly what a reviewer, or a court, needs to see. Deleting it would also cascade to other owners' overlap flags and leave its audit entries pointing at nothing.
- **Withdrawing, not built yet.** An owner who no longer wants a submitted property will move it to a `withdrawn` status, through a function that records who withdrew it and why in `audit_logs`. It disappears from the owner's list and the public page; admins still see it. A status rather than a `deleted_at` column, because every query and policy already filters on status, while a `deleted_at` filter forgotten in one place leaks the record.
- **Personal data:** keeping records for good has to be squared with people's right to have their personal data erased (Ghana's Data Protection Act, 2012). The likely answer is a retention period after which personal documents are deleted or anonymised while the property record and its history stay. This is part of the retention question still open in `docs/architecture.md`.

Because only drafts are deleted, and drafts have no audit entries, `audit_logs.property_id` can keep its foreign key: `on delete set null` never fires for a property with history.

### Ownership classification

Owners don't choose an ownership type or structure. Most can't tell `stool_sublease` from `customary_family`, and a wrong guess would mislead. They describe how they got the property and upload their documents; the admin decides what that makes it and records it with `classify_property`:

- **`ownership_type`:** `customary_family`, `stool_sublease`, `state_lease` or `private_freehold`;
- **`ownership_structure`:** `sole`, `co_owned` or `company`.

Both columns are already optional on drafts (`20261013140000_property_drafts.sql`), and nothing writes them today. `approve_property` refuses until both are set. Owners see the classification once the property is active, not while it's in review.

### Bringing back a suspended property

A suspended property never goes straight back to `active`. `reopen_review` moves it to `under_review` and resets the checkpoints the suspension was about (the admin must choose at least one). From there the normal path applies: the admin can request changes, and the property becomes active again only through `approve_property` and all its conditions. A suspension means something stopped being true; going back through review makes someone check it again.

While a property is suspended, its public property page stays up and says "This property is not currently verified" rather than returning not found. A buyer or lender who saved the link needs to learn it is no longer valid, not wonder whether the link broke.

### When a property can become active

`approve_property` refuses unless all of these hold, checked inside the function:

- the property is `under_review`;
- `ownership_claim_verified` is `verified`;
- `identity_verified` is `verified`;
- every other checkpoint is `verified` or `waived`;
- `ownership_type` and `ownership_structure` are set;
- no document is still `unreviewed`;
- no document request is still open.
- no overlap flag is still detected or investigating

Ownership and identity are the two checks that can't be waived: a property is worth showing as verified only if the claim is sound and we know who is making it. An admin waives any other checkpoint through `update_checkpoint`, with a public note saying why. The public property page shows a waived checkpoint as "Waived", never as "Checked".

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

When the owner hasn't verified their identity, the admin sets `identity` on `request_changes`. The owner's "We need something from you" page then links to `/account/identity`, and `resubmit_property` refuses until the owner has saved an identity document. The admin reviews it with `review_identity_document` when the property comes back.

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

An owner can submit properties without verifying their identity, but no property goes active until they have. They do it once, not for each property, and it isn't redone when the document later expires. If an owner hasn't done it by review, the admin asks for it through `request_changes` (above); `identity_verified` can't be waived.

- **What we take:** a Ghana Card, or a passport for owners abroad who don't have one. Many in the diaspora haven't registered for a Ghana Card, and foreign nationals can't get one unless they live in Ghana. We record the document number, the issuing country (always Ghana for a Ghana Card), the expiry date, and a photo or scan: the front of the Ghana Card, or the passport's photo page. Most owners will take it with their phone camera.
- **No selfie in V1.** An admin can't reliably match a selfie to a small ID photo, and it would double the biometric data we hold. Matching a face to a document belongs with an identity provider later.
- **Where and when:** on its own page, `/account/identity`. From the first sign-in after sign-up, the dashboard reminds the owner with a "Verify your identity" card until a document is saved. Property registration doesn't mention it, and `submit_property` doesn't check for it.
- **Where it is stored:** `identity_documents`, one row per user, where a document number can be linked to only one account; and the private `identity-documents` bucket, at `{profile_id}/{file name}`. Owners write only through `save_identity_document`, which checks the expiry date and that the photo is in their own folder, and sends a replaced document back for review. Once verified, an owner can't change it.
- **What the admin checks:** the name on the document matches the profile and the ownership documents, the photo is legible and the document is in date. Passports make names harder (married names, other spellings, a dropped middle name), so the admin records their reasoning in the internal notes. A foreign passport holder registering `private_freehold` land needs a closer look: non-citizens can hold land only on leases of up to 50 years (Article 266 of the Constitution).
- **`review_identity_document(profile_id, status, note)`** marks the document `verified` or `rejected`, with a note the owner sees. `update_checkpoint` refuses to set `identity_verified` to `verified` unless the owner's document is verified.
- **Deleted once verified.** In the same transaction that marks a document `verified`, `review_identity_document` deletes the photo from the `identity-documents` bucket, clears `file_path` and replaces `document_number` with a keyed fingerprint (`document_number_hmac`). What stays is the document type, issuing country, expiry date, who verified it and when. A rejected document's photo is deleted when the owner replaces it.
- **Why a keyed fingerprint, not the number.** The fingerprint lets the unique check still stop one card verifying two accounts, without holding the number. It must be keyed (HMAC with a secret kept in Supabase Vault, never in the table or the code): a Ghana Card number has few enough possible values that a plain hash can be reversed by trying them all. `save_identity_document` computes the fingerprint of a new number to check it against verified ones. If the key changes, existing fingerprints stop matching and can't be recomputed, because the numbers are gone, so treat the key as permanent and back it up.
- **What this costs us.** Once the photo is gone, a disputed claim can't be settled by looking at the document again; the record shows only that an admin verified it, when, and their internal notes. We accept that for holding less national ID data.
- **A number already on another account.** The unique check refuses it, and can't tell a typing mistake, someone using another person's card, or one person with an old account from each other. So `save_identity_document` tells the owner "This number is already linked to another account. Contact us." and nothing more: it must not reveal which account. Once the person proves the document is theirs (for example, on a video call holding it, as the earlier photo may already be deleted), an admin runs `release_identity_document(profile_id, reason)` on the other account. It deletes that account's document and photo and writes the audit log. If the released document was verified, that account's `identity_verified` checkpoints go back to `unverified`, and its active properties move to `under_review` through the same path as `reopen_review`, because they were approved on an identity that turned out not to be theirs. The owner can then save their document as normal.
- **Individual owners register themselves.** The account, the identity check and the property all belong to the owner, who can do it from abroad with a passport. A relative or lawyer can help them, but not register in their place: the identity check would then confirm the wrong person, `submitted_by` would name someone who doesn't own the land, and a power of attorney can be revoked or end on the owner's death without us knowing. A power of attorney that matters to how the owner got the property is uploaded as a supporting document.
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
2. **Property review page.** The owner's answers, as on their review screen, with fields changed since the last request highlighted; the map with the boundary and any overlapping boundaries; documents with slot, owner's type, final type and status; the owner's identity status, with "Ask for identity" when it isn't verified; the ownership type and structure for the admin to set; the six checkpoints; overlap flags; open document requests; the history from `audit_logs`; and the actions in section 5, including "Expire" (a suspension with the "Verification expired" reason). The approve button lists whatever is still blocking approval.
3. **Second-factor screen.** `/account/security` to set up TOTP and to enter a code after the password (any user).

On the owner's side, `/account/identity` collects the identity document, the dashboard reminds the owner from sign-up until it is saved, and `action_required` needs the admin's message, editable answers and an upload control only for each requested document.

Later: partner verifiers, admin management, registering on someone else's behalf with a power of attorney, data-room requests, checking identity documents with the National Identification Authority or an identity provider, and reporting.

## 9. Build order

1. **Foundation.** `staff_role()` (admin only, with the `aal2` check); admin read grants and policies on tables (the old blanket grants are already revoked); the `/admin` gate in `proxy.ts` and the layout; `/account/security`; and the script that grants the first admin only after a factor is verified.
2. **Document safety.** Type check, isolated conversion to PDF, `preview_path` and `preview_status`, and the admin storage policy that allows only viewable files (section 7).
3. **Read-only console.** Queue and property page, with documents opened through signed URLs.
4. **Review actions.** `start_review`, `classify_property`, `review_document`, `update_checkpoint`, `resolve_overlap`, `approve_property` (with its conditions), `suspend_property`, `reopen_review`, `review_identity_document` (including deleting the photo) and `release_identity_document`, each with tests.
5. **Requesting changes.** `property_document_requests`, `request_changes` (with the identity request), owner editing and request-only uploads in `action_required`, and `resubmit_property` with checkpoint resets.
6. **Identity documents.** The `identity_documents` migration is written (tests in `supabase/tests/identity_documents.test.sql`), but it keeps the number and the photo. A follow-up migration adds `document_number_hmac` with the Vault key, moves the unique check onto it, and lets `file_path` and `document_number` be cleared once verified. Then `/account/identity` and the dashboard card.

### Testing

- **Each function:** test as an owner, a partner verifier (who must get nothing in V1), an admin without MFA, and an admin with MFA. Also test the invalid transitions (for example approving a draft). These are the RLS tests `docs/architecture.md` asks for.
- **Approval:** one test per condition in section 5, each showing that approval is refused when only that condition fails; approval succeeds with waived checkpoints but not with a waived `ownership_claim_verified`.
- **Owner changes:** an upload with no open request is refused; an upload into a request fulfils it; resubmitting with an open request is refused; a boundary change resets exactly the three boundary checkpoints.
- **Identity documents:** an expired document, a file in another user's folder, a number already on another account and a change to a verified document are each refused; a user can't mark their own document verified or see anyone else's; document numbers never reach the audit log. Verifying a document deletes its photo and number and keeps a fingerprint, and a second account saving the same number is still refused afterwards. The refusal doesn't say which account holds the number. `release_identity_document` is admin-only, needs a reason, writes the audit log, lets the other owner save the number afterwards and, when the released document was verified, sends that account's active properties back to review.
- **Identity and classification at approval:** approval is refused when the owner's identity isn't verified (and `identity_verified` can't be waived), and when the ownership type or structure isn't set. `resubmit_property` is refused when identity was asked for and no document is saved.
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
9. **Identity:** a Ghana Card or a passport, once per owner, with a photo and no selfie; reminded on the dashboard, never asked for during registration (section 5). Changed by decision 10.

Decided 2026-10-27, to keep V1 simple:

10. **Identity before activation:** not needed to submit, but `identity_verified` must be `verified` before approval and can't be waived. The admin asks for it through `request_changes`. Done once per owner, not redone when the document expires (section 5).
11. **Identity documents are deleted once verified:** the photo and the number go; a keyed fingerprint of the number, the type, country, expiry date and who verified it and when stay (section 5).
12. **Ownership classification:** the admin sets `ownership_type` and `ownership_structure` with `classify_property`; owners never choose them; approval needs both (section 5).
13. **Expiry:** by hand only, as a suspension with the "Verification expired" reason, when a property draws a lot of views and requests. No timers, reminders or `reverification_pending` status (section 5).
14. **No occupancy check, and admins only:** `occupancy_check` and partner verifiers acting as agents (section 11) are not part of V1.
15. **A number already on another account:** the owner is asked to contact us. Once they prove the document is theirs, an admin removes it from the other account with `release_identity_document`, which is audited. If that document was verified, the other account loses its verified identity and its active properties go back to review (section 5).
16. **Owners register themselves:** an individual owner registers from their own account, from abroad if need be, using a passport. Registering on someone else's behalf with a power of attorney is not in V1; a power of attorney can still be uploaded as a supporting document (section 5).
17. **Deleting:** only drafts are deleted, with their files. Submitted properties are never deleted; owners will withdraw them instead, through a `withdrawn` status (not built yet). How long personal documents are kept is part of the open retention question (section 5).

## 11. Proposal: stricter verification rules (for review)

Proposed 2026-10-22. Nothing in this section is built yet. It covers what keeps a property verified after it goes active, and checks the earlier sections leave out. Two items change V1 decisions in section 10 and need sign-off; they are marked **Changes decision N**.

**Status, 2026-10-27:** to keep V1 simple, these parts are rejected (decisions 13 and 14):

- the `occupancy_check` checkpoint (11.1 item 1, 11.7);
- checkpoint expiry dates, reminders, the `reverification_pending` status and the grace period (11.1 item 2, 11.3, 11.4). Properties are expired by hand instead (section 5);
- partner verifiers acting as agents (11.1 item 3, 11.2). V1 is admins only.

Still undecided, and kept below for later: `encumbrance_clearance` (11.6), keeping resolved overlap flags and first come, first served (11.5), paid leasehold details (11.8) and the wider notifications (11.9).

### 11.1 Summary

1. **Eight checkpoints, not six.** Two are added: `encumbrance_clearance` (court cases and registered encumbrances) and `occupancy_check` (whether someone is already on the land).
2. **Verifications expire.** Each checkpoint has an expiry date. Owners and admins are reminded before it passes. After it passes the property moves to a new `reverification_pending` status for a 30-day grace period, then to `suspended`.
3. **Agents can verify.** A partner verifier or an admin can act as an agent and verify checkpoints. Waiving, approving and suspending stay admin-only. **Changes decision 2.**
4. **Overlaps are first come, first served.** Only the property submitted later is held. The earlier one stays up while an admin investigates.
5. **Leasehold details are paid.** Anyone can see that a property is leasehold and roughly how many years are left. A buyer pays, per property, to see the full lease details.
6. **More notifications, on more channels.** In-app, email and SMS, including expiry reminders and overlap alerts. **Changes decision 6.**

### 11.2 Who does what

| Action                                        | Agent (partner verifier or admin) | Admin only |
| --------------------------------------------- | --------------------------------- | ---------- |
| Verify or flag a checkpoint                   | Yes                               |            |
| Record an official search or an encumbrance   | Yes                               |            |
| Review satellite imagery; record a site visit | Yes                               |            |
| Waive a checkpoint (a reason is required)     |                                   | Yes        |
| Change a checkpoint's expiry date             |                                   | Yes        |
| Resolve an overlap flag                       |                                   | Yes        |
| Approve, suspend, reopen a property           |                                   | Yes        |

- **Ownership still can't be waived** (section 5).
- **Every checkpoint action is recorded**: who, when, the old and new status, the reason and the expiry date. They go in a new `property_checkpoint_events` table that only ever gains rows. A trigger writes it, so no function can skip it. The console shows it as each checkpoint's history.
- **Partner verifiers sign in with a second factor**, under the same rule as admins: `staff_role()` would also return `partner_verifier`, with the same `aal2` and `auth.mfa_factors` checks.

### 11.3 Checkpoints and how long they last

| Checkpoint                    | Verified when                                                                   | Proposed default expiry                                       |
| ----------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `identity_verified`           | The owner's identity document is verified                                       | The document's expiry date, or 2 years, whichever comes first |
| `ownership_claim_verified`    | The ownership documents support the claim                                       | 12 months                                                     |
| `boundary_mapped`             | The boundary is on the map and checked                                          | 24 months, or sooner if the boundary changes                  |
| `cadastral_cross_check`       | The boundary matches the cadastral record                                       | 24 months, or sooner if the boundary changes                  |
| `overlap_clearance`           | No overlap flag is open. Set automatically, never by hand (11.5)                | No date. Re-checked whenever a nearby boundary changes        |
| `official_search_status`      | A Lands Commission search is on record and an agent has reviewed it             | 90 days, and a fresh search before any sale                   |
| `encumbrance_clearance` (new) | A court registry search is on record and no blocking encumbrance is open (11.6) | 90 days                                                       |
| `occupancy_check` (new)       | An agent has reviewed recent satellite imagery of the land (11.7)               | 12 months                                                     |

A Lands Commission search is only true on the day it was run, which is why the two searches have the shortest expiry.

- **Every property has all eight rows.** They are created when a property is submitted, and a migration adds them to existing properties. `approve_property` refuses if any row is missing.
- **Admins can override an expiry date** for one checkpoint on one property, from the console. They must give a reason, and the override is recorded in the checkpoint's history.
- **Changes to section 5:**
  - `approve_property` also refuses if any checkpoint has expired or any row is missing.
  - In `resubmit_property`, a boundary change also resets `occupancy_check`.
  - Any other change also resets `encumbrance_clearance`.

### 11.4 Expiry and the grace period

| When                                   | What happens                                                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 30, 14, 7 and 1 days before expiry     | The owner and admins are notified: what is expiring and what is needed (for example, a new search)                        |
| On the expiry date                     | The property moves to `reverification_pending`. The public page stays up with a notice that verification is being renewed |
| During the grace period (30 days)      | Reminders continue weekly. Agents re-verify the expired checkpoints                                                       |
| 30 days after expiry, if not renewed   | The property moves to `suspended` and follows the existing suspension path (section 5)                                    |
| Once every checkpoint is current again | An admin returns the property to `active` through `approve_property`                                                      |

A daily scheduled job in the database (`pg_cron`) sends the reminders and changes the statuses. Owners see "Your verification needs renewing by [date]".

### 11.5 Overlaps

- **Tolerance.** Ignore an overlap smaller than 1% of the smaller property's area. Small mapping errors would otherwise create false alarms. Measuring against the smaller property stops a small plot from being hidden inside a large one. The threshold lives in one function so it is easy to change.
- **One flag per pair**, not one for each property.
- **Keep resolved flags.** Today the overlap trigger deletes all of a property's flags every time its boundary is saved. That loses an admin's decisions and the record of them. Instead, keep resolved flags and reopen one only if the overlap grows beyond the tolerance.
- **Which property is held.** An active property is never held automatically by an overlap. Otherwise the property submitted later is held. This means adding a `submitted_at` column, set by `submit_property`. Drafts never block anyone.

|               | Property held (submitted later)                                                              | Other property (submitted earlier)                            |
| ------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Status        | Moves to `action_required` and can't become active                                           | Unchanged; its public page stays up                           |
| Owner is told | "Your boundary overlaps an existing registered property. Check your boundary or contact us." | "Another submission overlaps your land. We're investigating." |
| Admins        | Notified, with both boundaries on one map                                                    | Same notification                                             |

Neither owner learns who the other owner is or sees the other boundary (section 5). The earlier property is left alone because otherwise anyone could take down an honest owner's listing just by drawing a boundary over it.

How an admin resolves a flag:

- **`resolved_false_positive`:** the held property is released.
- **`resolved_valid`:** the overlap is real. The held property stays held until its owner corrects the boundary.
- **If the earlier property turns out to be the false claim,** the admin suspends it through `suspend_property`.

`overlap_clearance` is set automatically: verified when no flag on the property is `detected` or `investigating`, and flagged otherwise.

### 11.6 Court cases and encumbrances

A Lands Commission search shows registered encumbrances but not reliably cases in progress at court, so this gets its own checkpoint and two new tables:

```text
property_official_searches
  id, property_id, search_type (lands_commission | court_registry), reference_no, searched_on,
  result (clear | items_found), document_id, performed_by, created_at

property_encumbrances
  id, property_id, search_id, kind (mortgage | caveat | litigation | lease | easement | other),
  reference (suit number or registry reference), parties, status (open | discharged | dismissed | settled),
  blocks_activation, public_notes, internal_notes, recorded_by, resolved_by, resolved_at, created_at
```

- **`official_search_status`** needs a Lands Commission search from the last 90 days.
- **`encumbrance_clearance`** needs:
  - a court registry search from the last 90 days;
  - no open encumbrance with `blocks_activation` set.
- **Proposed default for what blocks activation:** litigation and caveats block it. A mortgage or a lease is disclosed but does not block it. An agent can change the setting on a single record, with a reason.

### 11.7 Is the land already occupied?

There are two levels. Only the first is required.

1. **Imagery review (required, `occupancy_check`).** In the console, the property's boundary is drawn over satellite imagery. Use Esri World Imagery, whose Wayback archive shows how the land changed over time, and Sentinel-2, which is free, updated about every 5 days and coarse but enough to show new structures. The agent records the date of the imagery they reviewed and what they saw. Google's imagery in Ghana is often 1–3 years old, and its terms restrict storing or screenshotting it, so it is not used as evidence.
2. **Site visit (optional, a "Verified on the ground" badge).** An agent visits and uploads photos stamped with the time and GPS location. The server checks the location falls inside the boundary. Stored in a new `property_site_visits` table. The badge lasts 12 months.

### 11.8 Leasehold details

Most land in Ghana is held on a lease (stool, family or state), and a foreign national can hold land only on a lease of up to 50 years (section 5), so years remaining matters to buyers.

- **Stored in a separate table**, `property_leaseholds`:
  - who granted the lease (stool, family or state) and the lessor's name;
  - start date, term in years and expiry date;
  - ground rent;
  - whether the lessor must consent to an assignment.
  - Years remaining is calculated from the expiry date, not stored.
- **Free to everyone:** that the property is leasehold, and a band of years remaining ("50+ years", "25–50 years", "under 25 years").
- **Paid, per property:** the full details. A buyer who has paid has a row in `property_leasehold_access`.
- **Enforced in the database**, not just hidden in the page. The row-level security on `property_leaseholds` checks for that row, so the API returns nothing to someone who hasn't paid.
- **The payment provider is not yet chosen** (11.11).

### 11.9 Notifications

The `notifications` table and its types already exist (section 2). This proposal sends them by three channels: in-app, email and SMS.

| Event                                   | Who is told                              |
| --------------------------------------- | ---------------------------------------- |
| Changes requested, approved, suspended  | Owner (already in section 5)             |
| Checkpoint expiring (30, 14, 7, 1 days) | Owner and admins                         |
| Moved to `reverification_pending`       | Owner and admins                         |
| Overlap detected                        | Both owners (without details) and admins |
| Leasehold details purchased             | The buyer (a receipt)                    |

- **SMS carries no property details**, only a short message and a link, because a phone can be seen or shared by others. It is sent only to owners with a phone number on their profile.
- **SMS costs money per message.** An SMS provider needs choosing; Ghanaian options such as Hubtel or Arkesel are usually cheaper locally than Twilio.
- SMS is still not used for sign-in codes (section 4).

### 11.10 Build order

1. **Checkpoint foundation:**
   - `expires_at` and `waived_reason` (required when waived);
   - the two new checkpoint keys;
   - `property_checkpoint_events`;
   - all eight rows created on submit, and added to existing properties;
   - `verify_checkpoint` and `waive_checkpoint`, with the role checks in 11.2;
   - `staff_role()` extended to partner verifiers.
2. **Overlap rework.** Tolerance, one flag per pair, keeping resolved flags, `submitted_at`, holding the later property, and setting `overlap_clearance` automatically.
3. **Searches and encumbrances.** The two tables in 11.6 and the rules for the two checkpoints that depend on them.
4. **Approval rules.** `approve_property` updated with the conditions in 11.3.
5. **Expiry.** The `reverification_pending` status, the daily job, reminders, and the in-app, email and SMS delivery of notifications.
6. **Occupancy.** The imagery review in the console, then site visits.
7. **Leasehold.** The tables and the free summary. Paid access waits for the payment provider.

### 11.11 Testing

- **Roles:**
  - A partner verifier can verify but not waive, approve, suspend or change an expiry date.
  - A partner verifier or admin without a second factor can do nothing.
  - A waive without a reason is refused.
- **History:** every checkpoint change writes one history row with the right person, and nobody can edit or delete a history row.
- **Approval:** refused when a checkpoint row is missing, when one has expired, or when a blocking encumbrance is open.
- **Expiry:** the daily job sends each reminder once, moves the property to `reverification_pending` on the expiry date, and to `suspended` 30 days later.
- **Overlaps:**
  - An overlap under the tolerance creates no flag.
  - Only the later property is held, and an active property is never held.
  - A resolved flag survives a boundary save that doesn't grow the overlap.
- **Leasehold:** a buyer who hasn't paid gets only the free summary through the API; a buyer who has paid gets the full details for that property only.

### 11.12 Decisions needed

Changes to existing decisions:

1. ~~**Decision 2:** partner verifiers become agents who can verify checkpoints (11.2).~~ Rejected 2026-10-27: admins only.
2. **Decision 6:** notifications for overlaps, and SMS as a channel (11.9). Expiry reminders are dropped with expiry.

Still open:

1. Which payment provider for leasehold access, and what price?
2. Which SMS provider?
3. Is the 1% overlap tolerance (11.5) acceptable?
4. Which kinds of encumbrance block activation, and which should the public property page show? Showing a mortgage publicly may be sensitive for the owner.

Settled by rejection (2026-10-27): who pays for renewal searches, whether partner verifiers see every property, and the expiry and grace periods.
