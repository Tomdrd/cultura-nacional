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

-- RLS: cada usuário só acessa as próprias notificações
alter table notifications enable row level security;

create policy "notifications_owner" on notifications
  for all using (user_id = auth.uid());

-- Índice para listagem por usuário mais recente primeiro
create index if not exists notifications_user_created
  on notifications (user_id, created_at desc);

-- Realtime habilitado para a tabela
alter publication supabase_realtime add table notifications;
