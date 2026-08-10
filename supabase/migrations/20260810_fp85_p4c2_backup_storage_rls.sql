-- FP85 P4C2 declaration only. Bucket provisioning is an explicit later deployment step.
-- No storage schema or data is changed by this migration.
create policy "familypilot protected backups household read"
on storage.objects for select to authenticated
using (
  bucket_id = 'familypilot-protected-backups'
  and exists (
    select 1 from public.familypilot_household_access h
    where h.household_id::text = (storage.foldername(name))[1]
      and h.user_id = auth.uid()
  )
  and (storage.foldername(name))[3] in ('scheduled', 'manual')
  and ((storage.foldername(name))[4] = 'manifests'
       and array_length(storage.foldername(name), 1) = 4
       and storage.filename(name) ~ '^r[1-9][0-9]*-t[0-9]+-[A-Za-z0-9_-]{22,}\.fpmanifest$'
       or (storage.foldername(name))[4] = 'chunks'
       and array_length(storage.foldername(name), 1) = 5
       and (storage.foldername(name))[5] ~ '^[A-Za-z0-9_-]{22,}$'
       and storage.filename(name) ~ '^[0-9]+\.fpchunk$')
);

create policy "familypilot protected backups caller insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'familypilot-protected-backups'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1 from public.familypilot_household_access h
    where h.household_id::text = (storage.foldername(name))[1]
      and h.user_id = auth.uid()
  )
  and (storage.foldername(name))[3] in ('scheduled', 'manual')
  and ((storage.foldername(name))[4] = 'manifests'
       and array_length(storage.foldername(name), 1) = 4
       and storage.filename(name) ~ '^r[1-9][0-9]*-t[0-9]+-[A-Za-z0-9_-]{22,}\.fpmanifest$'
       or (storage.foldername(name))[4] = 'chunks'
       and array_length(storage.foldername(name), 1) = 5
       and (storage.foldername(name))[5] ~ '^[A-Za-z0-9_-]{22,}$'
       and storage.filename(name) ~ '^[0-9]+\.fpchunk$')
);

create policy "familypilot protected backups caller delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'familypilot-protected-backups'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1 from public.familypilot_household_access h
    where h.household_id::text = (storage.foldername(name))[1]
      and h.user_id = auth.uid()
  )
  and (storage.foldername(name))[3] in ('scheduled', 'manual')
  and ((storage.foldername(name))[4] = 'manifests'
       and array_length(storage.foldername(name), 1) = 4
       and storage.filename(name) ~ '^r[1-9][0-9]*-t[0-9]+-[A-Za-z0-9_-]{22,}\.fpmanifest$'
       or (storage.foldername(name))[4] = 'chunks'
       and array_length(storage.foldername(name), 1) = 5
       and (storage.foldername(name))[5] ~ '^[A-Za-z0-9_-]{22,}$'
       and storage.filename(name) ~ '^[0-9]+\.fpchunk$')
);
