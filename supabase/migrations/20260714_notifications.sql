-- Tabela de notificações in-app
create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references profiles(id) on delete cascade not null,
  type       text not null check (type in ('new_follower', 'duel_result', 'duel_invite')),
  title      text not null,
  body       text not null,
  data       jsonb,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- RLS: políticas corrigidas para permitir criar notificações para terceiros
alter table notifications enable row level security;

create policy "notifications_select" on notifications for select using (user_id = auth.uid());
create policy "notifications_update" on notifications for update using (user_id = auth.uid());
create policy "notifications_delete" on notifications for delete using (user_id = auth.uid());

create policy "notifications_insert" on notifications for insert with check (auth.uid() is not null);

-- Índice para listagem por usuário mais recente primeiro
create index if not exists notifications_user_created
  on notifications (user_id, created_at desc);

-- Realtime habilitado para a tabela
alter publication supabase_realtime add table notifications;
