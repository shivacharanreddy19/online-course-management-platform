"""
Course reviews.

GET    /api/courses/<id>/reviews   public — list + summary (avg, count, distribution)
POST   /api/courses/<id>/reviews   [enrolled student] {rating 1-5, review_text}
DELETE /api/reviews/<id>           [review owner / admin]
"""
from flask import Blueprint, g, request

from services.supabase_service import sb, get_course, is_enrolled
from services.course_service import review_stats
from utils.decorators import require_auth
from utils.helpers import ok, fail, first_row, page_params, paged
from utils.validators import body, required, str_len, as_int

review_bp = Blueprint("reviews", __name__)


def _with_authors(rows):
    ids = list({r["student_id"] for r in rows})
    names = {}
    if ids:
        profiles = sb().table("profiles").select("id, full_name, avatar_url").in_("id", ids).execute().data or []
        names = {p["id"]: p for p in profiles}
    for r in rows:
        r["student"] = names.get(r["student_id"])
    return rows


@review_bp.get("/courses/<course_id>/reviews")
def list_reviews(course_id):
    page, per, start, end = page_params(default_per=6)
    res = (sb().table("reviews").select("*", count="exact")
           .eq("course_id", course_id)
           .order("created_at", desc=True).range(start, end).execute())
    rows = _with_authors(res.data or [])
    stats = review_stats([course_id]).get(course_id, {"avg": 0, "count": 0})

    dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in (sb().table("reviews").select("rating").eq("course_id", course_id).execute().data or []):
        dist[int(r["rating"])] = dist.get(int(r["rating"]), 0) + 1

    data = paged(rows, res.count, page, per)
    data["summary"] = {"avg": stats["avg"], "count": stats["count"], "distribution": dist}
    return ok(data)


@review_bp.post("/courses/<course_id>/reviews")
@require_auth
def create_review(course_id):
    course = get_course(course_id)
    if not course or course["status"] != "published":
        return fail("Course not found", 404)
    if not is_enrolled(g.user.id, course_id):
        return fail("Only enrolled students can review this course", 403)
    try:
        data = body(request)
        required(data, "rating")
        rating = as_int(data["rating"], "rating", 1, 5, allow_none=False)
        text = (data.get("review_text") or "").strip()
        str_len(text, "review_text", 0, 2000)

        existing = first_row(sb().table("reviews").select("id")
                             .eq("course_id", course_id).eq("student_id", g.user.id).execute())
        if existing:
            return fail("You have already reviewed this course", 409)

        res = sb().table("reviews").insert({
            "course_id": course_id, "student_id": g.user.id,
            "rating": rating, "review_text": text or None,
        }).execute()
        return ok({"review": first_row(res)}, status=201, message="Review published")
    except ValueError as exc:
        return fail(str(exc), 400)


@review_bp.delete("/reviews/<review_id>")
@require_auth
def delete_review(review_id):
    review = first_row(sb().table("reviews").select("*").eq("id", review_id).execute())
    if not review:
        return fail("Review not found", 404)
    if review["student_id"] != g.user.id and g.profile["role"] != "admin":
        return fail("Permission denied", 403)
    sb().table("reviews").delete().eq("id", review_id).execute()
    return ok({"message": "Review removed"})
