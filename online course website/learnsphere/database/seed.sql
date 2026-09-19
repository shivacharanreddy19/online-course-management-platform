-- ============================================================================
-- LearnSphere — optional sample data
-- Run AFTER schema.sql, in the Supabase SQL Editor.
--
-- Categories are always inserted.
-- Sample courses are only inserted when at least one instructor (or admin)
-- profile exists — they are attributed to that account.
-- ============================================================================

--------------------------------------
-- 1) Categories
--------------------------------------
insert into public.categories (name, description) values
  ('Programming',          'Core programming languages and software fundamentals'),
  ('Web Development',      'HTML, CSS, JavaScript, frontend & backend frameworks'),
  ('Data Science',         'Analytics, statistics, machine learning and visualisation'),
  ('Artificial Intelligence','Machine learning, deep learning, LLMs and applied AI'),
  ('Database',             'SQL, NoSQL, modelling, optimization and administration'),
  ('Cloud Computing',      'AWS, Azure, GCP, DevOps and cloud-native architectures'),
  ('Cyber Security',       'Security fundamentals, ethical hacking and defence'),
  ('Business',             'Management, marketing, finance and entrepreneurship'),
  ('Design',               'UI/UX, graphic design, motion and design systems')
on conflict (name) do nothing;

--------------------------------------
-- 2) Sample courses (requires an instructor/admin profile to exist first)
--------------------------------------
do $$
declare
  owner uuid;
  cat_web uuid; cat_py uuid; cat_ds uuid;
  c1 uuid; c2 uuid; c3 uuid;
  s uuid; q uuid;
begin
  select id into owner from public.profiles
    where role in ('instructor','admin') order by created_at limit 1;

  if owner is null then
    raise notice 'No instructor/admin profile found — categories seeded only. Register an instructor, get admin approval, then re-run this file.';
    return;
  end if;

  select id into cat_web from public.categories where name='Web Development';
  select id into cat_py  from public.categories where name='Programming';
  select id into cat_ds  from public.categories where name='Data Science';

  -- Course 1 ---------------------------------------------------------
  insert into public.courses (instructor_id, category_id, title, slug, short_description,
    description, price, discount_price, level, language, status, requirements,
    what_you_will_learn, duration_minutes)
  values (owner, cat_web, 'Modern JavaScript: From Zero to Hero', 'modern-javascript-zero-to-hero',
    'Master JavaScript from the fundamentals to advanced patterns used in real production apps.',
    'A complete, hands-on journey through modern JavaScript (ES2024). You will start with the absolute basics — variables, functions and control flow — and progress to closures, prototypes, async programming, modules and design patterns. Every concept is reinforced with practical exercises and mini-projects.',
    49.99, 19.99, 'beginner', 'English', 'published',
    'No programming experience needed. A computer with a browser and a code editor.',
    'Deep understanding of JavaScript fundamentals|DOM manipulation and events|Asynchronous JS: promises, async/await, fetch|ES modules and modern tooling|Build 5 real mini-projects',
    780)
  on conflict (slug) do nothing
  returning id into c1;

  if c1 is not null then
    insert into public.sections (course_id, title, position) values
      (c1, 'Getting Started', 1) returning id into s;
    insert into public.lessons (section_id, title, description, video_url, duration_minutes, position, is_preview) values
      (s, 'Welcome & Course Tour', 'What you will build and how the course works.', 'https://www.youtube.com/embed/PkZNo7MFNFg', 8, 1, true),
      (s, 'Your First JavaScript', 'Variables, values and the console.', 'https://www.youtube.com/embed/W6NZfCO5SIk', 22, 2, true);
    insert into public.sections (course_id, title, position) values
      (c1, 'Core Language Deep-Dive', 2) returning id into s;
    insert into public.lessons (section_id, title, description, video_url, duration_minutes, position) values
      (s, 'Functions & Scope', 'Declarations, expressions, arrow functions and lexical scope.', 'https://www.youtube.com/embed/N8ap4k_1QEQ', 34, 1),
      (s, 'Closures, Finally Explained', 'The most misunderstood concept made simple.', 'https://www.youtube.com/embed/3a0I8ICR1Vg', 28, 2),
      (s, 'Objects & Prototypes', 'How JavaScript really works under the hood.', 'https://www.youtube.com/embed/XmwXu0lVPt4', 41, 3);
    insert into public.quizzes (course_id, section_id, title, description, passing_score)
      values (c1, s, 'Core Language Check', 'Test your understanding of functions, scope and closures.', 60)
      returning id into q;
    insert into public.quiz_questions (quiz_id, question, option_a, option_b, option_c, option_d, correct_option, points) values
      (q, 'Which keyword declares a block-scoped variable?', 'var', 'let', 'function', 'global', 'b', 1),
      (q, 'What does a closure capture?', 'The whole file', 'Its lexical environment', 'Only numbers', 'Nothing', 'b', 1),
      (q, 'Arrow functions…', 'have their own this', 'do not have their own this', 'are always async', 'cannot return values', 'b', 1);
  end if;

  -- Course 2 ---------------------------------------------------------
  insert into public.courses (instructor_id, category_id, title, slug, short_description,
    description, price, discount_price, level, language, status, requirements,
    what_you_will_learn, duration_minutes)
  values (owner, cat_py, 'Python Programming Masterclass', 'python-programming-masterclass',
    'Go from absolute beginner to confident Python developer with 60+ hands-on exercises.',
    'Python is the world''s most popular language for a reason. This masterclass covers syntax, data structures, OOP, file handling, error management, virtual environments and working with popular libraries — all through practical, bite-sized projects.',
    59.99, 24.99, 'beginner', 'English', 'published',
    'Basic computer skills. Python 3 installed (free).',
    'Write clean, idiomatic Python|Work with lists, dicts, sets and comprehensions|Object-oriented programming|Read and write files|Package your code',
    960)
  on conflict (slug) do nothing
  returning id into c2;

  if c2 is not null then
    insert into public.sections (course_id, title, position) values
      (c2, 'Python Basics', 1) returning id into s;
    insert into public.lessons (section_id, title, description, video_url, duration_minutes, position, is_preview) values
      (s, 'Installing Python & Setup', 'Get your environment ready in 10 minutes.', 'https://www.youtube.com/embed/YYXdXT2l-Gg', 12, 1, true),
      (s, 'Variables & Types', 'Numbers, strings, booleans and conversion.', 'https://www.youtube.com/embed/kqtD5dpn9C8', 26, 2, false),
      (s, 'Control Flow', 'if/elif/else, loops and comprehensible conditions.', 'https://www.youtube.com/embed/Zp5MuPOtsSY', 31, 3, false);
  end if;

  -- Course 3 ---------------------------------------------------------
  insert into public.courses (instructor_id, category_id, title, slug, short_description,
    description, price, discount_price, level, language, status, requirements,
    what_you_will_learn, duration_minutes)
  values (owner, cat_ds, 'Data Science Foundations', 'data-science-foundations',
    'Statistics, pandas and visualisation — the essential toolkit for aspiring data scientists.',
    'Learn to think like a data scientist. This course teaches you to clean, explore, analyse and visualise real datasets using Python, pandas, Matplotlib and Seaborn, while building the statistical intuition needed to draw valid conclusions.',
    0, null, 'intermediate', 'English', 'published',
    'Basic Python (variables, functions, loops).',
    'Data cleaning with pandas|Exploratory data analysis|Beautiful visualisations|Descriptive & inferential statistics|A portfolio-ready capstone analysis',
    540)
  on conflict (slug) do nothing
  returning id into c3;

  if c3 is not null then
    insert into public.sections (course_id, title, position) values
      (c3, 'Working with Data', 1) returning id into s;
    insert into public.lessons (section_id, title, description, video_url, duration_minutes, position, is_preview) values
      (s, 'Why Data Science?', 'The data science workflow end to end.', 'https://www.youtube.com/embed/X3paOmcrTjQ', 15, 1, true),
      (s, 'Pandas Crash Course', 'DataFrames, filtering, grouping, joining.', 'https://www.youtube.com/embed/vmEHCJofslg', 45, 2, false);
  end if;

  raise notice 'Seeded 3 sample courses (owner: %)', owner;
end $$;
