# OurProps Architecture

> **Status:** Working V1 architecture
>
> **Last updated:** 2026-09-30
>
> **Schema reference:** Current proposed OurProps V1 schema (`PostgreSQL + Supabase + PostGIS`)

## 1. Purpose and scope

OurProps is a Ghana-focused property and land management platform intended to improve transparency, security, and reliability in property transactions. Its current product materials focus on reducing uncertainty around property information, ownership claims, boundaries, and supporting documents.

The V1 technical core is:

```text
Property registration -> boundary and evidence submission -> review and verification ->
Property Passport -> controlled sharing of private documents
```

The **Property Passport** is the shareable representation of a property and its verification state. It must present only a deliberately selected public projection of the property; it is not a public copy of the property record or document vault.

OurProps is an independent platform. A verification checkpoint, document review, or overlap flag is not by itself an official registry result, legal opinion, or determination of title.

### Schema status

The SQL schema is the current working V1 proposal, not a final contract. Product-manager decisions must be evaluated from product requirement through domain model, schema, authorization, application behavior, and user interface. This document describes the intended architecture and the schema's current implications; migrations remain the implementation source of truth.

## 2. Goals and non-goals

### Goals

- Maintain one authoritative record for each submitted property and its workflow state.
- Protect identity, ownership, location, and legal-document data by default.
- Store and query property boundaries using geospatial data rather than client-only map shapes.
- Represent verification as explicit, reviewable checkpoints rather than a single boolean.
- Separate a property's public visibility from access to its confidential documents.
- Make material workflow and access decisions auditable.
- Keep V1 operationally simple by using Supabase as the backend platform.

### Non-goals for the current V1 architecture

- Replacing official government registration, searches, or dispute-resolution processes.
- Treating detected overlap as automatic proof that a property or claim is invalid.
- Publishing property documents, Ghana Card records, or owner identity by default.
- Introducing blockchain as a dependency. It appears in earlier product material, but no current V1 workflow or schema requires it.
- Assuming listings, agent matching/management, subscriptions, payments, analytics products, SMS, or government-registry integrations are implemented. These appear in broader product material or remain future decisions.

## 3. System context

```text
Owners / developers / partner verifiers / administrators
                  |
                  v
        Application and server-side actions
                  |
      +-----------+---------------------------+
      |           |                           |
      v           v                           v
Supabase Auth  PostgreSQL + PostGIS     Supabase Storage
      |           |                           |
      |      properties, geometry,       private documents
      |      checkpoints, requests,       and property images
      |      audit logs, notifications
      +-----------+---------------------------+
                  |
                  v
   Limited public Property Passport / controlled data room
```

The application is a single product surface with distinct public, authenticated, and internal-review areas. The implementation framework is intentionally not prescribed by the source materials; whichever web framework is selected must keep privileged operations server-side and use the same authorization rules across all route surfaces.

## 4. Application and repository architecture

The repository should keep product code, database changes, and architecture decisions separate. The following layout is a target organization, not a claim that every directory already exists:

```text
.
├── app/                         # Public, authenticated, and internal route surfaces
│   ├── public/                  # Marketing, discovery, and Passport routes
│   ├── account/                 # Sign-up, onboarding, dashboard
│   ├── properties/              # Registration and property management
│   └── admin/                   # Review and verification workflows
├── components/                  # Reusable UI by domain
├── lib/
│   ├── auth/                    # Session and authorization helpers
│   ├── properties/              # Property lifecycle operations
│   ├── verification/            # Checkpoint and review operations
│   ├── geography/               # Geometry input and query helpers
│   ├── documents/               # Storage and data-room authorization
│   └── notifications/           # In-app and delivery orchestration
├── types/                       # Shared domain and database types
├── supabase/
│   ├── migrations/              # Versioned schema, functions, policies, indexes
│   ├── functions/               # Privileged or asynchronous backend work, if needed
│   └── seed.sql                 # Non-production development data only
├── tests/                       # Unit, integration, RLS, and workflow tests
├── docs/
│   └── adr/                     # Accepted architectural decisions
└── architecture.md
```

Application code may compose domain operations, but it must not bypass database authorization. Browser code uses the normal authenticated client; service-role credentials are reserved for narrowly scoped server-side work and must never be exposed to the browser.

## 5. Supabase, PostgreSQL, PostGIS, and Storage

### Supabase Auth and profiles

Supabase Auth provides account identity and session management. The `profiles` table extends `auth.users` with full name, phone number, role, optional organization name, and onboarding status. The current schema includes a one-to-one `ghana_card_records` relation for Ghana Card verification status.

Account-registration material identifies Property Owner, Buyer/Investor, and Real Estate Agent as product profile types. The current schema instead defines `owner`, `developer`, `partner_verifier`, and `admin` authorization roles. These are related concepts but must not be silently treated as the same model. The final mapping is an open authorization decision.

### PostgreSQL

PostgreSQL is the system of record for application state. It stores properties, ownership relationships, verification state, document metadata, access requests, audit events, and notifications. Database constraints and foreign keys carry domain invariants where possible.

### PostGIS

PostGIS stores property geometry and performs spatial operations. The working schema enables PostGIS and has one current `property_boundaries` record per property, with a `GEOMETRY(Polygon, 4326)` polygon, retained GeoJSON input, generated centroid, generated square-metre area, and a GiST spatial index.

This one-boundary relationship represents the current state only. Boundary revision history, competing survey submissions, and versioned geometry are not yet modeled and require a schema change if needed.

### Supabase Storage

Storage holds objects while PostgreSQL holds their metadata and authorization context. `property_documents` records private storage paths and default confidentiality; `property_images` records image metadata and permits at most three ordered images per property in the current proposal. Storage buckets must be private by default. Download URLs for confidential objects are short-lived and issued only after server-side authorization succeeds.

## 6. Domain model

```text
Profile
  |- Ghana Card record (current proposal: at most one)
  |- submits -> Property

Property
  |- co-owners
  |- current boundary
  |- images
  |- private documents
  |- verification checkpoints
  |- overlap/conflict flags
  |- data-room access requests
  |- audit events
  `- notifications referencing its workflow entities
```

The primary aggregate is the **Property**. The proposed `properties` record contains submission ownership, slug, property and ownership classifications, Ghana location fields, declared size, visibility, and lifecycle status. Co-owners are contact relationships, not currently authenticated ownership accounts. Any requirement for legally authoritative ownership shares or co-owner sign-off must be modeled explicitly before implementation.

## 7. Roles and authorization

Authorization uses authenticated identity, role, and a record-level relationship. Role checks in the user interface are for usability only; database policy and server-side checks are the enforcement boundary.

| Current role       | Architectural responsibility                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `owner`            | Submit and manage properties to which the account has an authorized relationship.                                   |
| `developer`        | Current schema role; its exact property and organization permissions require confirmation.                          |
| `partner_verifier` | Current schema role for verification work; permitted actions must be constrained to assigned or authorized records. |
| `admin`            | Internal administration and review, subject to audit logging and least privilege.                                   |

Public visitors and data-room requesters are not authorization roles in the current schema. They receive only the limited data permitted by public Passport rules or an approved, time-bounded data-room grant.

## 8. Property lifecycle and registration

The proposed lifecycle is:

```text
draft -> submitted -> under_review -> active_passport
                    |                   |
                    v                   v
             action_required        suspended
                    |
                    +---- resubmission -> under_review
```

`active_passport` is a reviewer-controlled state; submission alone must not activate a Passport. The exact transition policy, including who can suspend and what evidence is required for activation, belongs in server-side domain logic and database policies.

The source registration flow is:

```text
Create account -> dashboard -> add property -> property details -> map/coordinates ->
boundary validation -> documents -> visibility and ownership preferences -> submit ->
review -> active Passport or action required
```

Current registration material includes identity/contact details, ownership type and structure, property details and location, size, GPS coordinates or GhanaPost Digital Address, boundary definition, documents, up to three images, visibility, availability, declarations, and consent. The working schema does not model every form field (for example, availability, agent management, declarations, or consent). Do not imply persistence for those fields until a manager-approved migration exists.

## 9. Geospatial architecture

Boundary input supports the documented approaches: map markers/polygon drawing and manual GPS or cadastral-coordinate input. GeoJSON is an interchange and input format; the authoritative geometry is the validated PostGIS polygon.

Before a boundary is accepted, the application and database workflow must validate coordinate format, polygon closure, polygon validity, and self-intersection. Area and centroid are calculated from the stored geometry rather than trusted from client input.

When a property is submitted or its boundary changes, the spatial workflow should query candidate intersections using the GiST index, then calculate the true intersection area. It records reviewable `property_overlap_flags` with the detected overlap area and percentage. A boundary touch, adjacency, or automated geometry result is not automatically a legal conflict. The current statuses are `detected`, `investigating`, `resolved_valid`, and `resolved_false_positive`.

## 10. Verification and checkpoints

Verification is represented by one unique checkpoint per property and checkpoint key. The proposed keys are:

- `identity_verified`
- `capacity_to_transact`
- `boundary_mapped`
- `cadastral_cross_check`
- `overlap_clearance`
- `official_search_status`

Each checkpoint has a separate status (`unverified`, `submitted`, `in_progress`, `verified`, `flagged`, or `waived`), reviewer, timestamps, public notes, and internal notes. This supports a truthful verification matrix and prevents an incomplete property from being represented as simply verified or unverified.

Internal notes are never part of the public projection. Checkpoint changes must be authorized, auditable, and performed through a server-side operation that updates the property lifecycle consistently.

## 11. Property Passport and visibility

The Property Passport is a stable, shareable public page identified by the property's unique slug. Its public data contract should be an explicit query, database view, or server-side projection rather than a direct read of the `properties` table.

The current visibility values mean:

| Visibility | Passport behavior                                                                            |
| ---------- | -------------------------------------------------------------------------------------------- |
| `private`  | Restricted; no general public exposure.                                                      |
| `unlisted` | Available through a direct Passport link, but not intended for general browsing or indexing. |
| `public`   | Eligible for public discovery and browsing.                                                  |

Visibility concerns the public property representation, not document access. A public or unlisted Passport must not reveal confidential document paths, national-ID data, private contacts, internal notes, or audit-log contents. The final Passport field list and whether an owner can hide ownership details remain product decisions.

## 12. Data room

The data room provides a separate, controlled path to private document access:

```text
Passport -> request access -> pending request -> authorized review ->
approved/rejected -> time-limited access or expiry
```

The proposed `data_room_access_requests` table records requester contact information, optional buyer category, state, approver, opaque access token, and expiry. Requests progress through `pending`, `approved`, `rejected`, or `expired`.

Approval must be limited to a property and authorized documents, and must expire. The current proposal does not define a per-document grant table, watermarking, download rules, or the precise approver model. Therefore, those controls are open questions, not implied features. Access requests, approvals, denials, token use, and document delivery should be audited.

## 13. RLS and security model

Row Level Security is mandatory on application tables and Storage objects. UI route guards do not replace RLS.

| Resource                                  | Minimum policy intent                                                                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profiles and Ghana Card records           | A user accesses their own profile/identity data; privileged reviewers access only as explicitly authorized.                                                                                 |
| Properties, boundaries, images, documents | Submitter and any future approved ownership relationship can access permitted records; reviewers and administrators receive least-privilege access for work they are authorized to perform. |
| Checkpoints and overlap flags             | Owners receive only the permitted external-facing state; internal notes and reviewer data remain restricted.                                                                                |
| Data-room requests                        | Requesters can create a request; property-side approvers can review requests for authorized properties; tokens do not grant broad database access.                                          |
| Notifications                             | Recipients can read and update their own notification state.                                                                                                                                |
| Audit logs                                | Users do not edit audit history. Write access is restricted to trusted server/database paths; read access is narrowly scoped.                                                               |
| Storage                                   | Object paths are not public capability URLs. Object read/download follows the same property and data-room authorization model.                                                              |

The public Passport should use an intentionally narrow anonymous-read surface. Do not make a base property table publicly selectable merely to serve a Passport. All service-role calls, signed URL generation, state transitions, reviewer actions, and token validation occur on the server or in tightly scoped backend functions.

## 14. Auditability and notifications

`audit_logs` captures the actor, associated property, action name, metadata, and timestamp. Material actions include property creation and submission, status transitions, document upload and review, checkpoint changes, overlap resolution, data-room decisions, and document access. Audit events should be append-only in normal operation and must avoid storing secrets or raw private document contents in metadata.

`notifications` supports in-app notifications with an entity reference, action URL, read state, and email delivery state. The current event vocabulary includes property review outcomes, checkpoint and document decisions, overlap detection, and data-room requests/decisions. Delivery provider, retry behavior, templates, and any SMS channel are not yet specified.

## 15. Deployment, CI/CD, and environments

V1 has two deployable concerns: the application and Supabase configuration (migrations, RLS policies, Storage policies, and any functions). The hosting vendor and CI provider are not fixed by the current sources.

At a minimum, maintain isolated development, staging, and production environments. Production credentials, Supabase service-role keys, and signing secrets are held only in the deployment secret manager. Never promote schema by manually editing production outside versioned migrations.

Every change should validate, in a non-production environment:

- application formatting, linting, type checks, and automated tests;
- migration application on a clean database and migration compatibility with the target environment;
- RLS tests for owner, reviewer, administrator, anonymous Passport visitor, and unauthorised user paths;
- PostGIS boundary validation and overlap-query tests;
- Storage policy and signed-URL authorization tests.

Production release should be traceable to a commit and migration set, with a documented rollback or forward-fix procedure for both application and database changes.

## 16. Observability

Operational logs must capture failures in authentication, database operations, storage access, background work, and notification delivery without logging Ghana Card values, access tokens, document contents, or signed URLs.

Measure technical health such as request failures, latency, migration status, storage failures, and asynchronous job failures. Product events may include submission, review outcome, checkpoint change, overlap detection, Passport view, and data-room request or decision, subject to a privacy review. Analytics must use the minimum information required and must not become an alternate store of sensitive property data.

## 17. Sanity.io Content Management System

Marketing and public-facing content is managed in Sanity.io. The CMS is not a source of truth for property, verification, or document data. It is used for marketing pages, FAQs, and other public-facing content. The CMS should be configured to prevent accidental exposure of sensitive data and should be integrated with the application in a way that respects the same authorization and visibility rules as the rest of the platform.

## 18. Architectural decisions

### ADR-001: Supabase is the V1 backend platform

**Status:** Accepted for the current working architecture.

Supabase Auth, PostgreSQL, PostGIS, and Storage provide the identity, relational, spatial, and file-storage foundation. This keeps V1 infrastructure compact while preserving database-level controls.

### ADR-002: PostgreSQL is the source of truth

**Status:** Accepted.

The application, Passport, and notifications are derived from database state. Client-side maps, forms, and cached views are not independent records of property or verification truth.

### ADR-003: Store boundaries in PostGIS

**Status:** Accepted.

GeoJSON is retained for input/representation, while validated geometry and spatial operations live in PostGIS. This supports indexed overlap analysis and generated geographic values.

### ADR-004: Verification uses checkpoints

**Status:** Accepted.

Separate checkpoint states accurately represent partial review and support a transparent Passport without overclaiming a single global verification state.

### ADR-005: Documents are private by default

**Status:** Accepted.

Document metadata lives in PostgreSQL; content stays in private Storage. Any delivery is authorization-checked, temporary, scoped, and auditable.

### ADR-006: The proposed V1 schema may change

**Status:** Accepted.

Manager-approved requirements may alter tables, relationships, states, and policies. A migration should follow an explicit domain and authorization review rather than patching an isolated column or UI flow.

### ADR-007: Agent Management

**Status:** Accepted.

An owner can choose to delegate property management to an agent. The agent is a verified user with a defined relationship to the property owner. The system must enforce that agents can only act on behalf of the owners they are authorized to represent. In V1, agent management is not implemented, but the architecture must support future agent delegation and authorization.

## 18. Open questions

- What is the final separation between product profile types and authorization roles?
- Do developers and partner verifiers act as organizations, and how are organization memberships and assignments modeled?
- Which property fields from the registration form are required and persisted in V1, including availability, consent, and ownership-visibility preferences?
- What evidence and authority are required to transition a property to `active_passport` or `suspended`?
- Which checkpoint states and notes are visible on the Passport, and what is the approved public disclaimer?
- What exact government or official-search integrations, if any, are in scope?
- What rules distinguish an overlap alert, adjacency, and a resolved conflict, and who may resolve each?
- Is boundary revision history required before launch?
- Who may approve data-room requests, which documents can be shared, and what constitutes a document-access event?
- What are the document retention, deletion, encryption, and incident-response requirements?
- Which map provider, notification provider, hosting provider, CI system, and observability tooling will be selected?
- Are listings, buyer/investor accounts, agents, marketplace workflows, payments, subscriptions, or government-agency features part of the V1 release?
