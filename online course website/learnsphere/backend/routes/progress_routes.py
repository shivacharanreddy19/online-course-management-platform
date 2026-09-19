"""
Lesson progress tracking.

POST /api/progress                 {lesson_id, completed?, watched_seconds?}
                                   upserts progress, recalculates the course
                                   percentage; at 100% marks the enrollment
                                   complete and issues a certificate.
GET  /api/progress/<course_id>     per-lesson map + aggregate for the viewer
"""
from flask import Blueprint, g, request

from services.supabase_service import sb, get_course, is_enrolled, notify
from services.course_service import recalc_progress, get_curriculum
from services.certificate_service import issue_certificate
from utils.decorators import require_auth
from utils.helpers import ok, fail, first_row
from utils.validators import body, required, as_bool, as_int

progress_bp = Blueprint("progress", __name__)


def _lesson_course(lesson_id):
    les = first_row(sb().table("lessons").select("id, section_id").eq("id", lesson_id).execute())
    if not les:
        return None, None
    sec = first_row(sb().table("sections").select("id, course_id").eq("id", les["section_id"]).execute())
    if not sec:
        return None, None
    return les, sec


@progress_bp.post("")
@require_auth
def update_progress():
    try:
        data = body(request)
        required(data, "lesson_id")
        lesson_id = str(data["lesson_id"])
        les, sec = _lesson_course(lesson_id)
        if not sec:
            return fail("Lesson not found", 404)
        course_id = sec["course_id"]
        course = get_course(course_id)

        enrolled = is_enrolled(g.user.id, course_id)
        own_course = course and course["instructor_id"] == g.user.id
        if not enrolled and not own_course:
            return fail("Enroll in this course to track progress", 403)

        payload = {"student_id": g.user.id, "lesson_id": lesson_id}
        changed = False
        if "completed" in data:
            payload["completed"] = as_bool(data["completed"])
            changed = True
        if "watched_seconds" in data:
            payload["watched_seconds"] = as_int(data["watched_seconds"], "watched_seconds", 0) or 0
            changed = True
        if not changed:
            return fail("Nothing to update")

        sb().table("lesson_progress").upsert(
            payload, on_conflict="student_id,lesson_id").execute()

        pct = recalc_progress(g.user.id, course_id)

        certificate = None
        if enrolled and pct >= 100:
            notify(g.user.id, "Course completed 🏆",
                   f"Amazing work — you finished “{course['title']}”!")
            certificate = issue_certificate(g.user.id, course_id)

        return ok({"completion_percentage": pct, "certificate": certificate},
                  message="Progress saved")
    except ValueError as exc:
        return fail(str(exc), 400)


@progress_bp.get("/<course_id>")
@require_auth
def get_progress(course_id):
    enrollment = first_row(
        sb().table("enrollments").select("*")
        .eq("student_id", g.user.id).eq("course_id", course_id).execute())
    if not enrollment:
        return fail("Not enrolled in this course", 404)

    sections = get_curriculum(course_id)
    lesson_ids = [l["id"] for s in sections for l in s["lessons"]]
    progress = []
    if lesson_ids:
        progress = (sb().table("lesson_progress").select("*")
                    .eq("student_id", g.user.id)
                    .in_("lesson_id", lesson_ids).execute().data or [])
    pmap = {p["lesson_id"]: p for p in progress}
    total = len(lesson_ids)
    done = sum(1 for p in progress if p.get("completed"))

    return ok({
        "lessons": pmap,
        "total_lessons": total,
        "completed_lessons": done,
        "completion_percentage": enrollment["completion_percentage"],
        "completed": enrollment["completed"],
    })
