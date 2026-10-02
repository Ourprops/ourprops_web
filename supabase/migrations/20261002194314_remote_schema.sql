SET local check_function_bodies = off;

CREATE EXTENSION "postgis" SCHEMA "public";

CREATE TABLE "public"."audit_logs" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "actor_id"    uuid,
  "property_id" uuid,
  "action"      text                     NOT NULL,
  "metadata"    jsonb,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."audit_logs"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."data_room_access_requests" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"     uuid                     NOT NULL,
  "requester_name"  text                     NOT NULL,
  "requester_email" text                     NOT NULL,
  "requester_phone" text                     NOT NULL,
  "buyer_type"      text,
  "access_token"    text,
  "status"          text                     NOT NULL DEFAULT 'pending'::text,
  "approved_by"     uuid,
  "expires_at"      timestamp with time zone,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "data_room_access_requests_access_token_key" UNIQUE (access_token),
  CONSTRAINT "data_room_access_requests_buyer_type_check"
    CHECK ((buyer_type = ANY (ARRAY['individual_local'::text, 'diaspora'::text, 'developer_investor'::text, 'broker_lawyer'::text]))),
  CONSTRAINT "data_room_access_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "data_room_access_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text])))
);

ALTER TABLE "public"."data_room_access_requests"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ghana_card_records" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "profile_id"          uuid                     NOT NULL,
  "ghana_card_id"       text                     NOT NULL,
  "verification_status" text                     NOT NULL DEFAULT 'unverified'::text,
  "verified_at"         timestamp with time zone,
  "verified_by"         uuid,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ghana_card_records_ghana_card_id_key" UNIQUE (ghana_card_id),
  CONSTRAINT "ghana_card_records_pkey" PRIMARY KEY (id),
  CONSTRAINT "ghana_card_records_profile_id_key" UNIQUE (profile_id),
  CONSTRAINT "ghana_card_records_verification_status_check" CHECK ((verification_status = ANY (ARRAY['unverified'::text, 'pending'::text, 'verified'::text, 'failed'::text])))
);

ALTER TABLE "public"."ghana_card_records"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."notifications" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "recipient_id" uuid                     NOT NULL,
  "type"         text                     NOT NULL,
  "entity_type"  text                     NOT NULL,
  "entity_id"    uuid                     NOT NULL,
  "title"        text                     NOT NULL,
  "body"         text                     NOT NULL,
  "action_url"   text,
  "read_at"      timestamp with time zone,
  "emailed_at"   timestamp with time zone,
  "email_failed" boolean                  NOT NULL DEFAULT false,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "notifications_entity_type_check" CHECK ((entity_type = ANY (ARRAY['property'::text, 'document'::text, 'checkpoint'::text, 'data_room_request'::text]))),
  CONSTRAINT "notifications_pkey" PRIMARY KEY (id),
  CONSTRAINT "notifications_type_check"
    CHECK
    ((type = ANY (ARRAY['property.submitted'::text, 'property.under_review'::text, 'property.changes_requested'::text, 'property.approved'::text, 'property.rejected'::text,
    'checkpoint.verified'::text,
    'checkpoint.flagged'::text,
    'document.accepted'::text,
    'document.rejected'::text, 'overlap.detected'::text, 'dataroom.access_requested'::text, 'dataroom.access_granted'::text, 'dataroom.access_denied'::text])))
);

ALTER TABLE "public"."notifications"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"                  uuid                     NOT NULL,
  "full_name"           text                     NOT NULL,
  "phone_number"        text                     NOT NULL,
  "role"                text                     NOT NULL,
  "onboarding_complete" boolean                  NOT NULL DEFAULT false,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id),
  CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['owner'::text, 'developer'::text, 'partner_verifier'::text, 'admin'::text])))
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."properties" (
  "id"                    uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "submitted_by"          uuid                     NOT NULL,
  "slug"                  text                     NOT NULL,
  "name"                  text                     NOT NULL,
  "property_type"         text                     NOT NULL,
  "ownership_type"        text                     NOT NULL,
  "ownership_structure"   text                     NOT NULL,
  "region"                text                     NOT NULL DEFAULT 'Greater Accra'::text,
  "district_municipality" text,
  "city_town"             text                     NOT NULL,
  "digital_address"       text,
  "landmark"              text,
  "description"           text,
  "size_value"            numeric                  NOT NULL,
  "size_unit"             text                     NOT NULL,
  "visibility"            text                     NOT NULL DEFAULT 'unlisted'::text,
  "status"                text                     NOT NULL DEFAULT 'draft'::text,
  "created_at"            timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"            timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "properties_ownership_structure_check" CHECK ((ownership_structure = ANY (ARRAY['sole'::text, 'co_owned'::text, 'company'::text]))),
  CONSTRAINT "properties_ownership_type_check"
    CHECK ((ownership_type = ANY (ARRAY['customary_family'::text, 'stool_sublease'::text, 'state_lease'::text, 'private_freehold'::text]))),
  CONSTRAINT "properties_pkey" PRIMARY KEY (id),
  CONSTRAINT "properties_property_type_check"
    CHECK ((property_type = ANY (ARRAY['residential_land'::text, 'commercial_land'::text, 'house'::text, 'apartment'::text, 'mixed_use'::text]))),
  CONSTRAINT "properties_size_unit_check" CHECK ((size_unit = ANY (ARRAY['sqm'::text, 'acres'::text, 'plots'::text, 'hectares'::text]))),
  CONSTRAINT "properties_slug_key" UNIQUE (slug),
  CONSTRAINT "properties_status_check"
    CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'action_required'::text, 'active_passport'::text, 'suspended'::text]))),
  CONSTRAINT "properties_visibility_check" CHECK ((visibility = ANY (ARRAY['private'::text, 'unlisted'::text, 'public'::text])))
);

ALTER TABLE "public"."properties"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."property_boundaries" (
  "id"               uuid                          NOT NULL DEFAULT gen_random_uuid(),
  "property_id"      uuid                          NOT NULL,
  "boundary_polygon" public.geometry(Polygon,4326) NOT NULL,
  "boundary_geojson" jsonb                         NOT NULL,
  "source"           text                          NOT NULL,
  "created_at"       timestamp with time zone      NOT NULL DEFAULT now(),
  CONSTRAINT "property_boundaries_pkey" PRIMARY KEY (id),
  CONSTRAINT "property_boundaries_property_id_key" UNIQUE (property_id),
  CONSTRAINT "property_boundaries_source_check" CHECK ((source = ANY (ARRAY['manual_draw'::text, 'cadastral_coords'::text, 'geojson_import'::text, 'ground_survey'::text])))
);

ALTER TABLE "public"."property_boundaries"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."property_checkpoints" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"    uuid                     NOT NULL,
  "checkpoint_key" text                     NOT NULL,
  "status"         text                     NOT NULL DEFAULT 'unverified'::text,
  "verified_by"    uuid,
  "public_notes"   text,
  "internal_notes" text,
  "verified_at"    timestamp with time zone,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "property_checkpoints_checkpoint_key_check"
    CHECK
    ((checkpoint_key = ANY (ARRAY['identity_verified'::text, 'ownership_claim_verified'::text, 'boundary_mapped'::text, 'cadastral_cross_check'::text, 'overlap_clearance'::text,
    'official_search_status'::text]))),
  CONSTRAINT "property_checkpoints_pkey" PRIMARY KEY (id),
  CONSTRAINT "property_checkpoints_property_id_checkpoint_key_key" UNIQUE (property_id, checkpoint_key),
  CONSTRAINT "property_checkpoints_status_check"
    CHECK ((status = ANY (ARRAY['unverified'::text, 'submitted'::text, 'in_progress'::text, 'verified'::text, 'flagged'::text, 'waived'::text])))
);

ALTER TABLE "public"."property_checkpoints"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."property_co_owners" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id" uuid                     NOT NULL,
  "profile_id"  uuid,
  "full_name"   text                     NOT NULL,
  "email"       text                     NOT NULL,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "property_co_owners_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."property_co_owners"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."property_documents" (
  "id"                  uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"         uuid                     NOT NULL,
  "uploaded_by"         uuid                     NOT NULL,
  "document_type"       text                     NOT NULL,
  "file_path"           text                     NOT NULL,
  "file_name"           text                     NOT NULL,
  "file_size_bytes"     bigint                   NOT NULL,
  "mime_type"           text                     NOT NULL,
  "verification_status" text                     NOT NULL DEFAULT 'unreviewed'::text,
  "is_confidential"     boolean                  NOT NULL DEFAULT true,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "property_documents_document_type_check"
    CHECK
    ((document_type = ANY (ARRAY['barcoded_site_plan'::text, 'indenture_sublease'::text, 'land_title_certificate'::text, 'deed_of_assignment'::text, 'power_of_attorney'::text,
    'lands_commission_search'::text, 'court_judgment'::text, 'other_supporting'::text]))),
  CONSTRAINT "property_documents_pkey" PRIMARY KEY (id),
  CONSTRAINT "property_documents_verification_status_check" CHECK ((verification_status = ANY (ARRAY['unreviewed'::text, 'accepted'::text, 'rejected'::text, 'superseded'::text])))
);

ALTER TABLE "public"."property_documents"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."property_images" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"     uuid                     NOT NULL,
  "file_path"       text                     NOT NULL,
  "file_name"       text                     NOT NULL,
  "file_size_bytes" bigint                   NOT NULL,
  "mime_type"       text                     NOT NULL,
  "caption"         text,
  "alt_text"        text,
  "display_order"   integer                  NOT NULL DEFAULT 0,
  "is_primary"      boolean                  NOT NULL DEFAULT false,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "property_images_display_order_check" CHECK (((display_order >= 0) AND (display_order <= 2))),
  CONSTRAINT "property_images_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."property_images"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."property_overlap_flags" (
  "id"                         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "property_id"                uuid                     NOT NULL,
  "conflicting_property_id"    uuid                     NOT NULL,
  "overlap_area_sqm"           numeric                  NOT NULL,
  "overlap_percentage_subject" numeric                  NOT NULL,
  "status"                     text                     NOT NULL DEFAULT 'detected'::text,
  "created_at"                 timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "property_overlap_flags_check" CHECK ((property_id <> conflicting_property_id)),
  CONSTRAINT "property_overlap_flags_pkey" PRIMARY KEY (id),
  CONSTRAINT "property_overlap_flags_status_check" CHECK ((status = ANY (ARRAY['detected'::text, 'investigating'::text, 'resolved_valid'::text, 'resolved_false_positive'::text])))
);

ALTER TABLE "public"."property_overlap_flags"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."property_boundaries"
  ADD COLUMN "centroid" public.geometry(Point,4326) GENERATED ALWAYS AS (public.st_centroid(boundary_polygon)) STORED;

ALTER TABLE "public"."property_boundaries"
  ADD COLUMN "area_sqm" numeric GENERATED ALWAYS AS (public.st_area((boundary_polygon)::public.geography)) STORED;

CREATE OR REPLACE FUNCTION public.check_property_boundary_overlaps()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public', 'extensions'
  AS $function$
BEGIN
    -- Remove previous overlap flags for this property
    DELETE FROM property_overlap_flags
    WHERE property_id = NEW.property_id;

    INSERT INTO property_overlap_flags (
        property_id,
        conflicting_property_id,
        overlap_area_sqm,
        overlap_percentage_subject
    )
    SELECT
        NEW.property_id,
        pb.property_id,
        ST_Area(i.intersection_geog) AS overlap_area_sqm,
        (
            ST_Area(i.intersection_geog)
            / NULLIF(ST_Area(NEW.boundary_polygon::geography), 0)
        ) * 100 AS overlap_percentage_subject
    FROM property_boundaries pb
    CROSS JOIN LATERAL (
        SELECT ST_Intersection(
            NEW.boundary_polygon,
            pb.boundary_polygon
        )::geography AS intersection_geog
    ) i
    WHERE pb.property_id <> NEW.property_id
      AND ST_Intersects(
          NEW.boundary_polygon,
          pb.boundary_polygon
      )
      AND ST_Area(i.intersection_geog) > 5.0;

    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
  RETURNS event_trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'pg_catalog'
  AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC, "anon", "authenticated";

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."audit_logs"
  ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES public.profiles(id);

ALTER TABLE "public"."data_room_access_requests"
  ADD CONSTRAINT "data_room_access_requests_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."ghana_card_records"
  ADD CONSTRAINT "ghana_card_records_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."ghana_card_records"
  ADD CONSTRAINT "ghana_card_records_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."audit_logs"
  ADD CONSTRAINT "audit_logs_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

ALTER TABLE "public"."data_room_access_requests"
  ADD CONSTRAINT "data_room_access_requests_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE "public"."properties"
  ADD CONSTRAINT "properties_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE "public"."property_boundaries"
  ADD CONSTRAINT "property_boundaries_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE "public"."property_checkpoints"
  ADD CONSTRAINT "property_checkpoints_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE "public"."property_checkpoints"
  ADD CONSTRAINT "property_checkpoints_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."property_co_owners"
  ADD CONSTRAINT "property_co_owners_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE "public"."property_co_owners"
  ADD CONSTRAINT "property_co_owners_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE "public"."property_documents"
  ADD CONSTRAINT "property_documents_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE "public"."property_documents"
  ADD CONSTRAINT "property_documents_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);

ALTER TABLE "public"."property_images"
  ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE "public"."property_overlap_flags"
  ADD CONSTRAINT "property_overlap_flags_conflicting_property_id_fkey" FOREIGN KEY (conflicting_property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE "public"."property_overlap_flags"
  ADD CONSTRAINT "property_overlap_flags_property_id_fkey" FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

CREATE INDEX idx_audit_logs_actor_id ON public.audit_logs USING btree (actor_id);

CREATE INDEX idx_audit_logs_property_id ON public.audit_logs USING btree (property_id);

CREATE INDEX idx_data_room_requests_property_id ON public.data_room_access_requests USING btree (property_id);

CREATE INDEX idx_notifications_entity ON public.notifications USING btree (entity_type, entity_id);

CREATE INDEX idx_notifications_recipient_unread ON public.notifications USING btree (recipient_id, read_at)
  WHERE (read_at IS NULL);

CREATE UNIQUE INDEX idx_one_primary_image_per_property ON public.property_images USING btree (property_id)
  WHERE (is_primary = true);

CREATE INDEX idx_properties_status ON public.properties USING btree (status);

CREATE INDEX idx_properties_submitted_by ON public.properties USING btree (submitted_by);

CREATE INDEX idx_properties_visibility ON public.properties USING btree (visibility);

CREATE INDEX idx_property_boundaries_geo ON public.property_boundaries USING gist (boundary_polygon);

CREATE INDEX idx_property_checkpoints_property_id ON public.property_checkpoints USING btree (property_id);

CREATE INDEX idx_property_co_owners_property_id ON public.property_co_owners USING btree (property_id);

CREATE INDEX idx_property_documents_property_id ON public.property_documents USING btree (property_id);

CREATE UNIQUE INDEX idx_property_images_order ON public.property_images USING btree (property_id, display_order);

CREATE INDEX idx_property_images_property_id ON public.property_images USING btree (property_id);

CREATE INDEX idx_property_overlap_flags_property_id ON public.property_overlap_flags USING btree (property_id);

CREATE TRIGGER trg_detect_boundary_overlap
  AFTER INSERT OR UPDATE ON public.property_boundaries
  FOR EACH ROW
  EXECUTE FUNCTION public.check_property_boundary_overlaps();

CREATE EVENT TRIGGER "ensure_rls"
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION "public"."rls_auto_enable"();

COMMENT ON EXTENSION "postgis" IS 'PostGIS geometry and geography spatial types and functions';

GRANT EXECUTE ON FUNCTION "public"."check_property_boundary_overlaps"() TO PUBLIC, "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."check_property_boundary_overlaps"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."check_property_boundary_overlaps"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."check_property_boundary_overlaps"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."rls_auto_enable"() TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."audit_logs" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."audit_logs" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."audit_logs" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."audit_logs" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."data_room_access_requests" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."data_room_access_requests" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."data_room_access_requests" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."data_room_access_requests" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ghana_card_records" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."ghana_card_records" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ghana_card_records" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ghana_card_records" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."notifications" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."notifications" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."profiles" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."properties" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."properties" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."properties" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."properties" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_boundaries" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."property_boundaries" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_boundaries" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_boundaries" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_checkpoints" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."property_checkpoints" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_checkpoints" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_checkpoints" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_co_owners" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."property_co_owners" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_co_owners" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_co_owners" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_documents" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."property_documents" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_documents" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_documents" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_images" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."property_images" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_images" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_images" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_overlap_flags" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."property_overlap_flags" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_overlap_flags" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."property_overlap_flags" TO "service_role";

