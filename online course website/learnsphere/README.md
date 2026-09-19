# LearnSphere — Online Course Management Platform

LearnSphere is a complete, production-structured Learning Management System (LMS) built with:

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (no frameworks)
- **Backend:** Python 3 + Flask + Flask-CORS
- **Database:** Supabase PostgreSQL (with Row Level Security)
- **Auth:** Supabase Authentication (proxied through the Flask backend)
- **Storage:** Supabase Storage
- **Payments:** Mock payment mode (structured so Razorpay can be plugged in later)

---

## 1. Project Structure

```
learnsphere/
├── frontend/
│   ├── index.html              # Landing page
│   ├── login.html              # Login + forgot/reset password
│   ├── register.html           # Registration (student / instructor)
│   ├── courses.html            # Course discovery (search, filters, sort)
│   ├── course-details.html     # Course product page
│   ├── learning.html           # Immersive learning workspace
│   ├── student-dashboard.html  # Student overview + my courses + progress
│   ├── instructor-dashboard.html
│   ├── admin-dashboard.html
│   ├── profile.html
│   ├── certificates.html
│   ├── cart.html
│   ├── checkout.html
│   ├── wishlist.html
│   ├── css/   (style.css, auth.css, dashboard.css, course.css, responsive.css)
│   ├── js/    (config.js, api.js, auth.js, courses.js, learning.js, dashboard.js,
│   │          instructor.js, admin.js, quiz.js, certificate.js, payment.js, utils.js, ui.js)
│   └── assets/ (images / icons / videos)
├── backend/
│   ├── app.py                  # Flask application factory + blueprint registration
│   ├── config.py               # Env loading + single reusable Supabase client
│   ├── requirements.txt
│   ├── .env                    # YOUR REAL SECRETS (never commit)
│   ├── .env.example
│   ├── routes/                 # 14 REST blueprints
│   ├── services/               # supabase / auth / course / certificate / payment services
│   └── utils/                  # validators, decorators (@require_auth / @require_role), helpers
├── database/
│   ├── schema.sql              # Tables, constraints, triggers, RLS policies, storage buckets
│   └── seed.sql                # Optional sample categories + courses
├── README.md
└── .gitignore
```

---

## 2. Prerequisites

1. **Python 3.10+** installed.
2. A free **Supabase** account → create a project at https://supabase.com
3. A static file server for the frontend (VS Code *Live Server*, or `python -m http.server`).

---

## 3. Supabase Setup (5 minutes)

### 3.1 Create the project
1. Go to https://supabase.com → **New project** → name it `learnsphere`.
2. Wait for provisioning, then open **Project Settings → API** and copy:
   - **Project URL** (looks like `https://xyzcompany.supabase.co`)
   - **anon public** key
   - **service_role** key (⚠ keep this secret — server only)

### 3.2 Create the database
1. In Supabase, open **SQL Editor** → **New query**.
2. Paste the entire contents of `database/schema.sql` → **Run**.
   - This creates all 18 tables, constraints, indexes, triggers (incl. auto-profile creation),
     **all Row-Level-Security policies**, and the Supabase **storage buckets**.
3. (Optional) Run `database/seed.sql` afterwards to insert the 9 categories and,
   if an instructor/admin account already exists, 3 fully-built sample courses.

> Storage buckets created by the schema: `course-thumbnails`, `course-videos`,
> `course-resources`, `avatars`, `assignment-submissions`, `certificates`.

---

## 4. Backend Setup

```bash
cd learnsphere/backend
python -m venv venv
# Windows:  venv\Scripts\activate
# macOS/Linux:  source venv/bin/activate
pip install -r requirements.txt
```

Now edit **`backend/.env`** (already created for you):

```env
# ==================== ADD YOUR KEY HERE ====================
SUPABASE_URL=PASTE_SUPABASE_URL_HERE
SUPABASE_SERVICE_ROLE_KEY=PASTE_SUPABASE_SERVICE_ROLE_KEY_HERE
# ===========================================================
FRONTEND_URL=http://localhost:5500
PAYMENT_MODE=mock
```

Start the server:

```bash
python app.py
# → Running on http://localhost:5000
```

Health check: open http://localhost:5000/api/health → `{"success":true,...}`

---

## 5. Frontend Setup

### Option A — VS Code Live Server (recommended)
1. Open the `frontend/` folder in VS Code.
2. Right-click `index.html` → **Open with Live Server** (serves on `http://localhost:5500`).

### Option B — Python static server
```bash
cd learnsphere/frontend
python -m http.server 5500
# → http://localhost:5500
```

### Where the frontend talks to the backend
`frontend/js/api.js`:

```js
// ===========================================
// CHANGE THIS WHEN DEPLOYING THE BACKEND
// ===========================================
const API_BASE_URL = "http://localhost:5000/api";
```

### Frontend Supabase keys (`frontend/js/config.js`)
Authentication is **proxied through the Flask backend**, so the frontend does not *need* the
Supabase anon key to work. `frontend/js/config.js` still contains clearly marked placeholders
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`) for any future direct-browser Supabase features.

> ⚠ **NEVER** put the `service_role` key in any frontend file. It lives only in `backend/.env`.

---

## 6. First Accounts

| Role | How to create |
|---|---|
| **Student** | Register normally — works immediately. |
| **Instructor** | Register with role *Instructor* → account must be **approved by an admin** before courses can be created. |
| **Admin** | Never creatable from the UI. Register a student, then in Supabase SQL Editor run: <br>`UPDATE profiles SET role='admin', is_approved=true WHERE email='you@example.com';` |

---

## 7. Course Lifecycle

```
Instructor creates course → draft
        ↓  "Submit for approval" (needs ≥1 section + ≥1 lesson)
pending → Admin reviews
        ↓ approved ↙ rejected (with reason, back to instructor)
published → students can enroll / purchase
```

---

## 8. Payments

`PAYMENT_MODE=mock` in `backend/.env`. Checkout creates a real order, order items,
enrollments and notifications, and clears the cart — without charging anything.
To integrate Razorpay later, implement `process_payment()` inside
`backend/services/payment_service.py` (the interface is already isolated).

**No card numbers, CVV or UPI PINs are ever sent to or stored on the server.**

---

## 9. Deployment

### Backend (Render / Railway / Fly.io)
1. Push the repo to GitHub (`.env` is git-ignored).
2. New Web Service → root dir `backend`, build `pip install -r requirements.txt`,
   start `gunicorn app:app --bind 0.0.0.0:$PORT` (gunicorn is in requirements.txt).
3. Add environment variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `FRONTEND_URL` (your deployed frontend origin), `PAYMENT_MODE=mock`.

### Frontend (Netlify / Vercel / GitHub Pages)
1. Deploy the `frontend/` folder as a static site.
2. In `frontend/js/api.js` replace `API_BASE_URL` with your deployed backend URL + `/api`.
3. Set `FRONTEND_URL` on the backend to the deployed frontend origin (used for
   password-reset redirect links and CORS).

### Supabase Auth settings
Dashboard → **Authentication → URL Configuration**:
- **Site URL:** your deployed frontend URL
- **Redirect URLs:** add both `http://localhost:5500/**` and `https://your-frontend/**`

---

## 10. API Overview

All responses follow:

```jsonc
// success
{ "success": true, "data": { /* ... */ } }
// error
{ "success": false, "message": "Readable error message" }
```

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/refresh` · `GET /api/auth/me` · `PUT /api/auth/profile` · `POST /api/auth/forgot-password` · `POST /api/auth/exchange` · `PUT /api/auth/reset-password` |
| Courses | `GET /api/courses` (search/filter/sort/paginate) · `GET /api/courses/<id>` · `POST/PUT/DELETE /api/courses[/<id>]` · `POST /api/courses/<id>/submit` · `POST /api/courses/<id>/sections` · `PUT/DELETE /api/sections/<id>` · `GET /api/categories` · `GET /api/instructors/featured` |
| Lessons | `POST /api/sections/<id>/lessons` · `PUT/DELETE /api/lessons/<id>` |
| Enrollment | `POST /api/enrollments` · `GET /api/enrollments` · `GET /api/enrollments/<course_id>` |
| Progress | `POST /api/progress` · `GET /api/progress/<course_id>` |
| Quizzes | `POST /api/courses/<id>/quizzes` · `GET /api/courses/<id>/quizzes` · `PUT/DELETE /api/quizzes/<id>` · `GET /api/quizzes/<id>` · `POST /api/quizzes/<id>/submit` · `GET /api/quizzes/<id>/attempts` |
| Assignments | `POST /api/courses/<id>/assignments` · `GET /api/courses/<id>/assignments` · `PUT/DELETE /api/assignments/<id>` · `POST /api/assignments/<id>/submit` · `PUT /api/assignment-submissions/<id>/grade` |
| Certificates | `GET /api/certificates` · `GET /api/certificates/<id>` · `GET /api/certificates/verify/<number>` |
| Reviews | `GET /api/courses/<id>/reviews` · `POST /api/courses/<id>/reviews` · `DELETE /api/reviews/<id>` |
| Wishlist / Cart | `GET/POST /api/wishlist` · `DELETE /api/wishlist/<course_id>` · `GET/POST /api/cart` · `DELETE /api/cart/<course_id>` |
| Orders / Payment | `POST /api/orders` (checkout) · `GET /api/orders` |
| Notifications | `GET /api/notifications` · `PUT /api/notifications/<id>/read` · `PUT /api/notifications/read-all` · `GET /api/announcements` |
| Instructor | `GET /api/instructor/statistics` · `GET /api/instructor/students` · `GET /api/instructor/courses/<id>/students` · `GET /api/instructor/reviews` |
| Admin | `GET /api/admin/statistics` · `GET/PUT/DELETE /api/admin/users[/<id>]` · `GET /api/admin/courses` · `PUT /api/admin/courses/<id>/approve` · `PUT /api/admin/courses/<id>/reject` · `GET /api/admin/instructors` · `PUT /api/admin/instructors/<id>/approve` · `GET/POST/PUT/DELETE /api/admin/categories[/<id>]` · `GET/DELETE /api/admin/reviews[/<id>]` · `GET /api/admin/orders` · `GET /api/admin/certificates` · `GET/POST/DELETE /api/admin/announcements[/<id>]` |
| Uploads | `POST /api/uploads?bucket=<bucket>` (multipart) |

---

## 11. Implemented Features

**Student** — browse/search/filter/sort courses, course details with curriculum & reviews,
enroll (free) or purchase (mock checkout) paid courses, immersive learning workspace
(video/content, prev/next, mark complete, progress ring, resources, quizzes & assignments),
wishlist, cart, checkout, certificates (view/print), profile with avatar upload,
notifications, course reviews.

**Instructor** — statistics (courses, students, revenue, rating), course CRUD with draft →
submit-for-approval flow, full course builder (sections → lessons / quizzes / assignments),
enrolled-student progress view, reviews view, thumbnail upload.

**Admin** — platform KPIs + charts (user growth, revenue, top courses / instructors),
user management + instructor approval, course approval / rejection with reason,
category CRUD, review moderation, orders, certificates, announcements (fan-out notifications).

**Security** — Supabase Auth JWT verified on every protected endpoint, role guards
(`@require_role`), ownership checks, RLS policies on every table, input validation,
consistent JSON errors, CORS, service-role key never leaves the server.

---

## 12. Remaining Configuration (checklist for you)

- [ ] `backend/.env` → `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Run `database/schema.sql` in Supabase SQL Editor
- [ ] (Optional) run `database/seed.sql`
- [ ] (Optional) fill `frontend/js/config.js` placeholders
- [ ] `frontend/js/api.js` → change `API_BASE_URL` only when deploying
- [ ] Create your admin via SQL (see §6)
