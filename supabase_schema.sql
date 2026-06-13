-- ============================================================
-- FitFlow — Supabase SQL Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- 1. PROFILES (extends Supabase auth.users)
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  phone           text,
  role            text not null default 'member', -- 'member' or 'staff'
  assigned_trainer_id uuid references profiles(id),
  membership_plan text default 'Standard',
  membership_status text default 'active', -- 'active' | 'expiring' | 'expired'
  membership_expiry date,
  created_at      timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role', 'member'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- 2. WORKOUT PLANS (created by trainers)
create table if not exists workout_plans (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid references profiles(id) on delete cascade,
  name        text not null,
  goal        text default 'General fitness',
  created_at  timestamptz default now()
);


-- 3. PLAN EXERCISES (exercises inside a plan, per day)
create table if not exists plan_exercises (
  id            uuid primary key default gen_random_uuid(),
  plan_id       uuid references workout_plans(id) on delete cascade,
  day_of_week   text not null, -- 'Monday', 'Tuesday', etc.
  exercise_name text not null,
  sets          int,
  reps          int,
  weight_kg     numeric(6,2),
  notes         text,
  sort_order    int default 0
);


-- 4. PLAN ASSIGNMENTS (which plan is assigned to which member)
create table if not exists plan_assignments (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid references workout_plans(id) on delete cascade,
  member_id      uuid references profiles(id) on delete cascade,
  trainer_id     uuid references profiles(id),
  is_active      boolean default true,
  trainer_notes  text,
  assigned_at    timestamptz default now()
);


-- 5. WORKOUT SESSIONS (one per completed workout)
create table if not exists workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid references profiles(id) on delete cascade,
  plan_id      uuid references workout_plans(id),
  completed_at timestamptz default now()
);


-- 6. SET LOGS (individual sets logged during a workout)
create table if not exists set_logs (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references workout_sessions(id) on delete cascade,
  exercise_id uuid references plan_exercises(id),
  exercise_name text, -- denormalised for history
  set_number  int,
  reps        int,
  weight_kg   numeric(6,2),
  logged_at   timestamptz default now()
);


-- 7. ATTENDANCE LOG
create table if not exists attendance_log (
  id             uuid primary key default gen_random_uuid(),
  member_id      uuid references profiles(id) on delete cascade,
  checked_in_at  timestamptz default now()
);


-- ============================================================
-- ROW LEVEL SECURITY (so users can only see their own data)
-- ============================================================

alter table profiles enable row level security;
alter table workout_plans enable row level security;
alter table plan_exercises enable row level security;
alter table plan_assignments enable row level security;
alter table workout_sessions enable row level security;
alter table set_logs enable row level security;
alter table attendance_log enable row level security;

-- Profiles: users see their own, staff see all members they train
create policy "Users see own profile"
  on profiles for select using (auth.uid() = id);

create policy "Staff see their members"
  on profiles for select
  using (
    (select role from profiles where id = auth.uid()) = 'staff'
    and assigned_trainer_id = auth.uid()
  );

create policy "Staff update members"
  on profiles for update
  using ((select role from profiles where id = auth.uid()) = 'staff');

create policy "Staff insert members"
  on profiles for insert
  with check ((select role from profiles where id = auth.uid()) = 'staff');

-- Workout plans: trainers manage their own
create policy "Trainer manages own plans"
  on workout_plans for all using (trainer_id = auth.uid());

-- Plan exercises: accessible if you can access the plan
create policy "Access plan exercises via plan"
  on plan_exercises for all
  using (exists (select 1 from workout_plans where id = plan_exercises.plan_id and trainer_id = auth.uid())
    or exists (select 1 from plan_assignments where plan_id = plan_exercises.plan_id and member_id = auth.uid() and is_active = true));

-- Plan assignments
create policy "Trainers manage assignments"
  on plan_assignments for all using (trainer_id = auth.uid());

create policy "Members see own assignments"
  on plan_assignments for select using (member_id = auth.uid());

-- Workout sessions
create policy "Members manage own sessions"
  on workout_sessions for all using (member_id = auth.uid());

create policy "Trainers see member sessions"
  on workout_sessions for select
  using ((select role from profiles where id = auth.uid()) = 'staff');

-- Set logs
create policy "Members manage own set logs"
  on set_logs for all
  using (exists (select 1 from workout_sessions where id = set_logs.session_id and member_id = auth.uid()));

-- Attendance
create policy "Staff manage attendance"
  on attendance_log for all
  using ((select role from profiles where id = auth.uid()) = 'staff');

create policy "Members see own attendance"
  on attendance_log for select using (member_id = auth.uid());
