
create type public.cedente_activity_type as enum
  ('ligacao','whatsapp','email','reuniao','visita','nota','tarefa');

create table public.cedente_contact_activities (
  id uuid primary key default gen_random_uuid(),
  cedente_id uuid not null,
  user_id uuid not null default auth.uid(),
  type public.cedente_activity_type not null,
  description text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index cedente_contact_activities_cedente_idx
  on public.cedente_contact_activities (cedente_id, occurred_at desc);

alter table public.cedente_contact_activities enable row level security;

create policy "Visibilidade segue cedente"
on public.cedente_contact_activities
for select to authenticated
using (exists (
  select 1 from public.cedentes c
  where c.id = cedente_id and public.can_view_cedente(auth.uid(), c.owner_id)
));

create policy "Quem vê pode registrar contato"
on public.cedente_contact_activities
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.cedentes c
    where c.id = cedente_id and public.can_view_cedente(auth.uid(), c.owner_id)
  )
);

create policy "Autor edita o próprio registro"
on public.cedente_contact_activities
for update to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "Autor remove o próprio registro"
on public.cedente_contact_activities
for delete to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

alter table public.cedentes
  add column if not exists last_contact_date date,
  add column if not exists next_action text;
