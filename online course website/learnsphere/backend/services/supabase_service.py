"""
Thin convenience wrappers around the shared Supabase client.
All database access in the backend funnels through here.
"""
from config import get_supabase


def sb():
    """The singleton service-role client."""
    return get_supabase()


def notify(user_id: str, title: str, message: str = ""):
    """Insert an in-app notification (never raises)."""
    try:
        sb().table("notifications").insert({
            "user_id": user_id,
            "title": title,
            "message": message,
        }).execute()
    except Exception:
        pass


def get_course(course_id: str):
    from utils.helpers import first_row
    res = sb().table("courses").select("*").eq("id", course_id).limit(1).execute()
    return first_row(res)


def is_enrolled(student_id: str, course_id: str) -> bool:
    res = (
        sb().table("enrollments")
        .select("id")
        .eq("student_id", student_id)
        .eq("course_id", course_id)
        .limit(1)
        .execute()
    )
    return bool(res.data)


def course_owner_or_admin(course: dict, profile: dict) -> bool:
    return bool(course) and (
        profile.get("role") == "admin" or course.get("instructor_id") == profile.get("id")
    )


def review_stats(course_ids):
    """Return {course_id: {'avg': float, 'count': int}} for a list of ids."""
    stats = {cid: {"avg": 0, "count": 0} for cid in course_ids}
    if not course_ids:
        return stats
    res = (
        sb().table("reviews")
        .select("course_id, rating")
        .in_("course_id", list(course_ids))
        .execute()
    )
    bucket = {}
    for row in res.data or []:
        bucket.setdefault(row["course_id"], []).append(row.get("rating") or 0)
    for cid, ratings in bucket.items():
        if ratings:
            stats[cid] = {"avg": round(sum(ratings) / len(ratings), 2), "count": len(ratings)}
    return stats


def enrollment_counts(course_ids):
    counts = {cid: 0 for cid in course_ids}
    if not course_ids:
        return counts
    from collections import Counter
    res = sb().table("enrollments").select("course_id").in_("course_id", list(course_ids)).execute()
    c = Counter(row["course_id"] for row in res.data or [])
    counts.update(c)
    return counts
