# Backend Setup (Supabase + Next.js APIs)

This project uses Next.js route handlers as the backend and Supabase as the database.

## 1) Environment variables

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENROUTER_API_KEY=your_openrouter_key
YOUTUBE_API_KEY=your_youtube_key_optional
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
```

Notes:
- `SUPABASE_SERVICE_ROLE_KEY` is required for server routes that write data.
- `YOUTUBE_API_KEY` is optional for Tier 1 flow.
- For AI provider selection:
  - `OPENAI_API_KEY` is required when provider is OpenAI.
  - `GEMINI_API_KEY` is required when provider is Gemini.

## 2) Database schema

Run this SQL in Supabase SQL editor.

```sql
create table if not exists learning_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  roadmap_step_id uuid null,
  topic text not null,
  task_type text not null check (task_type in ('learn','practice','revise')),
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  priority_score numeric not null default 0,
  estimated_minutes int not null default 30,
  due_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists learning_attempts (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references learning_tasks(id) on delete cascade,
  user_id text not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  correct_count int not null default 0,
  total_count int not null default 0,
  hints_used int not null default 0,
  skipped_count int not null default 0,
  confidence int not null default 3,
  time_spent_minutes int not null default 0,
  mastery_before numeric not null default 0,
  mastery_after numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists topic_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  topic text not null,
  mastery_score numeric not null default 0.35,
  last_reviewed_at timestamptz null,
  next_review_date date null,
  updated_at timestamptz not null default now(),
  unique(user_id, topic)
);

create table if not exists lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  task_id uuid not null references learning_tasks(id) on delete cascade,
  topic text not null,
  markdown_content text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  goal_text text not null,
  deadline date,
  created_at timestamptz not null default now()
);

create table if not exists learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  event_type text not null,
  topic text null,
  task_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists learning_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  task_id uuid not null references learning_tasks(id) on delete cascade,
  topic text not null,
  confidence int not null default 3,
  can_explain boolean not null default false,
  blocker_text text null,
  created_at timestamptz not null default now()
);

create table if not exists roadmap_resources (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references roadmap(id) on delete cascade,
  resource_type text not null,
  title text not null,
  url text not null,
  quality_score numeric not null default 0.5,
  created_at timestamptz not null default now()
);

-- For existing databases created before user-scoping:
alter table goals add column if not exists user_id text;
create index if not exists idx_goals_user_created on goals(user_id, created_at desc);
alter table roadmap_sessions add column if not exists goal_id uuid references goals(id) on delete set null;
create index if not exists idx_roadmap_sessions_user_goal_created on roadmap_sessions(user_id, goal_id, created_at desc);
```

## 3) Run backend + frontend

From project root:

```bash
npm install
npm run dev
```

Next.js serves both frontend and backend:
- Frontend: `http://localhost:3000`
- Backend APIs: `http://localhost:3000/api/...`

## 4) Tier 1 flow to test quickly

1. Open `/onboarding` and submit.
2. Open `/today` and click "Generate Today's Tasks".
3. Open one task (`/learn/:taskId`), finish quiz, complete task.
4. Open `/progress` and verify:
   - table row appears
   - mastery score updated
   - next review date set

## 5) Common backend issues

- **`Task not found`**: task row not created yet; run `/today` generation first.
- **Supabase 401/permission errors**: service role key missing or incorrect.
- **AI fallback content only**: check `OPENROUTER_API_KEY`.
