"""
Course-related business logic: serialisation, aggregates, curriculum tree.
"""
from services.supabase_service import sb, review_stats, enrollment_counts
from utils.helpers import first_row


def effective_price(course: dict):
    dp = course.get("discount_price")
    if dp is not None and float(dp) < float(course.get("price") or 0):
        return float(dp)
    return float(course.get("price") or 0)


def attach_course_meta(courses: list) -> list:
    """Add rating / student-count / instructor / category to course dicts."""
    if not courses:
        return courses
    ids = [c["id"] for c in courses]
    stats = review_stats(ids)
    counts = enrollment_counts(ids)

    instr_ids = list({c["instructor_id"] for c in courses if c.get("instructor_id")})
    cat_ids = list({c["category_id"] for c in courses if c.get("category_id")})

    instructors = {}
    if instr_ids:
        res = sb().table("profiles").select("id, full_name, avatar_url").in_("id", instr_ids).execute()
        instructors = {p["id"]: p for p in res.data or []}

    categories = {}
    if cat_ids:
        res = sb().table("categories").select("id, name").in_("id", cat_ids).execute()
        categories = {c["id"]: c for c in res.data or []}

    for c in courses:
        c["rating_avg"] = stats.get(c["id"], {}).get("avg", 0)
        c["rating_count"] = stats.get(c["id"], {}).get("count", 0)
        c["students_count"] = counts.get(c["id"], 0)
        c["instructor"] = instructors.get(c.get("instructor_id"))
        c["category"] = categories.get(c.get("category_id"))
        c["effective_price"] = effective_price(c)
    return courses


def get_curriculum(course_id: str) -> list:
    """Sections with ordered lessons (also returns total lesson count on each section)."""
    sec_res = (
        sb().table("sections")
        .select("*")
        .eq("course_id", course_id)
        .order("position")
        .execute()
    )
    sections = sec_res.data or []
    if not sections:
        return []
    sec_ids = [s["id"] for s in sections]
    les_res = (
        sb().table("lessons")
        .select("*")
        .in_("section_id", sec_ids)
        .order("position")
        .execute()
    )
    lessons = les_res.data or []
    by_sec = {sid: [] for sid in sec_ids}
    for l in lessons:
        by_sec.setdefault(l["section_id"], []).append(l)
    for s in sections:
        s["lessons"] = by_sec.get(s["id"], [])
    return sections


def count_lessons(course_id: str) -> int:
    sections = (
        sb().table("sections").select("id").eq("course_id", course_id).execute()
    ).data or []
    if not sections:
        return 0
    res = (
        sb().table("lessons")
        .select("id", count="exact")
        .in_("section_id", [s["id"] for s in sections])
        .execute()
    )
    return res.count or 0


def recalc_progress(student_id: str, course_id: str) -> float:
    """Recompute enrollment completion_percentage from lesson_progress and
    return the new percentage (0-100)."""
    total = count_lessons(course_id)
    if total == 0:
        return 0.0

    sections = (
        sb().table("sections").select("id").eq("course_id", course_id).execute()
    ).data or []
    sec_ids = [s["id"] for s in sections]
    lesson_ids = [
        r["id"] for r in
        (sb().table("lessons").select("id").in_("section_id", sec_ids).execute().data or [])
    ]
    done_res = (
        sb().table("lesson_progress")
        .select("id", count="exact")
        .eq("student_id", student_id)
        .eq("completed", True)
        .in_("lesson_id", lesson_ids)
        .execute()
    )
    done = done_res.count or 0
    pct = round(min(100.0, done * 100.0 / total), 2)
    completed = pct >= 100.0

    sb().table("enrollments").update({
        "completion_percentage": pct,
        "completed": completed,
    }).eq("student_id", student_id).eq("course_id", course_id).execute()
    return pct
