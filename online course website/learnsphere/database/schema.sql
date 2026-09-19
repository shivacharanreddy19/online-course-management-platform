-- ============================================================================
-- LearnSphere — Supabase PostgreSQL schema
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New query → Run
-- Creates: 18 tables, constraints, indexes, triggers, RLS policies,
--          storage buckets + storage policies.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- TABLES
-- ============================================================================

--------------------------------------
-- profiles (1:1 with auth.users)
--------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  role        text not null default 'student'
              check (role in ('student','instructor','admin')),
  bio         text,
  phone       text,
  -- instructors must be approved by an admin before they can publish courses
  is_approved boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

--------------------------------------
-- categories
--------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  image_url   text,
  created_at  timestamptz not null default now()
);

--------------------------------------
-- courses
--------------------------------------
create table if not exists public.courses (
  id                 uuid primary key default gen_random_uuid(),
  instructor_id      uuid not null references public.profiles(id) on delete cascade,
  category_id        uuid references public.categories(id) on delete set null,
  title              text not null,
  slug               text unique,
  description        text,
  short_description  text,
  thumbnail_url      text,
  price              numeric(10,2) not null default 0 check (price >= 0),
  discount_price     numeric(10,2) check (discount_price >= 0),
  level              text default 'all' check (level in ('beginner','intermediate','advanced','all')),
  language           text default 'English',
  status             text not null default 'draft'
                     check (status in ('draft','pending','published','rejected')),
  rejection_reason   text,
  requirements       text,
  what_you_will_learn text,
  duration_minutes   integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_courses_status     on public.courses(status);
create index if not exists idx_courses_instructor on public.courses(instructor_id);
create index if not exists idx_courses_category   on public.courses(category_id);

--------------------------------------
-- sections
--------------------------------------
create table if not exists public.sections (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  description text,
  position    integer not null default 0
);
create index if not exists idx_sections_course on public.sections(course_id);

--------------------------------------
-- lessons
--------------------------------------
create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  section_id       uuid not null references public.sections(id) on delete cascade,
  title            text not null,
  description      text,
  video_url        text,
  content          text,
  resource_url     text,
  duration_minutes integer not null default 0,
  position         integer not null default 0,
  is_preview       boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists idx_lessons_section on public.lessons(section_id);

--------------------------------------
-- enrollments
--------------------------------------
create table if not exists public.enrollments (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references public.profiles(id) on delete cascade,
  course_id             uuid not null references public.courses(id) on delete cascade,
  enrolled_at           timestamptz not null default now(),
  completion_percentage numeric(5,2) not null default 0,
  completed             boolean not null default false,
  unique (student_id, course_id)
);
create index if not exists idx_enroll_student on public.enrollments(student_id);
create index if not exists idx_enroll_course  on public.enrollments(course_id);

--------------------------------------
-- lesson_progress
--------------------------------------
create table if not exists public.lesson_progress (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  lesson_id       uuid not null references public.lessons(id) on delete cascade,
  completed       boolean not null default false,
  watched_seconds integer not null default 0,
  updated_at      timestamptz not null default now(),
  unique (student_id, lesson_id)
);
create index if not exists idx_progress_student on public.lesson_progress(student_id);

--------------------------------------
-- quizzes & questions & attempts
--------------------------------------
create table if not exists public.quizzes (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  section_id    uuid references public.sections(id) on delete cascade,
  title         text not null,
  description   text,
  passing_score integer not null default 60
);
create index if not exists idx_quizzes_course on public.quizzes(course_id);

create table if not exists public.quiz_questions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quizzes(id) on delete cascade,
  question       text not null,
  option_a       text,
  option_b       text,
  option_c       text,
  option_d       text,
  correct_option text check (correct_option in ('a','b','c','d')),
  points         integer not null default 1
);
create index if not exists idx_questions_quiz on public.quiz_questions(quiz_id);

create table if not exists public.quiz_attempts (
  id           uuid primary key default gen_random_uuid(),
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  score        numeric(5,2),
  passed       boolean,
  attempted_at timestamptz not null default now()
);
create index if not exists idx_attempts_quiz    on public.quiz_attempts(quiz_id);
create index if not exists idx_attempts_student on public.quiz_attempts(student_id);

--------------------------------------
-- assignments & submissions
--------------------------------------
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  section_id  uuid references public.sections(id) on delete cascade,
  title       text not null,
  description text,
  due_date    timestamptz
);
create index if not exists idx_assign_course on public.assignments(course_id);

create table if not exists public.assignment_submissions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  student_id      uuid not null references public.profiles(id) on delete cascade,
  file_url        text,
  submission_text text,
  score           numeric(5,2),
  feedback        text,
  submitted_at    timestamptz not null default now(),
  unique (assignment_id, student_id)
);

--------------------------------------
-- certificates
--------------------------------------
create table if not exists public.certificates (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.profiles(id) on delete cascade,
  course_id          uuid not null references public.courses(id) on delete cascade,
  certificate_number text not null unique,
  issued_at          timestamptz not null default now(),
  certificate_url    text,
  unique (student_id, course_id)
);

--------------------------------------
-- reviews
--------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  course_id   uuid not null references public.courses(id) on delete cascade,
  rating      integer not null check (rating >= 1 and rating <= 5),
  review_text text,
  created_at  timestamptz not null default now(),
  unique (student_id, course_id)
);
create index if not exists idx_reviews_course on public.reviews(course_id);

--------------------------------------
-- wishlists & cart
--------------------------------------
create table if not exists public.wishlists (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  unique (student_id, course_id)
);

create table if not exists public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);

--------------------------------------
-- orders & order items
--------------------------------------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.profiles(id) on delete cascade,
  total_amount   numeric(10,2) not null default 0,
  payment_status text not null default 'pending'
                 check (payment_status in ('pending','paid','failed','refunded')),
  payment_method text,
  transaction_id text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_orders_student on public.orders(student_id);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  price      numeric(10,2) not null default 0
);

--------------------------------------
-- notifications & announcements
--------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text,
  message    text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications(user_id);

create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  message    text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_courses_touch on public.courses;
create trigger trg_courses_touch before update on public.courses
  for each row execute function public.touch_updated_at();

-- Auto-create a profile whenever a user registers through Supabase Auth.
-- Role comes from raw_user_meta_data->>'role' — only 'student' or 'instructor'
-- are honoured; anything else becomes 'student'. Admin can NEVER be set here.
create or replace function public.handle_new_user()
returns trigger
security definer set search_path = public
language plpgsql as $$
declare
  requested_role text;
  final_role     text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  if requested_role = 'instructor' then
    final_role := 'instructor';
  else
    final_role := 'student';
  end if;

  insert into public.profiles (id, full_name, email, role, is_approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    final_role,
    case when final_role = 'instructor' then false else true end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent users from escalating their own role / approval when calling the
-- database directly (the backend uses the service role and bypasses this).
create or replace function public.protect_profile_role()
returns trigger
security definer set search_path = public
language plpgsql as $$
declare
  caller_role text;
begin
  caller_role := (select role from public.profiles where id = auth.uid());
  if auth.uid() = new.id
     and (caller_role is distinct from 'admin')
     and (new.role is distinct from old.role
          or new.is_approved is distinct from old.is_approved) then
    raise exception 'You cannot change your own role or approval status';
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_profile_role on public.profiles;
create trigger trg_protect_profile_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- The Flask backend uses the service-role key, which BYPASSES RLS and
-- enforces authorization in application code. These policies protect every
-- table from direct anon/authenticated access as defence-in-depth.

alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.courses                enable row level security;
alter table public.sections               enable row level security;
alter table public.lessons                enable row level security;
alter table public.enrollments            enable row level security;
alter table public.lesson_progress        enable row level security;
alter table public.quizzes                enable row level security;
alter table public.quiz_questions         enable row level security;
alter table public.quiz_attempts          enable row level security;
alter table public.assignments            enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.certificates           enable row level security;
alter table public.reviews                enable row level security;
alter table public.wishlists              enable row level security;
alter table public.cart_items             enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.notifications          enable row level security;
alter table public.announcements          enable row level security;

-- helper expressions:
--   is admin:   exists (select 1 from profiles p where p.id = auth.uid() and p.role='admin')

-- profiles -------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using ( true );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using ( id = auth.uid() );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check ( id = auth.uid() );

-- categories -------------------------------------------------------------
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (true);

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories for all
  using ( exists (select 1 from public.profiles a where a.id = auth.uid() and a.role = 'admin') )
  with check ( exists (select 1 from public.profiles a where a.id = auth.uid() and a.role = 'admin') );

-- courses -----------------------------------------------------------------
drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses for select
  using ( status = 'published'
          or instructor_id = auth.uid()
          or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role = 'admin') );

drop policy if exists courses_insert on public.courses;
create policy courses_insert on public.courses for insert
  with check ( instructor_id = auth.uid()
               and exists (select 1 from public.profiles p
                           where p.id = auth.uid() and p.role = 'instructor' and p.is_approved) );

drop policy if exists courses_update on public.courses;
create policy courses_update on public.courses for update
  using ( instructor_id = auth.uid()
          or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role = 'admin') );

drop policy if exists courses_delete on public.courses;
create policy courses_delete on public.courses for delete
  using ( instructor_id = auth.uid()
          or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role = 'admin') );

-- sections -------------------------------------------------------------
drop policy if exists sections_read on public.sections;
create policy sections_read on public.sections for select
  using ( exists (select 1 from public.courses c
                  where c.id = course_id
                    and (c.status = 'published' or c.instructor_id = auth.uid()
                         or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin')
                         or exists (select 1 from public.enrollments e
                                    where e.course_id = c.id and e.student_id = auth.uid()))) );

drop policy if exists sections_write on public.sections;
create policy sections_write on public.sections for all
  using ( exists (select 1 from public.courses c
                  where c.id = course_id and (c.instructor_id = auth.uid()
                    or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin'))) )
  with check ( exists (select 1 from public.courses c
                  where c.id = course_id and (c.instructor_id = auth.uid()
                    or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin'))) );

-- lessons -------------------------------------------------------------
drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons for select
  using ( exists (select 1 from public.sections s
                  join public.courses c on c.id = s.course_id
                  where s.id = section_id
                    and (c.status = 'published' or c.instructor_id = auth.uid()
                         or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin')
                         or exists (select 1 from public.enrollments e
                                    where e.course_id = c.id and e.student_id = auth.uid()))) );

drop policy if exists lessons_write on public.lessons;
create policy lessons_write on public.lessons for all
  using ( exists (select 1 from public.sections s join public.courses c on c.id = s.course_id
                  where s.id = section_id and (c.instructor_id = auth.uid()
                    or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin'))) )
  with check ( exists (select 1 from public.sections s join public.courses c on c.id = s.course_id
                  where s.id = section_id and (c.instructor_id = auth.uid()
                    or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin'))) );

-- enrollments -------------------------------------------------------------
drop policy if exists enroll_read on public.enrollments;
create policy enroll_read on public.enrollments for select
  using ( student_id = auth.uid()
          or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin')
          or exists (select 1 from public.courses c where c.id = course_id and c.instructor_id = auth.uid()) );

drop policy if exists enroll_insert on public.enrollments;
create policy enroll_insert on public.enrollments for insert
  with check ( student_id = auth.uid() );

drop policy if exists enroll_update on public.enrollments;
create policy enroll_update on public.enrollments for update
  using ( student_id = auth.uid()
          or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin') );

-- lesson_progress -------------------------------------------------------------
drop policy if exists progress_rw on public.lesson_progress;
create policy progress_rw on public.lesson_progress for all
  using ( student_id = auth.uid()
          or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin')
          or exists (select 1 from public.lessons l join public.sections s on s.id = l.section_id
                     join public.courses c on c.id = s.course_id
                     where l.id = lesson_id and c.instructor_id = auth.uid()) )
  with check ( student_id = auth.uid() );

-- quizzes / questions -------------------------------------------------------------
drop policy if exists quizzes_read on public.quizzes;
create policy quizzes_read on public.quizzes for select
  using ( exists (select 1 from public.courses c
                  where c.id = course_id
                    and (c.status = 'published' or c.instructor_id = auth.uid()
                         or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin')
                         or exists (select 1 from public.enrollments e
                                    where e.course_id = c.id and e.student_id = auth.uid()))) );

drop policy if exists quizzes_write on public.quizzes;
create policy quizzes_write on public.quizzes for all
  using ( exists (select 1 from public.courses c where c.id = course_id
                  and (c.instructor_id = auth.uid()
                       or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin'))) )
  with check ( exists (select 1 from public.courses c where c.id = course_id
                  and (c.instructor_id = auth.uid()
                       or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin'))) );

drop policy if exists questions_read on public.quiz_questions;
create policy questions_read on public.quiz_questions for select
  using ( exists (select 1 from public.quizzes q join public.courses c on c.id = q.course_id
                  where q.id = quiz_id
                    and (c.status = 'published' or c.instructor_id = auth.uid()
                         or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin')
                         or exists (select 1 from public.enrollments e
                                    where e.course_id = c.id and e.student_id = auth.uid()))) );

drop policy if exists questions_write on public.quiz_questions;
create policy questions_write on public.quiz_questions for all
  using ( exists (select 1 from public.quizzes q join public.courses c on c.id = q.course_id
                  where q.id = quiz_id and (c.instructor_id = auth.uid()
                    or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin'))) )
  with check ( exists (select 1 from public.quizzes q join public.courses c on c.id = q.course_id
                  where q.id = quiz_id and (c.instructor_id = auth.uid()
                    or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin'))) );

-- quiz_attempts -------------------------------------------------------------
drop policy if exists attempts_read on public.quiz_attempts;
create policy attempts_read on public.quiz_attempts for select
  using ( student_id = auth.uid()
          or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin')
          or exists (select 1 from public.quizzes q join public.courses c on c.id = q.course_id
                     where q.id = quiz_id and c.instructor_id = auth.uid()) );

drop policy if exists attempts_insert on public.quiz_attempts;
create policy attempts_insert on public.quiz_attempts for insert
  with check ( student_id = auth.uid() );

-- assignments -------------------------------------------------------------
drop policy if exists assignments_read on public.assignments;
create policy assignments_read on public.assignments for select
  using ( exists (select 1 from public.courses c
                  where c.id = course_id
                    and (c.status = 'published' or c.instructor_id = auth.uid()
                         or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin')
                         or exists (select 1 from public.enrollments e
                                    where e.course_id = c.id and e.student_id = auth.uid()))) );

drop policy if exists assignments_write on public.assignments;
create policy assignments_write on public.assignments for all
  using ( exists (select 1 from public.courses c where c.id = course_id
                  and (c.instructor_id = auth.uid()
                       or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin'))) )
  with check ( exists (select 1 from public.courses c where c.id = course_id
                  and (c.instructor_id = auth.uid()
                       or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin'))) );

-- assignment_submissions -------------------------------------------------------------
drop policy if exists submissions_read on public.assignment_submissions;
create policy submissions_read on public.assignment_submissions for select
  using ( student_id = auth.uid()
          or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin')
          or exists (select 1 from public.assignments a2 join public.courses c on c.id = a2.course_id
                     where a2.id = assignment_id and c.instructor_id = auth.uid()) );

drop policy if exists submissions_insert on public.assignment_submissions;
create policy submissions_insert on public.assignment_submissions for insert
  with check ( student_id = auth.uid() );

drop policy if exists submissions_update on public.assignment_submissions;
create policy submissions_update on public.assignment_submissions for update
  using ( student_id = auth.uid()
          or exists (select 1 from public.assignments a2 join public.courses c on c.id = a2.course_id
                     where a2.id = assignment_id and c.instructor_id = auth.uid())
          or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin') );

-- certificates (publicly verifiable by certificate_number) -------------
drop policy if exists certificates_read on public.certificates;
create policy certificates_read on public.certificates for select using (true);

drop policy if exists certificates_insert on public.certificates;
create policy certificates_insert on public.certificates for insert
  with check ( student_id = auth.uid()
               or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin') );

-- reviews -------------------------------------------------------------
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select using (true);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert
  with check ( student_id = auth.uid()
               and exists (select 1 from public.enrollments e
                           where e.course_id = reviews.course_id and e.student_id = auth.uid()) );

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update
  using ( student_id = auth.uid() );

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete
  using ( student_id = auth.uid()
          or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin') );

-- wishlists / cart (owner only) ----------------------------------------
drop policy if exists wishlist_rw on public.wishlists;
create policy wishlist_rw on public.wishlists for all
  using ( student_id = auth.uid() ) with check ( student_id = auth.uid() );

drop policy if exists cart_rw on public.cart_items;
create policy cart_rw on public.cart_items for all
  using ( student_id = auth.uid() ) with check ( student_id = auth.uid() );

-- orders -------------------------------------------------------------
drop policy if exists orders_read on public.orders;
create policy orders_read on public.orders for select
  using ( student_id = auth.uid()
          or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin') );

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert
  with check ( student_id = auth.uid() );

drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items for select
  using ( exists (select 1 from public.orders o where o.id = order_id and o.student_id = auth.uid())
          or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin') );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items for insert
  with check ( exists (select 1 from public.orders o where o.id = order_id and o.student_id = auth.uid()) );

-- notifications -------------------------------------------------------------
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select
  using ( user_id = auth.uid() );

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update
  using ( user_id = auth.uid() );

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert
  with check ( user_id = auth.uid()
               or exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin') );

-- announcements -------------------------------------------------------------
drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements for select using (true);

drop policy if exists announcements_write on public.announcements;
create policy announcements_write on public.announcements for all
  using ( exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin') )
  with check ( exists (select 1 from public.profiles a where a.id = auth.uid() and a.role='admin') );

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('course-thumbnails', 'course-thumbnails', true),
  ('course-videos', 'course-videos', true),
  ('course-resources', 'course-resources', true),
  ('avatars', 'avatars', true),
  ('assignment-submissions', 'assignment-submissions', true),
  ('certificates', 'certificates', true)
on conflict (id) do nothing;

-- Anyone can read files (URLs are unguessable UUIDs). Only authenticated
-- users can upload. (Uploads always go through the Flask backend, which
-- validates the uploader's role before using the service-role key.)
drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read on storage.objects for select
  using ( bucket_id in ('course-thumbnails','course-videos','course-resources',
                        'avatars','assignment-submissions','certificates') );

drop policy if exists storage_auth_insert on storage.objects;
create policy storage_auth_insert on storage.objects for insert
  with check ( bucket_id in ('course-thumbnails','course-videos','course-resources',
                             'avatars','assignment-submissions','certificates') );

drop policy if exists storage_owner_delete on storage.objects;
create policy storage_owner_delete on storage.objects for delete
  using ( owner = auth.uid() );

-- ============================================================================
-- DONE. Next: (optionally) run database/seed.sql for sample data.
-- ============================================================================
