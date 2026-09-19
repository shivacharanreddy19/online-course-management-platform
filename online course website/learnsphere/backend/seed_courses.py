import config

def seed_courses():
    sb = config.get_supabase()

    # Get owner profile
    owner_res = sb.table("profiles").select("id").eq("role", "admin").limit(1).execute()
    if not owner_res.data:
        owner_res = sb.table("profiles").select("id").limit(1).execute()
    if not owner_res.data:
        print("Error: No user profile found!")
        return

    owner_id = owner_res.data[0]["id"]
    print(f"Seeding courses under instructor/admin ID: {owner_id}")

    # Map categories
    cats = sb.table("categories").select("id, name").execute().data
    cat_map = {c["name"]: c["id"] for c in cats}

    courses_data = [
        {
            "category": "Web Development",
            "title": "Modern JavaScript: From Zero to Hero",
            "slug": "modern-javascript-zero-to-hero",
            "short_description": "Master JavaScript from absolute fundamentals to advanced async patterns and modern ES2024 features.",
            "description": "A complete, hands-on journey through modern JavaScript. Learn variables, functions, closures, asynchronous promises, async/await, DOM manipulation, and modern web development patterns with real projects.",
            "price": 49.99,
            "discount_price": 19.99,
            "level": "beginner",
            "language": "English",
            "status": "published",
            "requirements": "No prior programming experience needed. Just a web browser and code editor.",
            "what_you_will_learn": "JavaScript core syntax|DOM manipulation|Promises & Async/Await|ES Modules|Building interactive web apps",
            "duration_minutes": 780,
            "sections": [
                {
                    "title": "Getting Started",
                    "position": 1,
                    "lessons": [
                        {"title": "Welcome & Course Overview", "description": "Course roadmap and environment setup.", "video_url": "https://www.youtube.com/embed/PkZNo7MFNFg", "duration_minutes": 8, "position": 1, "is_preview": True},
                        {"title": "Your First JavaScript Code", "description": "Variables, data types and console debugging.", "video_url": "https://www.youtube.com/embed/W6NZfCO5SIk", "duration_minutes": 22, "position": 2, "is_preview": True}
                    ]
                },
                {
                    "title": "Core Language Deep-Dive",
                    "position": 2,
                    "lessons": [
                        {"title": "Functions & Lexical Scope", "description": "Declarations, expressions, and arrow functions.", "video_url": "https://www.youtube.com/embed/N8ap4k_1QEQ", "duration_minutes": 34, "position": 1, "is_preview": False},
                        {"title": "Closures & Async JS", "description": "Promises, async/await and event loop.", "video_url": "https://www.youtube.com/embed/3a0I8ICR1Vg", "duration_minutes": 28, "position": 2, "is_preview": False},
                        {"title": "DOM Manipulation & Events", "description": "Interacting dynamically with web page elements.", "video_url": "https://www.youtube.com/embed/XmwXu0lVPt4", "duration_minutes": 41, "position": 3, "is_preview": False}
                    ]
                }
            ],
            "quiz": {
                "title": "JavaScript Fundamentals Quiz",
                "description": "Test your knowledge of core JavaScript concepts.",
                "passing_score": 60,
                "questions": [
                    {"question": "Which keyword declares a block-scoped variable in JS?", "option_a": "var", "option_b": "let", "option_c": "function", "option_d": "global", "correct_option": "b", "points": 1},
                    {"question": "What does async/await build upon in JavaScript?", "option_a": "Callbacks", "option_b": "Promises", "option_c": "Generators", "option_d": "Threads", "correct_option": "b", "points": 1},
                    {"question": "Which method selects an HTML element by ID?", "option_a": "document.getElement()", "option_b": "document.getElementById()", "option_c": "document.selectId()", "option_d": "document.query()", "correct_option": "b", "points": 1}
                ]
            }
        },
        {
            "category": "Programming",
            "title": "Python Programming Masterclass 2026",
            "slug": "python-programming-masterclass",
            "short_description": "Go from beginner to confident Python developer with hands-on projects and exercises.",
            "description": "Python is the world's most versatile language. Learn Python syntax, data structures, object-oriented programming (OOP), file operations, modules, and error handling through practical code examples.",
            "price": 59.99,
            "discount_price": 24.99,
            "level": "beginner",
            "language": "English",
            "status": "published",
            "requirements": "Basic computer operation. Python 3 installed.",
            "what_you_will_learn": "Write clean, idiomatic Python code|Master lists, dicts, tuples & sets|Object-Oriented Programming (OOP)|File I/O and Exception Handling|Build real Python scripts",
            "duration_minutes": 960,
            "sections": [
                {
                    "title": "Python Setup & Fundamentals",
                    "position": 1,
                    "lessons": [
                        {"title": "Installing Python & IDE Setup", "description": "Getting your Python development environment ready.", "video_url": "https://www.youtube.com/embed/YYXdXT2l-Gg", "duration_minutes": 12, "position": 1, "is_preview": True},
                        {"title": "Variables, Numbers & Strings", "description": "Basic data types and operations.", "video_url": "https://www.youtube.com/embed/kqtD5dpn9C8", "duration_minutes": 26, "position": 2, "is_preview": False},
                        {"title": "Conditionals & Loops", "description": "if/elif/else statements and for/while loops.", "video_url": "https://www.youtube.com/embed/Zp5MuPOtsSY", "duration_minutes": 31, "position": 3, "is_preview": False}
                    ]
                },
                {
                    "title": "Advanced Python & OOP",
                    "position": 2,
                    "lessons": [
                        {"title": "Object-Oriented Programming", "description": "Classes, objects, inheritance, and encapsulation.", "video_url": "https://www.youtube.com/embed/Jeznw_JNkhU", "duration_minutes": 45, "position": 1, "is_preview": False},
                        {"title": "File I/O & Exception Handling", "description": "Reading/writing files and try-except blocks.", "video_url": "https://www.youtube.com/embed/VchuKL44s6E", "duration_minutes": 35, "position": 2, "is_preview": False}
                    ]
                }
            ],
            "quiz": {
                "title": "Python Core Knowledge Check",
                "description": "Verify your understanding of Python syntax and OOP.",
                "passing_score": 70,
                "questions": [
                    {"question": "How do you define a function in Python?", "option_a": "func my_func():", "option_b": "def my_func():", "option_c": "function my_func():", "option_d": "create my_func():", "correct_option": "b", "points": 1},
                    {"question": "Which data structure is mutable and ordered?", "option_a": "Tuple", "option_b": "List", "option_c": "Set", "option_d": "String", "correct_option": "b", "points": 1}
                ]
            }
        },
        {
            "category": "Data Science",
            "title": "Data Science & Analytics Foundations",
            "slug": "data-science-analytics-foundations",
            "short_description": "Data analysis, pandas, and data visualization essentials for aspiring data analysts.",
            "description": "Master data manipulation and analytical thinking. Learn how to clean raw data, perform exploratory data analysis (EDA), compute statistics, and visualize trends using Pandas, NumPy, Matplotlib, and Seaborn.",
            "price": 0,
            "discount_price": None,
            "level": "intermediate",
            "language": "English",
            "status": "published",
            "requirements": "Basic Python knowledge (variables, loops).",
            "what_you_will_learn": "Pandas DataFrames manipulation|Data cleaning & transformation|Exploratory Data Analysis|Statistical charts with Matplotlib & Seaborn|Portfolio project completion",
            "duration_minutes": 540,
            "sections": [
                {
                    "title": "Data Wrangling & Analysis",
                    "position": 1,
                    "lessons": [
                        {"title": "Introduction to Data Science Workflow", "description": "Understanding the end-to-end data lifecycle.", "video_url": "https://www.youtube.com/embed/X3paOmcrTjQ", "duration_minutes": 15, "position": 1, "is_preview": True},
                        {"title": "Pandas DataFrames Crash Course", "description": "Filtering, grouping, merging, and cleaning data.", "video_url": "https://www.youtube.com/embed/vmEHCJofslg", "duration_minutes": 45, "position": 2, "is_preview": False},
                        {"title": "Data Visualization Essentials", "description": "Creating bar charts, scatter plots, and heatmaps.", "video_url": "https://www.youtube.com/embed/DAQNHzOcO5A", "duration_minutes": 40, "position": 3, "is_preview": False}
                    ]
                }
            ],
            "quiz": {
                "title": "Data Science Fundamentals Quiz",
                "description": "Test your knowledge of pandas and data analysis.",
                "passing_score": 60,
                "questions": [
                    {"question": "Which Python library is primary for tabular data manipulation?", "option_a": "Numpy", "option_b": "Pandas", "option_c": "Scipy", "option_d": "Flask", "correct_option": "b", "points": 1},
                    {"question": "What function in pandas reads a CSV file?", "option_a": "pd.get_csv()", "option_b": "pd.read_csv()", "option_c": "pd.open_csv()", "option_d": "pd.load_csv()", "correct_option": "b", "points": 1}
                ]
            }
        },
        {
            "category": "Artificial Intelligence",
            "title": "Applied AI & Machine Learning Essentials",
            "slug": "applied-ai-machine-learning-essentials",
            "short_description": "Build, evaluate, and deploy machine learning models with Python and Scikit-Learn.",
            "description": "Dive into the core algorithms behind modern Artificial Intelligence. Understand supervised vs unsupervised learning, regression, classification, decision trees, and neural networks through real datasets.",
            "price": 79.99,
            "discount_price": 39.99,
            "level": "intermediate",
            "language": "English",
            "status": "published",
            "requirements": "Python programming and basic algebra.",
            "what_you_will_learn": "Supervised & Unsupervised Learning|Scikit-Learn model building|Model evaluation metrics (Accuracy, F1, RMSE)|Introduction to Deep Learning|Deploying ML models",
            "duration_minutes": 840,
            "sections": [
                {
                    "title": "Machine Learning Algorithms",
                    "position": 1,
                    "lessons": [
                        {"title": "Introduction to AI & Machine Learning", "description": "Overview of AI capabilities and ML workflow.", "video_url": "https://www.youtube.com/embed/Gv9_4yMHFhI", "duration_minutes": 20, "position": 1, "is_preview": True},
                        {"title": "Regression & Classification with Scikit-Learn", "description": "Training your first ML models.", "video_url": "https://www.youtube.com/embed/cKxRvEZd3Mw", "duration_minutes": 50, "position": 2, "is_preview": False},
                        {"title": "Introduction to Neural Networks", "description": "Understanding perception, layers, and backpropagation.", "video_url": "https://www.youtube.com/embed/aircAruvnKk", "duration_minutes": 60, "position": 3, "is_preview": False}
                    ]
                }
            ],
            "quiz": {
                "title": "Machine Learning Principles",
                "description": "Assess your understanding of supervised learning and model evaluation.",
                "passing_score": 70,
                "questions": [
                    {"question": "Linear regression is an example of what type of machine learning?", "option_a": "Supervised learning", "option_b": "Unsupervised learning", "option_c": "Reinforcement learning", "option_d": "Self-directed learning", "correct_option": "a", "points": 1}
                ]
            }
        },
        {
            "category": "Cloud Computing",
            "title": "Cloud Computing & AWS DevOps Fundamentals",
            "slug": "cloud-computing-aws-devops-fundamentals",
            "short_description": "Learn cloud infrastructure, AWS EC2, S3, Docker containers, and CI/CD deployment pipelines.",
            "description": "Master cloud architecture and modern DevOps practices. Understand cloud infrastructure, Amazon Web Services (AWS), Docker containerization, and continuous delivery pipelines.",
            "price": 69.99,
            "discount_price": 29.99,
            "level": "intermediate",
            "language": "English",
            "status": "published",
            "requirements": "Basic web knowledge and command-line familiarity.",
            "what_you_will_learn": "AWS core services (EC2, S3, IAM)|Docker container creation|Container orchestration concepts|CI/CD automated deployment|Cloud security best practices",
            "duration_minutes": 620,
            "sections": [
                {
                    "title": "AWS & Container Fundamentals",
                    "position": 1,
                    "lessons": [
                        {"title": "Cloud Architecture Overview & AWS Setup", "description": "Understanding cloud benefits and AWS console.", "video_url": "https://www.youtube.com/embed/ulprqHHWlng", "duration_minutes": 25, "position": 1, "is_preview": True},
                        {"title": "Docker Containers Crash Course", "description": "Building and running Docker images.", "video_url": "https://www.youtube.com/embed/fqMOX6JJhGo", "duration_minutes": 45, "position": 2, "is_preview": False},
                        {"title": "CI/CD & DevOps Automation", "description": "Automating builds, testing, and deployment.", "video_url": "https://www.youtube.com/embed/scEDHsr3APg", "duration_minutes": 40, "position": 3, "is_preview": False}
                    ]
                }
            ],
            "quiz": {
                "title": "Cloud & DevOps Knowledge Check",
                "description": "Check your comprehension of cloud concepts and Docker containers.",
                "passing_score": 60,
                "questions": [
                    {"question": "What is AWS EC2 primarily used for?", "option_a": "Object storage", "option_b": "Virtual cloud servers", "option_c": "Domain registration", "option_d": "Email routing", "correct_option": "b", "points": 1}
                ]
            }
        }
    ]

    for c in courses_data:
        cat_id = cat_map.get(c["category"])
        if not cat_id:
            print(f"Skipping course {c['title']} - category {c['category']} not found.")
            continue

        # Upsert course
        course_payload = {
            "instructor_id": owner_id,
            "category_id": cat_id,
            "title": c["title"],
            "slug": c["slug"],
            "short_description": c["short_description"],
            "description": c["description"],
            "price": c["price"],
            "discount_price": c["discount_price"],
            "level": c["level"],
            "language": c["language"],
            "status": c["status"],
            "requirements": c["requirements"],
            "what_you_will_learn": c["what_you_will_learn"],
            "duration_minutes": c["duration_minutes"]
        }
        res = sb.table("courses").upsert(course_payload, on_conflict="slug").execute()
        if not res.data:
            print(f"Failed to insert course: {c['title']}")
            continue
        course_id = res.data[0]["id"]
        print(f"Course inserted/updated: '{c['title']}' (ID: {course_id})")

        # Insert sections and lessons
        for s in c["sections"]:
            # Check existing section or insert
            sec_res = sb.table("sections").select("id").eq("course_id", course_id).eq("position", s["position"]).execute()
            if sec_res.data:
                sec_id = sec_res.data[0]["id"]
            else:
                sec_res = sb.table("sections").insert({
                    "course_id": course_id,
                    "title": s["title"],
                    "position": s["position"]
                }).execute()
                sec_id = sec_res.data[0]["id"] if sec_res.data else None

            if sec_id:
                for l in s["lessons"]:
                    # Check existing lesson
                    les_res = sb.table("lessons").select("id").eq("section_id", sec_id).eq("position", l["position"]).execute()
                    if not les_res.data:
                        sb.table("lessons").insert({
                            "section_id": sec_id,
                            "title": l["title"],
                            "description": l["description"],
                            "video_url": l["video_url"],
                            "duration_minutes": l["duration_minutes"],
                            "position": l["position"],
                            "is_preview": l["is_preview"]
                        }).execute()

        # Insert Quiz
        if "quiz" in c and c["quiz"]:
            q_info = c["quiz"]
            sec_res = sb.table("sections").select("id").eq("course_id", course_id).limit(1).execute()
            sec_id = sec_res.data[0]["id"] if sec_res.data else None
            quiz_res = sb.table("quizzes").select("id").eq("course_id", course_id).execute()
            if not quiz_res.data:
                q_create = sb.table("quizzes").insert({
                    "course_id": course_id,
                    "section_id": sec_id,
                    "title": q_info["title"],
                    "description": q_info["description"],
                    "passing_score": q_info["passing_score"]
                }).execute()
                if q_create.data:
                    quiz_id = q_create.data[0]["id"]
                    for q in q_info["questions"]:
                        sb.table("quiz_questions").insert({
                            "quiz_id": quiz_id,
                            "question": q["question"],
                            "option_a": q["option_a"],
                            "option_b": q["option_b"],
                            "option_c": q["option_c"],
                            "option_d": q["option_d"],
                            "correct_option": q["correct_option"],
                            "points": q["points"]
                        }).execute()

    print("\nSUCCESS: All 5 online dataset courses seeded successfully!")

if __name__ == "__main__":
    seed_courses()
