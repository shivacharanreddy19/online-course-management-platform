"""
Lesson CRUD (owned via the parent course).

POST   /api/sections/<section_id>/lessons   [owner/admin]
PUT    /api/lessons/<id>                    [owner/admin]
DELETE /api/lessons/<id>                    [owner/admin]
"""
from flask import Blueprint, g, request

from services.supabase_service import sb, get_course, course_owner_or_admin
from utils.decorators import require_auth
from utils.helpers import ok, fail, first_row
from utils.validators import body, required, str_len, as_int, as_bool

lesson_bp = Blueprint("lessons", __name__)

LESSON_FIELDS = ("title", "description", "video_url", "content", "resource_url",
                 "duration_minutes", "position", "is_preview")


def _section_and_course(section_id):
    sec = first_row(sb().table("sections").select("*").eq("id", section_id).execute())
    if not sec:
        return None, None
    return sec, get_course(sec["course_id"])


def _lesson_course(lesson_id):
    les = first_row(sb().table("lessons").select("*").eq("id", lesson_id).execute())
    if not les:
        return None, None, None
    sec, course = _section_and_course(les["section_id"])
    return les, sec, course


def _validate(data, partial=False):
    if not partial:
        required(data, "title")
    payload = {}
    if "title" in data:
        str_len(data["title"], "title", 2, 200, allow_none=False)
        payload["title"] = data["title"].strip()
    for f in ("description", "content"):
        if f in data:
            payload[f] = data[f]
    for f in ("video_url", "resource_url"):
        if f in data:
            str_len(data[f], f, 0, 800)
            payload[f] = data[f]
    if "duration_minutes" in data:
        payload["duration_minutes"] = as_int(data["duration_minutes"], "duration_minutes", 0, 100_000) or 0
    if "position" in data:
        payload["position"] = as_int(data["position"], "position", 0) or 0
    if "is_preview" in data:
        payload["is_preview"] = as_bool(data["is_preview"])
    return payload


@lesson_bp.post("/sections/<section_id>/lessons")
@require_auth
def create_lesson(section_id):
    sec, course = _section_and_course(section_id)
    if not course:
        return fail("Section not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    try:
        payload = _validate(body(request))
        if "position" not in payload or not payload["position"]:
            highest = (sb().table("lessons").select("position").eq("section_id", section_id)
                       .order("position", desc=True).limit(1).execute().data or [{}])
            payload["position"] = (highest[0].get("position") or 0) + 1
        payload["section_id"] = section_id
        res = sb().table("lessons").insert(payload).execute()
        # keep course duration in sync
        _sync_duration(course["id"])
        return ok({"lesson": first_row(res)}, status=201, message="Lesson added")
    except ValueError as exc:
        return fail(str(exc), 400)


@lesson_bp.put("/lessons/<lesson_id>")
@require_auth
def update_lesson(lesson_id):
    les, sec, course = _lesson_course(lesson_id)
    if not course:
        return fail("Lesson not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    try:
        payload = _validate(body(request), partial=True)
        if not payload:
            return fail("Nothing to update")
        sb().table("lessons").update(payload).eq("id", lesson_id).execute()
        _sync_duration(course["id"])
        return ok({"message": "Lesson updated"})
    except ValueError as exc:
        return fail(str(exc), 400)


@lesson_bp.delete("/lessons/<lesson_id>")
@require_auth
def delete_lesson(lesson_id):
    les, sec, course = _lesson_course(lesson_id)
    if not course:
        return fail("Lesson not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    sb().table("lessons").delete().eq("id", lesson_id).execute()
    _sync_duration(course["id"])
    return ok({"message": "Lesson deleted"})


def _sync_duration(course_id):
    secs = sb().table("sections").select("id").eq("course_id", course_id).execute().data or []
    if not secs:
        return
    lessons = (sb().table("lessons").select("duration_minutes")
               .in_("section_id", [s["id"] for s in secs]).execute().data or [])
    total = sum(l.get("duration_minutes") or 0 for l in lessons)
    sb().table("courses").update({"duration_minutes": total}).eq("id", course_id).execute()
