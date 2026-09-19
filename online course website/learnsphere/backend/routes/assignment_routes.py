"""
Assignments: builder CRUD + student submissions + instructor grading.

POST /api/courses/<id>/assignments            [instructor]
PUT  /api/assignments/<id>                    [instructor]
DELETE /api/assignments/<id>                  [instructor]
GET  /api/courses/<id>/assignments            [enrolled/owner] (+ my submission attached)
POST /api/assignments/<id>/submit             [enrolled student] {submission_text?, file_url?}
PUT  /api/assignment-submissions/<id>/grade   [instructor] {score, feedback}
"""
from flask import Blueprint, g, request

from services.supabase_service import sb, get_course, course_owner_or_admin, is_enrolled, notify
from utils.decorators import require_auth
from utils.helpers import ok, fail, first_row
from utils.validators import body, required, str_len, as_number

assignment_bp = Blueprint("assignments", __name__)


def _assignment_course(assignment_id):
    a = first_row(sb().table("assignments").select("*").eq("id", assignment_id).execute())
    if not a:
        return None, None
    return a, get_course(a["course_id"])


@assignment_bp.post("/courses/<course_id>/assignments")
@require_auth
def create_assignment(course_id):
    course = get_course(course_id)
    if not course:
        return fail("Course not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    try:
        data = body(request)
        required(data, "title")
        str_len(data["title"], "title", 2, 200, allow_none=False)
        res = sb().table("assignments").insert({
            "course_id": course_id,
            "section_id": data.get("section_id") or None,
            "title": data["title"].strip(),
            "description": data.get("description"),
            "due_date": data.get("due_date") or None,
        }).execute()
        return ok({"assignment": first_row(res)}, status=201, message="Assignment created")
    except ValueError as exc:
        return fail(str(exc), 400)


@assignment_bp.put("/assignments/<assignment_id>")
@require_auth
def update_assignment(assignment_id):
    a, course = _assignment_course(assignment_id)
    if not course:
        return fail("Assignment not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    try:
        data = body(request)
        update = {f: data[f] for f in ("title", "description", "due_date") if f in data}
        if "section_id" in data:
            update["section_id"] = data["section_id"] or None
        if "title" in update:
            str_len(update["title"], "title", 2, 200, allow_none=False)
        if not update:
            return fail("Nothing to update")
        sb().table("assignments").update(update).eq("id", assignment_id).execute()
        return ok({"message": "Assignment updated"})
    except ValueError as exc:
        return fail(str(exc), 400)


@assignment_bp.delete("/assignments/<assignment_id>")
@require_auth
def delete_assignment(assignment_id):
    a, course = _assignment_course(assignment_id)
    if not course:
        return fail("Assignment not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    sb().table("assignments").delete().eq("id", assignment_id).execute()
    return ok({"message": "Assignment deleted"})


@assignment_bp.get("/courses/<course_id>/assignments")
@require_auth
def course_assignments(course_id):
    course = get_course(course_id)
    if not course:
        return fail("Course not found", 404)
    owner = course_owner_or_admin(course, g.profile)
    if not owner and not is_enrolled(g.user.id, course_id):
        return fail("Enroll in this course to see its assignments", 403)

    items = (sb().table("assignments").select("*").eq("course_id", course_id)
             .order("created_at").execute().data or [])
    if items:
        subs = (sb().table("assignment_submissions").select("*")
                .eq("student_id", g.user.id)
                .in_("assignment_id", [a["id"] for a in items]).execute().data or [])
        smap = {s["assignment_id"]: s for s in subs}
        for a in items:
            a["my_submission"] = smap.get(a["id"])
    return ok({"items": items, "is_owner": owner})


@assignment_bp.post("/assignments/<assignment_id>/submit")
@require_auth
def submit_assignment(assignment_id):
    a, course = _assignment_course(assignment_id)
    if not course:
        return fail("Assignment not found", 404)
    if not is_enrolled(g.user.id, course["id"]):
        return fail("Enroll in this course to submit assignments", 403)
    try:
        data = body(request)
        text = (data.get("submission_text") or "").strip()
        file_url = (data.get("file_url") or "").strip() or None
        if not text and not file_url:
            raise ValueError("Add a text answer or attach a file before submitting")
        str_len(text, "submission_text", 0, 10_000)

        existing = first_row(
            sb().table("assignment_submissions").select("id")
            .eq("assignment_id", assignment_id).eq("student_id", g.user.id).execute())
        if existing:
            sb().table("assignment_submissions").update({
                "submission_text": text or None,
                "file_url": file_url,
                "submitted_at": "now()",
                "score": None, "feedback": None,     # resubmission resets grading
            }).eq("id", existing["id"]).execute()
            sid = existing["id"]
        else:
            res = sb().table("assignment_submissions").insert({
                "assignment_id": assignment_id,
                "student_id": g.user.id,
                "submission_text": text or None,
                "file_url": file_url,
            }).execute()
            sid = first_row(res)["id"]

        # let the instructor know
        if course.get("instructor_id"):
            notify(course["instructor_id"], "New assignment submission",
                   f"{g.profile.get('full_name') or 'A student'} submitted “{a['title']}” ({course['title']}).")
        return ok({"submission_id": sid}, status=201, message="Assignment submitted")
    except ValueError as exc:
        return fail(str(exc), 400)


@assignment_bp.put("/assignment-submissions/<submission_id>/grade")
@require_auth
def grade_submission(submission_id):
    sub = first_row(sb().table("assignment_submissions").select("*")
                    .eq("id", submission_id).execute())
    if not sub:
        return fail("Submission not found", 404)
    a, course = _assignment_course(sub["assignment_id"])
    if not course or not course_owner_or_admin(course, g.profile):
        return fail("You can only grade your own courses", 403)
    try:
        data = body(request)
        score = as_number(data.get("score"), "score", 0, 100, allow_none=False)
        feedback = (data.get("feedback") or "").strip()
        str_len(feedback, "feedback", 0, 4000)
        sb().table("assignment_submissions").update({
            "score": score, "feedback": feedback or None,
        }).eq("id", submission_id).execute()
        notify(sub["student_id"], "Assignment graded 📝",
               f"“{a['title']}” scored {score:.0f}/100." + (f" Feedback: {feedback}" if feedback else ""))
        return ok({"message": "Submission graded"})
    except ValueError as exc:
        return fail(str(exc), 400)
