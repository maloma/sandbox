create schema if not exists familypilot_internal;
revoke all on schema familypilot_internal from public, anon;
grant usage on schema familypilot_internal to authenticated;

create or replace function familypilot_internal.compare_and_swap_state(
  p_household_id text,p_expected_revision bigint,p_revision bigint,p_state_schema_version integer,
  p_payload text,p_payload_sha256 text,p_updated_at bigint,p_updated_by text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.familypilot_remote_state%rowtype; current_revision bigint;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='authentication required'; end if;
  if p_household_id is null or btrim(p_household_id)='' then raise exception using errcode='22023',message='household invalid'; end if;
  if not exists(select 1 from public.familypilot_household_access a where a.household_id=p_household_id and a.user_id=auth.uid()) then raise exception using errcode='42501',message='household access required'; end if;
  if p_expected_revision is null or p_expected_revision<0 or p_expected_revision>9223372036854775806 or p_revision is distinct from p_expected_revision+1 then raise exception using errcode='22023',message='revision invalid'; end if;
  if p_state_schema_version is null or p_state_schema_version<1 or p_payload is null or p_payload_sha256 !~ '^[a-f0-9]{64}$' or p_updated_at is null or p_updated_at<0 or p_updated_at>9007199254740991 or p_updated_by is null or btrim(p_updated_by)='' then raise exception using errcode='22023',message='payload validation failed'; end if;
  if p_expected_revision=0 then insert into public.familypilot_remote_state values(p_household_id,p_revision,p_state_schema_version,p_payload,p_payload_sha256,p_updated_at,p_updated_by) on conflict do nothing returning * into r;
  else update public.familypilot_remote_state set revision=p_revision,state_schema_version=p_state_schema_version,payload=p_payload,payload_sha256=p_payload_sha256,updated_at=p_updated_at,updated_by=p_updated_by where household_id=p_household_id and revision=p_expected_revision returning * into r; end if;
  if r.household_id is not null then return jsonb_build_object('ok',true,'row',to_jsonb(r)); end if;
  select revision into current_revision from public.familypilot_remote_state where household_id=p_household_id; return jsonb_build_object('ok',false,'error','revision_conflict','currentRevision',current_revision);
end; $$;
create or replace function public.familypilot_compare_and_swap_state(p_household_id text,p_expected_revision bigint,p_revision bigint,p_state_schema_version integer,p_payload text,p_payload_sha256 text,p_updated_at bigint,p_updated_by text) returns jsonb language sql security invoker set search_path='' as $$ select familypilot_internal.compare_and_swap_state($1,$2,$3,$4,$5,$6,$7,$8); $$;
revoke all on function public.familypilot_compare_and_swap_state(text,bigint,bigint,integer,text,text,bigint,text) from public,anon;
revoke all on function familypilot_internal.compare_and_swap_state(text,bigint,bigint,integer,text,text,bigint,text) from public,anon;
grant execute on function familypilot_internal.compare_and_swap_state(text,bigint,bigint,integer,text,text,bigint,text) to authenticated;
grant execute on function public.familypilot_compare_and_swap_state(text,bigint,bigint,integer,text,text,bigint,text) to authenticated;
create index if not exists familypilot_household_access_user_id_idx on public.familypilot_household_access(user_id);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('familypilot-protected-backups','familypilot-protected-backups',false,6291456,array['application/vnd.familypilot.protected-backup-chunk','application/vnd.familypilot.protected-backup-manifest+json']) on conflict(id) do update set name=excluded.name,public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
