You are an expert full-stack web developer.

Build a complete, production-structured Online Course Management Platform called "LearnSphere".

IMPORTANT:
Do NOT create only a frontend prototype.
Build the complete working application with frontend, Python backend, Supabase PostgreSQL database integration, authentication, role-based access, APIs, validation, business logic, and all required database operations.

The project must be organized cleanly so that I can run it locally and later deploy it online.

==================================================
1. TECHNOLOGY STACK
==================================================

FRONTEND:
- HTML5
- CSS3
- Vanilla JavaScript
- No React
- No Vue
- No Angular
- No TypeScript
- Use modular JavaScript files where appropriate.

BACKEND:
- Python 3
- Flask
- Flask-CORS
- python-dotenv
- Supabase Python client
- Proper REST API architecture

DATABASE:
- Supabase PostgreSQL

AUTHENTICATION:
- Supabase Authentication

FILE STORAGE:
- Supabase Storage

Do not create a separate SQLite/local database as the main production database.

The application must use Supabase as the primary database.

==================================================
2. PROJECT STRUCTURE
==================================================

Create a clean structure similar to:

learnsphere/
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── courses.html
│   ├── course-details.html
│   ├── learning.html
│   ├── student-dashboard.html
│   ├── instructor-dashboard.html
│   ├── admin-dashboard.html
│   ├── profile.html
│   ├── certificates.html
│   ├── cart.html
│   ├── checkout.html
│   ├── wishlist.html
│   │
│   ├── css/
│   │   ├── style.css
│   │   ├── auth.css
│   │   ├── dashboard.css
│   │   ├── course.css
│   │   └── responsive.css
│   │
│   ├── js/
│   │   ├── config.js
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── courses.js
│   │   ├── learning.js
│   │   ├── dashboard.js
│   │   ├── instructor.js
│   │   ├── admin.js
│   │   ├── quiz.js
│   │   ├── certificate.js
│   │   ├── payment.js
│   │   └── utils.js
│   │
│   └── assets/
│       ├── images/
│       ├── icons/
│       └── videos/
│
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── routes/
│   │   ├── auth_routes.py
│   │   ├── course_routes.py
│   │   ├── lesson_routes.py
│   │   ├── enrollment_routes.py
│   │   ├── progress_routes.py
│   │   ├── quiz_routes.py
│   │   ├── certificate_routes.py
│   │   ├── review_routes.py
│   │   ├── instructor_routes.py
│   │   ├── admin_routes.py
│   │   └── payment_routes.py
│   │
│   ├── services/
│   │   ├── supabase_service.py
│   │   ├── auth_service.py
│   │   ├── course_service.py
│   │   ├── certificate_service.py
│   │   └── payment_service.py
│   │
│   └── utils/
│       ├── validators.py
│       ├── decorators.py
│       └── helpers.py
│
├── database/
│   └── schema.sql
│
├── README.md
└── .gitignore

You may modify this structure if required, but keep it simple and understandable.

==================================================
3. SUPABASE CONFIGURATION
==================================================

VERY IMPORTANT:

I will add the Supabase credentials manually.

Create:

backend/.env

with:

SUPABASE_URL=YOUR_SUPABASE_URL_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE

Also create:

backend/.env.example

containing placeholders only.

IMPORTANT SECURITY RULE:

NEVER expose SUPABASE_SERVICE_ROLE_KEY in frontend JavaScript.

The service role key must ONLY exist inside backend environment variables.

==================================================
4. FRONTEND SUPABASE CONFIGURATION
==================================================

If frontend Supabase Auth requires the Supabase browser client, create:

frontend/js/config.js

with clearly highlighted placeholders:

const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

Mark these lines clearly with comments:

// ===============================
// ADD YOUR SUPABASE DETAILS HERE
// ===============================

IMPORTANT:
The frontend may contain the Supabase ANON/PUBLISHABLE key.

NEVER put the SERVICE ROLE KEY in frontend files.

==================================================
5. BACKEND CONFIGURATION
==================================================

Create backend/config.py.

Load:

SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY

using python-dotenv.

Create a reusable Supabase client.

All backend database operations must use this client.

Do not duplicate Supabase initialization throughout every route.

==================================================
6. DATABASE SCHEMA
==================================================

Create a complete database/schema.sql.

Use PostgreSQL tables.

Create the following tables.

----------------------------------
profiles
----------------------------------

id UUID PRIMARY KEY REFERENCES auth.users(id)
full_name TEXT
email TEXT
avatar_url TEXT
role TEXT CHECK(role IN ('student','instructor','admin'))
bio TEXT
phone TEXT
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()

----------------------------------
categories
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
name TEXT NOT NULL
description TEXT
image_url TEXT
created_at TIMESTAMPTZ DEFAULT NOW()

----------------------------------
courses
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
instructor_id UUID REFERENCES profiles(id)
category_id UUID REFERENCES categories(id)
title TEXT NOT NULL
slug TEXT UNIQUE
description TEXT
short_description TEXT
thumbnail_url TEXT
price NUMERIC(10,2) DEFAULT 0
discount_price NUMERIC(10,2)
level TEXT
language TEXT
status TEXT CHECK(status IN ('draft','pending','published','rejected'))
requirements TEXT
what_you_will_learn TEXT
duration_minutes INTEGER DEFAULT 0
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()

----------------------------------
sections
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
course_id UUID REFERENCES courses(id) ON DELETE CASCADE
title TEXT NOT NULL
description TEXT
position INTEGER DEFAULT 0

----------------------------------
lessons
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
section_id UUID REFERENCES sections(id) ON DELETE CASCADE
title TEXT NOT NULL
description TEXT
video_url TEXT
content TEXT
resource_url TEXT
duration_minutes INTEGER DEFAULT 0
position INTEGER DEFAULT 0
is_preview BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ DEFAULT NOW()

----------------------------------
enrollments
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
student_id UUID REFERENCES profiles(id) ON DELETE CASCADE
course_id UUID REFERENCES courses(id) ON DELETE CASCADE
enrolled_at TIMESTAMPTZ DEFAULT NOW()
completion_percentage NUMERIC(5,2) DEFAULT 0
completed BOOLEAN DEFAULT FALSE

Add UNIQUE(student_id, course_id).

----------------------------------
lesson_progress
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
student_id UUID REFERENCES profiles(id) ON DELETE CASCADE
lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE
completed BOOLEAN DEFAULT FALSE
watched_seconds INTEGER DEFAULT 0
updated_at TIMESTAMPTZ DEFAULT NOW()

Add UNIQUE(student_id, lesson_id).

----------------------------------
quizzes
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
course_id UUID REFERENCES courses(id) ON DELETE CASCADE
section_id UUID REFERENCES sections(id) ON DELETE CASCADE
title TEXT
description TEXT
passing_score INTEGER DEFAULT 60

----------------------------------
quiz_questions
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE
question TEXT NOT NULL
option_a TEXT
option_b TEXT
option_c TEXT
option_d TEXT
correct_option TEXT
points INTEGER DEFAULT 1

----------------------------------
quiz_attempts
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE
student_id UUID REFERENCES profiles(id) ON DELETE CASCADE
score NUMERIC(5,2)
passed BOOLEAN
attempted_at TIMESTAMPTZ DEFAULT NOW()

----------------------------------
assignments
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
course_id UUID REFERENCES courses(id) ON DELETE CASCADE
section_id UUID REFERENCES sections(id) ON DELETE CASCADE
title TEXT
description TEXT
due_date TIMESTAMPTZ

----------------------------------
assignment_submissions
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE
student_id UUID REFERENCES profiles(id) ON DELETE CASCADE
file_url TEXT
submission_text TEXT
score NUMERIC(5,2)
feedback TEXT
submitted_at TIMESTAMPTZ DEFAULT NOW()

----------------------------------
certificates
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
student_id UUID REFERENCES profiles(id)
course_id UUID REFERENCES courses(id)
certificate_number TEXT UNIQUE
issued_at TIMESTAMPTZ DEFAULT NOW()
certificate_url TEXT

----------------------------------
reviews
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
student_id UUID REFERENCES profiles(id)
course_id UUID REFERENCES courses(id)
rating INTEGER CHECK(rating >= 1 AND rating <= 5)
review_text TEXT
created_at TIMESTAMPTZ DEFAULT NOW()

Add UNIQUE(student_id, course_id).

----------------------------------
wishlists
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
student_id UUID REFERENCES profiles(id) ON DELETE CASCADE
course_id UUID REFERENCES courses(id) ON DELETE CASCADE

Add UNIQUE(student_id, course_id).

----------------------------------
cart_items
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
student_id UUID REFERENCES profiles(id) ON DELETE CASCADE
course_id UUID REFERENCES courses(id) ON DELETE CASCADE
created_at TIMESTAMPTZ DEFAULT NOW()

Add UNIQUE(student_id, course_id).

----------------------------------
orders
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
student_id UUID REFERENCES profiles(id)
total_amount NUMERIC(10,2)
payment_status TEXT
payment_method TEXT
transaction_id TEXT
created_at TIMESTAMPTZ DEFAULT NOW()

----------------------------------
order_items
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
order_id UUID REFERENCES orders(id) ON DELETE CASCADE
course_id UUID REFERENCES courses(id)
price NUMERIC(10,2)

----------------------------------
notifications
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID REFERENCES profiles(id) ON DELETE CASCADE
title TEXT
message TEXT
is_read BOOLEAN DEFAULT FALSE
created_at TIMESTAMPTZ DEFAULT NOW()

----------------------------------
announcements
----------------------------------

id UUID PRIMARY KEY DEFAULT gen_random_uuid()
title TEXT
message TEXT
created_by UUID REFERENCES profiles(id)
created_at TIMESTAMPTZ DEFAULT NOW()

==================================================
7. AUTHENTICATION
==================================================

Implement:

- Register
- Login
- Logout
- Forgot password
- Password reset
- Session handling
- Persistent login
- Profile creation

Roles:

student
instructor
admin

After registration, create a corresponding profile.

Default registration role should be student.

Instructor accounts should require approval.

Admin role must never be selectable from normal registration.

==================================================
8. ROLE-BASED ACCESS
==================================================

STUDENT:

Can:
- Browse courses
- Search courses
- Filter courses
- View course details
- Enroll
- Purchase
- Learn
- Track progress
- Take quizzes
- Submit assignments
- Download resources
- Review courses
- Wishlist courses
- View certificates
- Manage profile
- Receive notifications

INSTRUCTOR:

Can:
- Create courses
- Edit courses
- Delete draft courses
- Add sections
- Add lessons
- Upload resources
- Add quizzes
- Add assignments
- View enrolled students
- View progress
- View reviews
- View course statistics
- Submit courses for admin approval

ADMIN:

Can:
- Manage users
- Manage students
- Manage instructors
- Approve instructors
- Manage courses
- Approve/reject courses
- Manage categories
- Manage reviews
- Manage certificates
- Manage payments
- View platform analytics
- Send announcements
- Manage notifications
- Manage coupons
- Manage platform settings

==================================================
9. STUDENT FRONTEND
==================================================

Create a professional student experience.

Pages:

HOME:
- Hero section
- Search courses
- Popular courses
- Categories
- Featured instructors
- Why LearnSphere
- Testimonials
- CTA
- Footer

COURSES:
- Course cards
- Search
- Category filter
- Level filter
- Price filter
- Rating filter
- Sort
- Pagination

COURSE DETAILS:
- Thumbnail
- Title
- Description
- Instructor
- Rating
- Number of students
- Price
- Discount
- Enroll button
- Wishlist button
- Course curriculum
- Requirements
- Learning outcomes
- Reviews

STUDENT DASHBOARD:
- Total enrolled courses
- In-progress courses
- Completed courses
- Certificates
- Recent activity
- Continue learning

MY COURSES:
- Course cards
- Progress bars
- Continue button
- Completion status

LEARNING PAGE:
- Video player
- Course sections
- Lessons
- Previous/Next
- Mark lesson complete
- Progress percentage
- Notes/resources
- Quiz button
- Assignment button

QUIZZES:
- Questions
- Multiple-choice answers
- Timer if appropriate
- Submit
- Score
- Pass/fail
- Attempt history

ASSIGNMENTS:
- Assignment description
- Upload submission
- Text submission
- Submission status
- Score
- Instructor feedback

CERTIFICATES:
- Completed courses
- Certificate number
- Issue date
- Download/view certificate

WISHLIST:
- Saved courses
- Remove wishlist
- Add to cart/enroll

PROFILE:
- Name
- Email
- Phone
- Bio
- Avatar
- Update profile
- Password reset

NOTIFICATIONS:
- Notification list
- Mark as read
- Mark all as read

==================================================
10. INSTRUCTOR FRONTEND
==================================================

Instructor dashboard:

Statistics:
- Total courses
- Published courses
- Students
- Revenue
- Average rating

Course management:
- Create course
- Edit course
- Delete course
- Save draft
- Submit for approval

Course builder:

Course
 → Sections
   → Lessons
   → Quiz
   → Assignment

Lesson fields:
- Title
- Description
- Video
- Content
- Resource
- Duration
- Preview toggle

Quiz builder:
- Question
- Options
- Correct answer
- Points

Assignment builder:
- Title
- Description
- Due date

Student management:
- View enrolled students
- Progress
- Quiz scores
- Assignment scores

Analytics:
- Enrollments
- Completion
- Ratings
- Revenue

==================================================
11. ADMIN DASHBOARD
==================================================

Create a professional admin dashboard.

Dashboard cards:

- Total users
- Students
- Instructors
- Courses
- Published courses
- Enrollments
- Revenue
- Certificates issued

Admin sections:

Users
Courses
Categories
Instructors
Reviews
Orders
Certificates
Announcements
Notifications
Reports
Settings

Provide tables with:
- Search
- Filters
- Pagination
- Edit
- Delete
- Approve
- Reject
where applicable.

==================================================
12. COURSE LOGIC
==================================================

Implement complete course lifecycle:

Instructor creates course
        ↓
Draft
        ↓
Submit for approval
        ↓
Admin reviews
        ↓
Approved
        ↓
Published
        ↓
Students can enroll

Rejected courses return to instructor with rejection reason.

==================================================
13. ENROLLMENT LOGIC
==================================================

When a student enrolls:

1. Verify authentication.
2. Verify course exists.
3. Verify course is published.
4. Check whether already enrolled.
5. Create enrollment.
6. Initialize progress.
7. Send notification.
8. Redirect to learning page/dashboard.

Prevent duplicate enrollment.

==================================================
14. PROGRESS LOGIC
==================================================

Track:

- Completed lessons
- Watched video time
- Completed quizzes
- Assignment completion
- Overall course completion percentage

Example:

completed lessons / total lessons × 100

When course reaches required completion:

- Mark enrollment completed
- Generate certificate
- Send notification

==================================================
15. CERTIFICATE SYSTEM
==================================================

Generate a certificate after successful course completion.

Certificate must include:

- Student name
- Course name
- Instructor
- Certificate number
- Issue date
- LearnSphere branding

Provide:
- View certificate
- Download certificate

==================================================
16. REVIEWS
==================================================

Students can review only courses they are enrolled in.

Rating:
1–5 stars

Review:
Text

Prevent duplicate reviews.

Display:
- Average rating
- Rating count
- Individual reviews

==================================================
17. WISHLIST
==================================================

Implement:

Add to wishlist
Remove from wishlist
View wishlist
Move wishlist course to cart/enrollment

==================================================
18. CART
==================================================

Implement:

Add course
Remove course
View cart
Calculate subtotal
Calculate discount
Calculate final total
Checkout

Prevent duplicate courses.

==================================================
19. PAYMENT ARCHITECTURE
==================================================

Create payment architecture but do not hard-code a real payment gateway.

For development:

Create mock payment mode.

Example:

PAYMENT_MODE=mock

When mock payment succeeds:

- Create order
- Create order items
- Mark payment successful
- Create enrollment
- Clear cart

Structure payment service so a real provider such as Razorpay can later be integrated.

IMPORTANT:
Never store card numbers, CVV, UPI PIN, or other sensitive payment credentials.

==================================================
20. SEARCH
==================================================

Implement course search.

Search:
- title
- description
- instructor
- category

Filters:
- category
- level
- price
- rating
- language

==================================================
21. NOTIFICATIONS
==================================================

Create notifications for:

- Enrollment
- Course approval
- Course rejection
- Quiz result
- Assignment result
- Course completion
- Certificate issued
- Announcements

==================================================
22. ADMIN ANALYTICS
==================================================

Show:

- User growth
- Course count
- Enrollment count
- Completion rate
- Revenue
- Popular courses
- Top instructors

Use JavaScript charts if required.

Do not introduce unnecessary frontend frameworks.

==================================================
23. BACKEND API
==================================================

Create REST endpoints.

Examples:

AUTH:
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me

COURSES:
GET /api/courses
GET /api/courses/<id>
POST /api/courses
PUT /api/courses/<id>
DELETE /api/courses/<id>

SECTIONS:
POST /api/courses/<id>/sections
PUT /api/sections/<id>
DELETE /api/sections/<id>

LESSONS:
POST /api/sections/<id>/lessons
PUT /api/lessons/<id>
DELETE /api/lessons/<id>

ENROLLMENTS:
POST /api/enrollments
GET /api/enrollments
GET /api/enrollments/<course_id>

PROGRESS:
POST /api/progress
GET /api/progress/<course_id>

QUIZZES:
GET /api/quizzes/<id>
POST /api/quizzes/<id>/submit

ASSIGNMENTS:
POST /api/assignments/<id>/submit

CERTIFICATES:
GET /api/certificates
GET /api/certificates/<id>

REVIEWS:
GET /api/courses/<id>/reviews
POST /api/courses/<id>/reviews

WISHLIST:
GET /api/wishlist
POST /api/wishlist
DELETE /api/wishlist/<course_id>

CART:
GET /api/cart
POST /api/cart
DELETE /api/cart/<course_id>

ORDERS:
POST /api/orders
GET /api/orders

ADMIN:
GET /api/admin/statistics
GET /api/admin/users
GET /api/admin/courses
PUT /api/admin/courses/<id>/approve
PUT /api/admin/courses/<id>/reject

==================================================
24. API SECURITY
==================================================

Implement:

- Authentication verification
- Role checking
- Input validation
- Error handling
- CORS configuration
- Environment variables
- SQL injection prevention through Supabase client/query mechanisms
- No secrets in frontend
- No service role key exposed to browser

Use decorators/helpers such as:

@require_auth
@require_role("admin")

where appropriate.

==================================================
25. RLS SECURITY
==================================================

Create appropriate Supabase Row Level Security policies.

Students should only be able to access their own:

- profile
- enrollments
- progress
- quiz attempts
- assignment submissions
- wishlist
- cart
- orders
- notifications

Students can read published courses.

Instructors can manage only their own courses.

Admins can manage platform data.

IMPORTANT:

Do not disable RLS just to make the application work.

If backend service-role operations are required, keep service role key server-side.

==================================================
26. ERROR HANDLING
==================================================

Frontend must display useful messages:

- Login failed
- Invalid credentials
- Course unavailable
- Already enrolled
- Permission denied
- Network error
- Server error
- Validation error

Backend must return JSON:

{
    "success": false,
    "message": "Readable error message"
}

Successful responses:

{
    "success": true,
    "data": {}
}

==================================================
27. LOADING STATES
==================================================

Every API-driven interface must have:

- Loading indicator
- Empty state
- Error state
- Success feedback

Do not leave blank screens while requests are loading.

==================================================
28. RESPONSIVE DESIGN
==================================================

The website must work properly on:

- Desktop
- Laptop
- Tablet
- Mobile

Use CSS media queries.

Student learning interface should be especially mobile friendly.

==================================================
29. UI DESIGN
==================================================

Create a modern professional LMS interface.

Design characteristics:

- Clean
- Modern
- Premium
- Professional
- Accessible
- Good spacing
- Clear typography
- Responsive cards
- Smooth hover effects
- Modern dashboard
- Sidebar navigation
- Top navigation
- Modal dialogs
- Toast notifications
- Progress bars

Do not overcrowd the interface.

Use a consistent design system.


==================================================
29A. ADVANCED UI / UX — NON-NEGOTIABLE
==================================================

IMPORTANT:
I DO NOT WANT A NORMAL, GENERIC, TEMPLATE-LIKE LMS UI.

The interface must feel like a premium, next-generation digital product rather than a basic educational website.

Do NOT produce:
- Generic Bootstrap-style layouts
- Plain white pages with ordinary cards
- Basic rectangular dashboards
- Repetitive template-like course cards
- Default-looking forms
- Flat, lifeless sections
- Excessive borders and boxes
- Cheap-looking gradients
- Overused glassmorphism everywhere
- UI that looks like a typical college project

The visual design should be distinctive, sophisticated, immersive, and highly polished.

DESIGN DIRECTION:
- Premium SaaS + futuristic education platform aesthetic
- Strong visual hierarchy
- Cinematic hero sections
- Editorial-style layouts where appropriate
- Asymmetric compositions
- Layered depth
- Carefully controlled whitespace
- Sophisticated typography
- Large expressive headings
- Beautiful course discovery experience
- High-end dashboard composition
- Subtle depth, shadows, blur, glow, and texture used intentionally
- Smooth micro-interactions
- Fluid transitions
- Refined hover states
- Scroll-based visual effects where they improve the experience
- Dynamic counters and progress animations
- Elegant modal and drawer interactions
- Skeleton loading animations
- Toast notifications with polished motion
- Animated navigation states
- Smooth page transitions where practical

Use advanced UI techniques with ONLY HTML, CSS, and vanilla JavaScript.

The design must remain performant and accessible.

==================================================
ADVANCED VISUAL SYSTEM
==================================================

Create a reusable visual design system rather than styling every page independently.

Define CSS variables for:
- Backgrounds
- Surface layers
- Text hierarchy
- Accent colors
- Borders
- Shadows
- Radii
- Spacing
- Typography scale
- Animation timing
- Z-index layers

Use a sophisticated color system.

Avoid randomly mixing many colors.

Use one strong primary accent with carefully selected supporting tones.

Typography should feel premium and modern.

Use a high-quality web font through Google Fonts or another suitable font source.

==================================================
ADVANCED HOME PAGE
==================================================

The homepage should immediately communicate that LearnSphere is a premium learning platform.

Hero section should include:
- Strong headline
- Short supporting statement
- Course search
- Primary CTA
- Secondary CTA
- Visual depth
- Animated background elements
- Featured course/instructor visual
- Subtle motion

Consider:
- Floating UI elements
- Layered cards
- Animated gradients
- Subtle particles
- Grid/noise texture
- Cursor interactions
- Scroll reveal animations

Do not overdo animations.

Every animation should have a purpose.

==================================================
COURSE DISCOVERY EXPERIENCE
==================================================

Course browsing should feel like a premium content discovery platform.

Use:
- Large featured course area
- Interactive course cards
- Category navigation
- Smart filters
- Animated filtering
- Search interaction
- Course progress indicators
- Instructor information
- Ratings
- Pricing
- Hover previews where practical

Course cards should not all look identical.

Use hierarchy to make important courses visually prominent.

==================================================
COURSE DETAILS EXPERIENCE
==================================================

The course details page should feel like a premium product page.

Include:
- Large visual hero
- Course title
- Instructor profile
- Rating
- Student count
- Course statistics
- Pricing panel
- Enrollment CTA
- Curriculum
- Learning outcomes
- Requirements
- Reviews

Use sticky/floating purchase or enrollment elements where appropriate.

Curriculum should use elegant expandable sections.

==================================================
LEARNING EXPERIENCE
==================================================

The learning page is one of the most important pages.

Do NOT make it look like a basic video + sidebar layout.

Create an immersive learning workspace.

Include:
- Large video/content area
- Elegant lesson navigation
- Course progress visualization
- Section navigation
- Lesson completion animation
- Notes/resources panel
- Quiz/assignment access
- Previous/next navigation
- Responsive mobile learning experience

Consider:
- Collapsible sidebar
- Floating progress indicator
- Keyboard-friendly controls
- Smooth transitions between lessons
- Focus mode

The learner should feel that they are inside a dedicated learning environment.

==================================================
ADVANCED DASHBOARDS
==================================================

Student, Instructor, and Admin dashboards must each have their own visual identity while sharing the same design system.

Avoid:
- 10 identical statistic cards in a row
- Basic tables everywhere
- Plain sidebar + cards copied from templates

Instead use:
- Visual KPI compositions
- Interactive progress visualizations
- Timeline/activity components
- Data-rich but clean layouts
- Charts
- Status indicators
- Contextual actions
- Smart empty states
- Expandable panels
- Responsive data tables
- Animated statistics

The dashboard should look like a real commercial SaaS product.

==================================================
MICRO-INTERACTIONS
==================================================

Add polished micro-interactions such as:

- Button hover transitions
- Magnetic/subtle pointer effects where appropriate
- Card elevation
- Image zoom on hover
- Animated progress bars
- Number counting animations
- Smooth tab transitions
- Accordion animations
- Modal transitions
- Toast entrance/exit animations
- Navigation indicator animations
- Checkbox/radio state animations
- Course completion celebration

Keep motion subtle and professional.

==================================================
SCROLL EXPERIENCE
==================================================

Use scroll animations selectively.

Possible effects:
- Fade/slide reveal
- Parallax layers
- Sticky sections
- Progressive course timeline
- Section transitions
- Animated statistics

Do not make the entire website constantly moving.

Respect:

prefers-reduced-motion

and provide reduced-motion behavior.

==================================================
ADVANCED COMPONENTS
==================================================

Build reusable components for:

- Navigation
- Sidebar
- Course cards
- Featured course cards
- Instructor cards
- Buttons
- Inputs
- Search
- Filters
- Modals
- Drawers
- Dropdowns
- Tabs
- Accordions
- Toasts
- Tooltips
- Progress indicators
- Skeleton loaders
- Empty states
- Error states
- Confirmation dialogs
- Tables
- Pagination
- Charts
- Badges
- Status pills

Components should have consistent styling and behavior.

==================================================
RESPONSIVE ADVANCED UI
==================================================

Do not simply shrink the desktop design for mobile.

Design mobile layouts intentionally.

On mobile:
- Navigation should transform appropriately
- Sidebar should become a drawer
- Course cards should adapt intelligently
- Dashboards should reorganize information
- Learning page should prioritize content
- Tables should become responsive cards or horizontally scroll where appropriate
- Touch targets must be comfortable
- Animations must remain performant

==================================================
ACCESSIBILITY
==================================================

Even with advanced visuals, maintain accessibility.

Implement:
- Semantic HTML
- Keyboard navigation
- Visible focus states
- Proper labels
- ARIA attributes where needed
- Sufficient contrast
- Reduced-motion support
- Accessible dialogs/modals
- Screen-reader-friendly status messages

==================================================
PERFORMANCE
==================================================

Advanced UI must not mean unnecessarily heavy UI.

Prefer:
- CSS animations over JavaScript when possible
- transform/opacity animations
- Lazy loading images
- Optimized assets
- Minimal dependencies
- Efficient event listeners
- IntersectionObserver for scroll reveals
- Debounced search/filter operations

Avoid unnecessary animation loops.

==================================================
DESIGN QUALITY GATE
==================================================

Before considering the frontend complete, inspect every page visually.

Ask:

"Does this look like a generic HTML/CSS student project?"

If YES:
Redesign it.

The final result should feel closer to a polished modern SaaS/product website than a traditional LMS template.

Maintain visual consistency across:
- Landing page
- Authentication
- Course discovery
- Course details
- Learning workspace
- Student dashboard
- Instructor dashboard
- Admin dashboard
- Profile
- Certificates
- Cart
- Checkout

The UI must be visually impressive WITHOUT sacrificing usability or performance.

==================================================

==================================================
30. FRONTEND ↔ BACKEND CONNECTION
==================================================

Create:

frontend/js/api.js

It must contain a central API request helper.

Example concept:

const API_BASE_URL = "http://localhost:5000/api";

Create reusable functions:

apiGet()
apiPost()
apiPut()
apiDelete()

All frontend API requests should use these functions.

IMPORTANT:

Clearly mark this location:

// ===========================================
// CHANGE THIS WHEN DEPLOYING THE BACKEND
// ===========================================
const API_BASE_URL = "YOUR_BACKEND_API_URL_HERE";
// ===========================================

For local development:

http://localhost:5000/api

For production I will replace it with my deployed Python backend URL.

==================================================
31. SUPABASE CONNECTION LOCATIONS
==================================================

Create clearly marked configuration areas.

FRONTEND:

frontend/js/config.js

Use:

const SUPABASE_URL = "PASTE_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_SUPABASE_ANON_KEY_HERE";

Add a very obvious comment:

// =================================================
// USER MUST ADD SUPABASE FRONTEND CREDENTIALS HERE
// SUPABASE URL:
// SUPABASE ANON/PUBLISHABLE KEY:
// NEVER ADD SERVICE ROLE KEY HERE
// =================================================

BACKEND:

backend/.env

Use:

SUPABASE_URL=PASTE_SUPABASE_URL_HERE
SUPABASE_SERVICE_ROLE_KEY=PASTE_SUPABASE_SERVICE_ROLE_KEY_HERE

Add:

# ==================================================
# USER MUST ADD SUPABASE BACKEND CREDENTIALS HERE
# NEVER COMMIT THIS FILE TO GITHUB
# ==================================================

Do not hard-code these credentials anywhere else.

==================================================
32. SUPABASE STORAGE
==================================================

Prepare storage buckets for:

course-thumbnails
course-videos
course-resources
avatars
assignment-submissions
certificates

Implement upload logic.

Store URLs in PostgreSQL.

Do not store large files directly inside database columns.

==================================================
33. SAMPLE DATA
==================================================

Create optional seed data.

Categories:

Programming
Web Development
Data Science
Artificial Intelligence
Database
Cloud Computing
Cyber Security
Business
Design

Create several sample courses.

Create sample instructor/student accounts only if safe and appropriate.

Do not hard-code real passwords.

==================================================
34. ENVIRONMENT VARIABLES
==================================================

Create:

backend/.env.example

with:

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_URL=
PAYMENT_MODE=mock

Do not commit .env.

Add .env to .gitignore.

==================================================
35. REQUIREMENTS.TXT
==================================================

Create requirements.txt containing all required Python packages.

At minimum consider:

Flask
Flask-CORS
python-dotenv
supabase

Add other packages only when genuinely needed.

==================================================
36. RUNNING THE PROJECT
==================================================

Create README.md with exact instructions.

Example:

1. Install Python.
2. Create virtual environment.
3. Install requirements.
4. Create Supabase project.
5. Run database/schema.sql in Supabase SQL Editor.
6. Create storage buckets.
7. Add Supabase credentials to backend/.env.
8. Add frontend Supabase credentials to frontend/js/config.js.
9. Start backend.
10. Open frontend.

Backend command:

python app.py

The server should run on:

http://localhost:5000

==================================================
37. DO NOT CREATE THESE PROBLEMS
==================================================

DO NOT:

- use SQLite as production database
- expose service role key
- put backend secrets in HTML
- put service role key in JS
- create fake database operations
- use localStorage as the actual database
- hard-code course data as the real data source
- create buttons that don't work
- create fake dashboards with static numbers
- create fake authentication
- bypass authorization
- disable RLS unnecessarily
- create duplicate API logic everywhere
- create unnecessary frameworks

==================================================
38. IMPORTANT DEVELOPMENT RULE
==================================================

Build the application feature-by-feature but ensure all parts are connected.

Every button should have real functionality.

Every form should have validation.

Every database operation should connect to Supabase.

Every dashboard statistic should come from actual database data.

Every role should have appropriate permissions.

==================================================
39. FINAL VERIFICATION
==================================================

Before finishing, test:

AUTH:
- Register
- Login
- Logout
- Session persistence

STUDENT:
- Browse courses
- Search
- Filter
- View course
- Enroll
- Learn
- Track progress
- Complete lesson
- Take quiz
- Submit assignment
- Review
- Wishlist
- Cart
- Mock checkout
- Certificate

INSTRUCTOR:
- Create course
- Edit course
- Add section
- Add lesson
- Add quiz
- Add assignment
- Submit course
- View students
- View statistics

ADMIN:
- Login
- View statistics
- Manage users
- Approve instructor
- Approve course
- Reject course
- Manage categories
- View orders
- Manage reviews
- Send announcement

SECURITY:
- Student cannot access admin pages
- Instructor cannot modify another instructor's course
- Student cannot modify another student's progress
- Service role key is never exposed in frontend
- RLS policies work correctly

==================================================
40. FINAL OUTPUT
==================================================

After creating the project, provide:

1. Complete project structure
2. All created files
3. Database schema
4. Supabase setup instructions
5. Exact locations where I must add:
   - Supabase URL
   - Supabase ANON/PUBLISHABLE key
   - Supabase SERVICE ROLE key
   - Backend deployment URL
6. Local run commands
7. Deployment instructions
8. List of implemented features
9. Any remaining configuration required from me

IMPORTANT:

Do not ask me for Supabase credentials during code generation.

Use placeholders.

I will add the credentials manually after the project is generated.

Make all credential locations extremely obvious with comments such as:

==================== ADD YOUR KEY HERE ====================

Never expose or request the service role key in frontend code.