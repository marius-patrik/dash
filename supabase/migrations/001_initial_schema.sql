-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Agent Configurations
create table agent_configs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  model text not null default 'claude-sonnet-4-6',
  system_prompt text default '',
  parameters jsonb default '{}',
  tool_permissions jsonb default '{}',
  is_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_agent_configs_user on agent_configs(user_id);

-- MCP Server Configurations
create table mcp_servers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  type text not null default 'stdio',
  command text not null,
  args text[] default '{}',
  env_vars jsonb default '{}',
  status text not null default 'active' check (status in ('active', 'inactive', 'error')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_mcp_servers_user on mcp_servers(user_id);

-- Skills
create table skills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text default '',
  content text not null,
  category text default 'other',
  version integer default 1,
  is_template boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_skills_user on skills(user_id);

-- Memories
create table memories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  key text not null,
  value text not null,
  category text default 'other',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_memories_user on memories(user_id);

-- Sessions
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  agent_config_id uuid references agent_configs(id) on delete set null,
  agent_session_id text, -- Claude Agent SDK session ID
  name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'error')),
  tags text[] default '{}',
  mcp_server_ids uuid[] default '{}',
  skill_ids uuid[] default '{}',
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_sessions_user on sessions(user_id);
create index idx_sessions_status on sessions(status);

-- Messages
create table messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  tool_calls jsonb,
  tool_results jsonb,
  token_count integer,
  cost_usd numeric(10, 6),
  created_at timestamptz default now()
);

create index idx_messages_session on messages(session_id);
create index idx_messages_created on messages(session_id, created_at);

-- Context Presets
create table context_presets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text default '',
  included_memories uuid[] default '{}',
  included_files text[] default '{}',
  included_skills uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_context_presets_user on context_presets(user_id);

-- Row Level Security
alter table profiles enable row level security;
alter table agent_configs enable row level security;
alter table mcp_servers enable row level security;
alter table skills enable row level security;
alter table memories enable row level security;
alter table sessions enable row level security;
alter table messages enable row level security;
alter table context_presets enable row level security;

-- RLS policies: users can only access their own data
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

create policy "Users can manage own agent configs" on agent_configs for all using (auth.uid() = user_id);
create policy "Users can manage own mcp servers" on mcp_servers for all using (auth.uid() = user_id);
create policy "Users can manage own skills" on skills for all using (auth.uid() = user_id);
create policy "Users can manage own memories" on memories for all using (auth.uid() = user_id);
create policy "Users can manage own sessions" on sessions for all using (auth.uid() = user_id);
create policy "Users can manage own context presets" on context_presets for all using (auth.uid() = user_id);

-- Messages: accessible if user owns the session
create policy "Users can manage messages in own sessions" on messages for all
  using (session_id in (select id from sessions where user_id = auth.uid()));

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger update_agent_configs_updated_at before update on agent_configs for each row execute function update_updated_at();
create trigger update_mcp_servers_updated_at before update on mcp_servers for each row execute function update_updated_at();
create trigger update_skills_updated_at before update on skills for each row execute function update_updated_at();
create trigger update_memories_updated_at before update on memories for each row execute function update_updated_at();
create trigger update_sessions_updated_at before update on sessions for each row execute function update_updated_at();
create trigger update_context_presets_updated_at before update on context_presets for each row execute function update_updated_at();
