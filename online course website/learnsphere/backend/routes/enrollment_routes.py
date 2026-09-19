"""
Enrollment endpoints.

POST /api/enrollments              {course_id} — enroll (free courses only;
                                   paid courses go through /api/orders checkout)
GET  /api/enrollments              my enrollments + course + progress
GET  /api/enrollments/<course_id>  enrollment status for one course
"""
from flask import Blueprint, g, request

from services.supabase_service import sb, get_course, is_enrolled, notify
from services.course_service import attach_course_meta, effective_price
from utils.decorators import require_auth
from utils.helpers import ok, fail, first_row
from utils.validators import body, required

enrollment_bp = Blueprint("enrollments", __name__)


@enrollment_bp.post("")
@require_auth
def enroll():
    try:
        data = body(request)
        required(data, "course_id")
        course_id = str(data["course_id"])

        course = get_course(course_id)
        if not course or course["status"] != "published":
            return fail("This course is not available", 404)
        if course["instructor_id"] == g.user.id:
            return fail("You cannot enroll in your own course", 400)
        if is_enrolled(g.user.id, course_id):
            return fail("You are already enrolled in this course", 409)
        if effective_price(course) > 0:
            return fail("This is a paid course — add it to your cart and check out", 402)

        res = sb().table("enrollments").insert({
            "student_id": g.user.id,
            "course_id": course_id,
        }).execute()

        notify(g.user.id, "Enrollment confirmed 🎉",
               f"Welcome to “{course['title']}”. Start learning now!")
        return ok({"enrollment": first_row(res)}, status=201, message="Enrolled successfully")
    except ValueError as exc:
        return fail(str(exc), 400)


@enrollment_bp.get("")
@require_auth
def my_enrollments():
    res = (
        sb().table("enrollments")
        .select("*")
        .eq("student_id", g.user.id)
        .order("enrolled_at", desc=True)
        .execute()
    )
    enrollments = res.data or []
    course_ids = [e["course_id"] for e in enrollments]
    courses = []
    if course_ids:
        courses = attach_course_meta(
            sb().table("courses").select("*").in_("id", course_ids).execute().data or [])
    cmap = {c["id"]: c for c in courses}
    for e in enrollments:
        e["course"] = cmap.get(e["course_id"])
    return ok({"items": enrollments})


@enrollment_bp.get("/<course_id>")
@require_auth
def enrollment_status(course_id):
    res = (
        sb().table("enrollments")
        .select("*")
        .eq("student_id", g.user.id)
        .eq("course_id", course_id)
        .limit(1)
        .execute()
    )
    row = first_row(res)
    if not row:
        return fail("Not enrolled in this course", 404)
    return ok({"enrollment": row})
