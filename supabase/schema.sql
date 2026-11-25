-- Schema do Gold Link no Supabase (Postgres).
-- Rode este arquivo no SQL Editor do projeto Supabase uma única vez.
--
-- Todas as coleções do app (products, reviews, banner, robot_config, robot_logs)
-- ficam na tabela `documents`: o campo `data` guarda o documento e `collection`
-- identifica a coleção, mantendo a mesma API usada pelas rotas.

create table if not exists public.documents (
  id text primary key,
  collection text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_collection_idx on public.documents (collection);
create index if not exists documents_data_gin on public.documents using gin (data jsonb_path_ops);
create index if not exists documents_updated_at_idx on public.documents (updated_at desc);

-- Mantém updated_at coerente em cada escrita.
create or replace function public.documents_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_touch_updated_at on public.documents;
create trigger documents_touch_updated_at
  before update on public.documents
  for each row execute function public.documents_touch_updated_at();

-- RLS: leitura pública apenas do conteúdo exibido no site.
-- Escritas (painel admin, robô, avaliações) usam a chave de serviço no servidor,
-- que ignora RLS e nunca é enviada ao navegador.
alter table public.documents enable row level security;

drop policy if exists documents_public_read on public.documents;
create policy documents_public_read on public.documents
  for select
  using (collection in ('products', 'reviews', 'banner'));
