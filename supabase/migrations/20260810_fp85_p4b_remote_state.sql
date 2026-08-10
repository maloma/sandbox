-- FP85 P4B: authenticated, household-scoped authoritative remote state.
-- This migration intentionally creates no financial entity tables beyond the
-- single canonical remote-state row per household.

create table public.familypilot_household_access (
  household_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  primary key (household_id, user_id)
);

alter table public.familypilot_household_access enable row level security;

revoke all on table public.familypilot_household_access from anon, authenticated;
grant select on table public.familypilot_household_access to authenticated;

create policy "authenticated users read their own household access"
  on public.familypilot_household_access
  for select
  to authenticated
  using (user_id = auth.uid());

create table public.familypilot_remote_state (
  household_id text primary key,
  revision bigint not null check (revision >= 1),
  state_schema_version integer not null check (state_schema_version >= 1),
  payload text not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  updated_at bigint not null,
  updated_by text not null
);

alter table public.familypilot_remote_state enable row level security;

revoke all on table public.familypilot_remote_state from anon, authenticated;
grant select on table public.familypilot_remote_state to authenticated;

create policy "authenticated members read household remote state"
  on public.familypilot_remote_state
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.familypilot_household_access as access_row
      where access_row.household_id = familypilot_remote_state.household_id
        and access_row.user_id = auth.uid()
    )
  );

create or replace function public.familypilot_compare_and_swap_state(
  p_household_id text,
  p_expected_revision bigint,
  p_revision bigint,
  p_state_schema_version integer,
  p_payload text,
  p_payload_sha256 text,
  p_updated_at bigint,
  p_updated_by text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.familypilot_remote_state%rowtype;
  v_current_revision bigint;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'authentication required';
  end if;

  if p_household_id is null or btrim(p_household_id) = '' then
    raise exception using errcode = '22023', message = 'household id is required';
  end if;

  if not exists (
    select 1
    from public.familypilot_household_access as access_row
    where access_row.household_id = p_household_id
      and access_row.user_id = auth.uid()
  ) then
    raise exception using errcode = '42501', message = 'household access required';
  end if;

  if p_expected_revision is null
     or p_expected_revision < 0
     or p_expected_revision > 9223372036854775806 then
    raise exception using errcode = '22023', message = 'expected revision is invalid';
  end if;

  if p_revision is null or p_revision <> p_expected_revision + 1 then
    raise exception using errcode = '22023', message = 'proposed revision is invalid';
  end if;

  if p_state_schema_version is null or p_state_schema_version < 1 then
    raise exception using errcode = '22023', message = 'state schema version is invalid';
  end if;

  if p_payload is null then
    raise exception using errcode = '22023', message = 'payload is required';
  end if;

  if p_payload_sha256 is null or p_payload_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'payload sha256 is invalid';
  end if;

  if p_updated_at is null or p_updated_at < 0 or p_updated_at > 9007199254740991 then
    raise exception using errcode = '22023', message = 'updated timestamp is invalid';
  end if;

  if p_updated_by is null or btrim(p_updated_by) = '' then
    raise exception using errcode = '22023', message = 'updated by is required';
  end if;

  if p_expected_revision = 0 then
    insert into public.familypilot_remote_state (
      household_id, revision, state_schema_version, payload, payload_sha256, updated_at, updated_by
    ) values (
      p_household_id, p_revision, p_state_schema_version, p_payload, p_payload_sha256, p_updated_at, p_updated_by
    )
    on conflict (household_id) do nothing
    returning * into v_row;

    if found then
      return jsonb_build_object('ok', true, 'row', jsonb_build_object(
        'household_id', v_row.household_id,
        'revision', v_row.revision,
        'state_schema_version', v_row.state_schema_version,
        'payload', v_row.payload,
        'payload_sha256', v_row.payload_sha256,
        'updated_at', v_row.updated_at,
        'updated_by', v_row.updated_by
      ));
    end if;
  else
    update public.familypilot_remote_state
    set revision = p_revision,
        state_schema_version = p_state_schema_version,
        payload = p_payload,
        payload_sha256 = p_payload_sha256,
        updated_at = p_updated_at,
        updated_by = p_updated_by
    where household_id = p_household_id
      and revision = p_expected_revision
    returning * into v_row;

    if found then
      return jsonb_build_object('ok', true, 'row', jsonb_build_object(
        'household_id', v_row.household_id,
        'revision', v_row.revision,
        'state_schema_version', v_row.state_schema_version,
        'payload', v_row.payload,
        'payload_sha256', v_row.payload_sha256,
        'updated_at', v_row.updated_at,
        'updated_by', v_row.updated_by
      ));
    end if;
  end if;

  select revision
  into v_current_revision
  from public.familypilot_remote_state
  where household_id = p_household_id;

  return jsonb_build_object(
    'ok', false,
    'error', 'revision_conflict',
    'currentRevision', v_current_revision
  );
end;
$$;

revoke all on function public.familypilot_compare_and_swap_state(text, bigint, bigint, integer, text, text, bigint, text) from public;
revoke all on function public.familypilot_compare_and_swap_state(text, bigint, bigint, integer, text, text, bigint, text) from anon;
grant execute on function public.familypilot_compare_and_swap_state(text, bigint, bigint, integer, text, text, bigint, text) to authenticated;
