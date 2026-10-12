-- add acquisition_method, acquisition_metadata, and prop_id columns to the properties table

-- ensure required extension and sequence exist
create extension if not exists postgis;
create extension if not exists pgcrypto;

alter table public.properties
    add column if not exists acquisition_method text not null default 'unsure',
    add column if not exists acquisition_metadata jsonb,
    add column if not exists prop_id text not null unique default concat('PROP-', left(regexp_replace(encode(gen_random_bytes(9), 'base64'), '[^A-Za-z0-9]', '', 'g'), 6));

-- enforce valid acquisition methods
alter table public.properties
    add constraint properties_acquisition_method_check
    check (acquisition_method in ('direct_purchase', 'purchase_from_owner', 'transfer_assignment', 'lease_sublease', 'inheritance', 'other', 'unsure'));

-- change property_type column to be not null and have a check constraint
alter table public.properties
    alter column property_type set default 'residential';

alter table public.properties
    alter column property_type set not null;

alter table public.properties
    drop constraint if exists properties_property_type_check;

alter table public.properties
    add constraint properties_property_type_check
    check (property_type in ('residential', 'commercial', 'industrial', 'land', 'mixed-use', 'other'));

-- drop email and relationship columns from property_co_owners table
alter table public.property_co_owners
    drop column if exists email,
    drop column if exists relationship;

-- boundary_polygon, centroid, boundary_geojson can be null for properties that are not yet geocoded
-- add a column for property marker pin which is the latitude and longitude of the property
alter table public.property_boundaries
    alter column boundary_polygon drop not null,
    alter column centroid drop not null,
    alter column boundary_geojson drop not null;

alter table public.property_boundaries
    add column if not exists marker_pin geography(Point, 4326);