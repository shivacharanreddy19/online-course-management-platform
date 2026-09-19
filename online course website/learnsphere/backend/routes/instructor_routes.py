"""
Instructor workspace endpoints.

GET /api/instructor/statistics                 KPIs + charts data
GET /api/instructor/students                   every enrollment across my courses
GET /api/instructor/courses/<id>/students      students of one course (+progress)
GET /api/instructor/reviews                    reviews across my courses
GET /api/instructor/submissions?assignment_id= submissions to grade
"""
from flask import Blueprint, g, request

from services.supabase_service import sb, course_owner_or_admin, get_course
from services.course_service import review_stats
from utils.decorators import require_role
from utils.helpers import ok, fail, page_params

instructor_bp = Blueprint("instructor", __name__)


def _my_course_ids(profile):
    q = sb().table("courses").select("id")
    if profile["role"] != "admin":
        q = q.eq("instructor_id", profile["id"])
    return [c["id"] for c in q.execute().data or []]


@instructor_bp.get("/statistics")
@require_role("instructor", "admin")
def statistics():
    course_ids = _my_course_ids(g.profile)
    courses = []
    if course_ids:
        courses = sb().table("courses").select("id, title, status, price, discount_price") \
            .in_("id", course_ids).execute().data or []

    enrollments = []
    if course_ids:
        enrollments = sb().table("enrollments").select("*") \
            .in_("course_id", course_ids).execute().data or []

    revenue = 0.0
    if course_ids:
        items = sb().table("order_items").select("price, order_id") \
            .in_("course_id", course_ids).execute().data or []
        paid_orders = {
            o["id"] for o in sb().table("orders").select("id")
            .eq("payment_status", "paid")
            .in_("id", list({i["order_id"] for i in items}) or ["00000000-0000-0000-0000-000000000000"])
            .execute().data or []
        }
        revenue = round(sum(float(i["price"]) for i in items if i["order_id"] in paid_orders), 2)

    stats = review_stats(course_ids)
    ratings = [s["avg"] for s in stats.values() if s["count"] > 0]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else 0

    # enrollments over the last 6 months
    from collections import Counter
    monthly = Counter()
    for e in enrollments:
        key = (e.get("enrolled_at") or "")[:7]  # YYYY-MM
        if key:
            monthly[key] += 1

    return ok({
        "total_courses": len(courses),
        "published_courses": sum(1 for c in courses if c["status"] == "published"),
        "pending_courses": sum(1 for c in courses if c["status"] == "pending"),
        "total_students": len({e["student_id"] for e in enrollments}),
        "total_enrollments": len(enrollments),
        "completed_enrollments": sum(1 for e in enrollments if e.get("completed")),
        "revenue": revenue,
        "average_rating": avg_rating,
        "enrollments_by_month": dict(sorted(monthly.items())),
    })


@instructor_bp.get("/students")
@require_role("instructor", "admin")
def students():
    course_ids = _my_course_ids(g.profile)
    if not course_ids:
        return ok({"items": []})
    enrolls = (sb().table("enrollments").select("*")
               .in_("course_id", course_ids)
               .order("enrolled_at", desc=True).execute().data or [])
    _attach_students(enrolls, course_ids)
    return ok({"items": enrolls})


@instructor_bp.get("/courses/<course_id>/students")
@require_role("instructor", "admin")
def course_students(course_id):
    course = get_course(course_id)
    if not course or not course_owner_or_admin(course, g.profile):
        return fail("Course not found or not yours", 404)
    enrolls = (sb().table("enrollments").select("*").eq("course_id", course_id)
               .order("enrolled_at", desc=True).execute().data or [])
    _attach_students(enrolls, [course_id])
    return ok({"items": enrolls, "course": course})


def _attach_students(enrolls, course_ids):
    student_ids = list({e["student_id"] for e in enrolls})
    profiles = {}
    if student_ids:
        profiles = {p["id"]: p for p in
                    sb().table("profiles").select("id, full_name, email, avatar_url")
                    .in_("id", student_ids).execute().data or []}
    courses = {c["id"]: c for c in
               (sb().table("courses").select("id, title").in_("id", course_ids).execute().data or [])}
    # quiz averages per student
    if student_ids:
        attempts = (sb().table("quiz_attempts").select("student_id, score")
                    .in_("student_id", student_ids).execute().data or [])
    else:
        attempts = []
    buckets = {}
    for a in attempts:
        buckets.setdefault(a["student_id"], []).append(float(a.get("score") or 0))
    for e in enrolls:
        e["student"] = profiles.get(e["student_id"])
        e["course"] = courses.get(e["course_id"])
        scores = buckets.get(e["student_id"], [])
        e["quiz_avg"] = round(sum(scores) / len(scores), 1) if scores else None


@instructor_bp.get("/reviews")
@require_role("instructor", "admin")
def reviews():
    course_ids = _my_course_ids(g.profile)
    if not course_ids:
        return ok({"items": []})
    rows = (sb().table("reviews").select("*").in_("course_id", course_ids)
            .order("created_at", desc=True).execute().data or [])
    profiles = {p["id"]: p for p in
                sb().table("profiles").select("id, full_name, avatar_url")
                .in_("id", list({r["student_id"] for r in rows}) or ["00000000-0000-0000-0000-000000000000"])
                .execute().data or []}
    courses = {c["id"]: c for c in
               sb().table("courses").select("id, title").in_("id", course_ids).execute().data or []}
    for r in rows:
        r["student"] = profiles.get(r["student_id"])
        r["course"] = courses.get(r["course_id"])
    return ok({"items": rows})


@instructor_bp.get("/submissions")
@require_role("instructor", "admin")
def submissions():
    course_ids = _my_course_ids(g.profile)
    if not course_ids:
        return ok({"items": []})
    assignments = (sb().table("assignments").select("id, title, course_id")
                   .in_("course_id", course_ids).execute().data or [])
    a_map = {a["id"]: a for a in assignments}
    wanted = request.args.get("assignment_id")
    ids = [wanted] if wanted in a_map else list(a_map)
    if not ids:
        return ok({"items": [], "assignments": assignments})
    subs = (sb().table("assignment_submissions").select("*")
            .in_("assignment_id", ids)
            .order("submitted_at", desc=True).execute().data or [])
    students = {p["id"]: p for p in
                sb().table("profiles").select("id, full_name, email, avatar_url")
                .in_("id", list({s["student_id"] for s in subs}) or ["00000000-0000-0000-0000-000000000000"])
                .execute().data or []}
    for s in subs:
        s["assignment"] = a_map.get(s["assignment_id"])
        s["student"] = students.get(s["student_id"])
    return ok({"items": subs, "assignments": assignments})
