-- the numbers behind the admin dashboard (/admin/overview): how many owners, where their properties are in the review,
-- how fast submissions arrive and get verified, where the properties are, and identity documents. one call, admins
-- only.
--
-- drafts are counted but never listed: admins can't see a draft's details (20261029130000_admin_review_reads.sql), and
-- a count tells them nothing about any one owner. map points are only for properties out of draft, which admins can
-- already read, and carry no owner.
create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  first_week date := (date_trunc('week', now()) - interval '11 weeks')::date;
  result jsonb;
begin
  if (select public.staff_role()) is distinct from 'admin' then
    raise exception 'Only admins can see the dashboard.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users', (
      select jsonb_build_object(
        'owners', count(*) filter (where role = 'owner'),
        'developers', count(*) filter (where role = 'developer'),
        'admins', count(*) filter (where role = 'admin'),
        'new_owners_30_days', count(*) filter (where role = 'owner' and created_at >= now() - interval '30 days')
      )
      from public.profiles
    ),

    'properties', (
      select coalesce(jsonb_object_agg(status, total), '{}'::jsonb)
      from (select status, count(*) as total from public.properties group by status) as by_status
    ),

    -- each of the last 12 weeks, Monday first: properties sent to us (first submissions) and properties verified
    'weekly', (
      select jsonb_agg(jsonb_build_object('week', week, 'submitted', submitted, 'verified', verified) order by week)
      from (
        select
          weeks.week,
          (select count(*) from public.audit_logs
           where action = 'property_submitted' and created_at >= weeks.week and created_at < weeks.week + interval '1 week') as submitted,
          (select count(*) from public.audit_logs
           where action = 'property_approved' and created_at >= weeks.week and created_at < weeks.week + interval '1 week') as verified
        from generate_series(first_week, date_trunc('week', now())::date, interval '1 week') as weeks(week)
      ) as weekly
    ),

    -- from first submission to first approval, for properties verified in the last 90 days
    'median_days_to_verify', (
      select percentile_cont(0.5) within group (order by extract(epoch from approved.at - submitted.at) / 86400)
      from (
        select property_id, min(created_at) as at from public.audit_logs where action = 'property_approved' group by property_id
      ) as approved
      join (
        select property_id, min(created_at) as at from public.audit_logs where action = 'property_submitted' group by property_id
      ) as submitted using (property_id)
      where approved.at >= now() - interval '90 days'
    ),

    'regions', (
      select coalesce(jsonb_agg(jsonb_build_object('region', region, 'total', total, 'verified', verified) order by total desc, region), '[]'::jsonb)
      from (
        select coalesce(region, 'Not given') as region, count(*) as total, count(*) filter (where status = 'active') as verified
        from public.properties
        where status <> 'draft'
        group by coalesce(region, 'Not given')
      ) as by_region
    ),

    'identities', (
      select coalesce(jsonb_object_agg(verification_status, total), '{}'::jsonb)
      from (select verification_status, count(*) as total from public.identity_documents group by verification_status) as by_status
    ),

    -- where each property out of draft is: its boundary's centre, or the pin when there's no shape
    'points', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', properties.id,
        'name', properties.name,
        'status', properties.status,
        'lat', coalesce(public.st_y(boundaries.centroid), public.st_y(boundaries.marker_pin::public.geometry)),
        'lng', coalesce(public.st_x(boundaries.centroid), public.st_x(boundaries.marker_pin::public.geometry))
      )), '[]'::jsonb)
      from public.properties
      join public.property_boundaries as boundaries on boundaries.property_id = properties.id
      where properties.status <> 'draft'
        and coalesce(boundaries.centroid::text, boundaries.marker_pin::text) is not null
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard() from public, anon;
grant execute on function public.admin_dashboard() to authenticated;
