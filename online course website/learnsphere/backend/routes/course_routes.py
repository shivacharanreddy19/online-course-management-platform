"""
Course catalog, search/filter, course CRUD and sections.

GET    /api/courses                    public catalog (published only)
                                       ?q=&category=&level=&price=&min_rating=&sort=&page=&per_page=
GET    /api/courses/<id>               public details (+ viewer context when authed)
GET    /api/courses/mine               [instructor] own courses, all statuses
POST   /api/courses                    [instructor]
PUT    /api/courses/<id>               [owner/admin]
DELETE /api/courses/<id>               [owner (draft/rejected) / admin]
POST   /api/courses/<id>/submit        [owner] draft/rejected → pending
POST   /api/courses/<id>/sections      [owner/admin]
PUT    /api/sections/<id>              [owner/admin]
DELETE /api/sections/<id>              [owner/admin]
GET    /api/categories                 public
GET    /api/instructors/featured       public
"""
from flask import Blueprint, g, request

from services.supabase_service import sb, get_course, course_owner_or_admin, is_enrolled
from services.course_service import attach_course_meta, get_curriculum, count_lessons, effective_price
from utils.decorators import require_auth, optional_auth, require_approved_instructor
from utils.helpers import ok, fail, page_params, paged, slugify, sanitize_search, first_row
from utils.validators import body, required, str_len, validate_course_payload, as_int

course_bp = Blueprint("courses", __name__)


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------

@course_bp.get("/courses")
def list_courses():
    try:
        page, per, start, end = page_params(default_per=9)
        q = sanitize_search(request.args.get("q", ""))
        category = request.args.get("category", "")
        level = request.args.get("level", "")
        price = request.args.get("price", "")          # free | paid
        min_rating = request.args.get("min_rating", "")
        sort = request.args.get("sort", "popular")     # popular|newest|rating|price_asc|price_desc

        query = sb().table("courses").select("*", count="exact").eq("status", "published")

        if q:
            # title/description match, plus instructor-name and category-name match
            instructor_ids = [p["id"] for p in (
                sb().table("profiles").select("id").ilike("full_name", f"%{q}%").execute().data or [])]
            category_ids = [c["id"] for c in (
                sb().table("categories").select("id").ilike("name", f"%{q}%").execute().data or [])]
            ors = [f"title.ilike.%{q}%", f"description.ilike.%{q}%", f"short_description.ilike.%{q}%"]
            if instructor_ids:
                ors.append("instructor_id.in.(" + ",".join(instructor_ids) + ")")
            if category_ids:
                ors.append("category_id.in.(" + ",".join(category_ids) + ")")
            query = query.or_(",".join(ors))

        if category:
            query = query.eq("category_id", category)
        if level:
            query = query.eq("level", level)
        if price == "free":
            query = query.eq("price", 0)
        elif price == "paid":
            query = query.gt("price", 0)

        order_col = {"newest": "created_at", "price_asc": "price", "price_desc": "price"}.get(sort)
        if order_col:
            query = query.order(order_col, desc=(sort != "price_asc"))

        res = query.range(start, end).execute()
        courses = res.data or []
        courses = attach_course_meta(courses)

        # rating filter + sorts that need aggregates (applied post-fetch on this page)
        if min_rating:
            try:
                threshold = float(min_rating)
                courses = [c for c in courses if c["rating_avg"] >= threshold]
            except ValueError:
                pass
        if sort == "popular":
            courses.sort(key=lambda c: c["students_count"], reverse=True)
        elif sort == "rating":
            courses.sort(key=lambda c: c["rating_avg"], reverse=True)

        data = paged(courses, res.count, page, per)
        return ok(data)
    except RuntimeError as exc:
        return fail(str(exc), 503)


@course_bp.get("/courses/mine")
@require_auth
def my_courses():
    if g.profile["role"] not in ("instructor", "admin"):
        return fail("Only instructors can view their courses", 403)
    q = (sb().table("courses").select("*").order("created_at", desc=True))
    if g.profile["role"] != "admin":
        q = q.eq("instructor_id", g.user.id)
    res = q.execute()
    return ok({"items": attach_course_meta(res.data or [])})


@course_bp.get("/courses/<course_id>")
@optional_auth
def course_details(course_id):
    course = get_course(course_id)
    if not course:
        return fail("Course not found", 404)

    viewer = g.profile
    is_owner = viewer and course_owner_or_admin(course, viewer)
    enrolled = viewer and is_enrolled(viewer["id"], course_id)

    if course["status"] != "published" and not (is_owner or (viewer and viewer["role"] == "admin")):
        return fail("This course is not available", 404)

    attach_course_meta([course])
    course["sections"] = get_curriculum(course_id)
    course["lesson_count"] = sum(len(s["lessons"]) for s in course["sections"])
    course["viewer"] = {
        "authenticated": bool(viewer),
        "enrolled": bool(enrolled),
        "is_owner": bool(is_owner),
        "role": viewer["role"] if viewer else None,
    }

    # preview-limited curriculum for anonymous visitors
    if not enrolled and not is_owner:
        for sec in course["sections"]:
            for les in sec["lessons"]:
                if not les.get("is_preview"):
                    les["locked"] = True
                    les["video_url"] = None
                    les["content"] = None
                    les["resource_url"] = None
    return ok({"course": course})


# ---------------------------------------------------------------------------
# Instructor CRUD
# ---------------------------------------------------------------------------

COURSE_FIELDS = ("title", "category_id", "description", "short_description", "thumbnail_url",
                 "price", "discount_price", "level", "language", "requirements",
                 "what_you_will_learn", "duration_minutes")


@course_bp.post("/courses")
@require_approved_instructor
def create_course():
    try:
        data = validate_course_payload(body(request))
        payload = {k: data[k] for k in COURSE_FIELDS if k in data}
        payload["instructor_id"] = g.user.id
        payload["slug"] = slugify(payload["title"])
        payload["status"] = "draft"
        res = sb().table("courses").insert(payload).execute()
        return ok({"course": first_row(res)}, status=201, message="Course created (draft)")
    except ValueError as exc:
        return fail(str(exc), 400)


@course_bp.put("/courses/<course_id>")
@require_auth
def update_course(course_id):
    course = get_course(course_id)
    if not course:
        return fail("Course not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    try:
        data = validate_course_payload(body(request), partial=True)
        payload = {k: data[k] for k in COURSE_FIELDS if k in data}
        # students-visible fields reset moderation state back to draft when edited
        if course["status"] == "published" and g.profile["role"] != "admin":
            payload["status"] = "draft"
        if not payload:
            return fail("Nothing to update")
        sb().table("courses").update(payload).eq("id", course_id).execute()
        return ok({"course": get_course(course_id)}, message="Course updated")
    except ValueError as exc:
        return fail(str(exc), 400)


@course_bp.delete("/courses/<course_id>")
@require_auth
def delete_course(course_id):
    course = get_course(course_id)
    if not course:
        return fail("Course not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only delete your own courses", 403)
    if g.profile["role"] != "admin" and course["status"] not in ("draft", "rejected"):
        return fail("Only draft or rejected courses can be deleted", 400)
    sb().table("courses").delete().eq("id", course_id).execute()
    return ok({"message": "Course deleted"})


@course_bp.post("/courses/<course_id>/submit")
@require_auth
def submit_course(course_id):
    course = get_course(course_id)
    if not course:
        return fail("Course not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only submit your own courses", 403)
    if course["status"] == "published":
        return fail("Course is already published")
    if count_lessons(course_id) < 1:
        return fail("Add at least one section with one lesson before submitting")
    sb().table("courses").update({"status": "pending", "rejection_reason": None}) \
        .eq("id", course_id).execute()
    # notify admins
    admins = sb().table("profiles").select("id").eq("role", "admin").execute().data or []
    from services.supabase_service import notify
    for a in admins:
        notify(a["id"], "Course awaiting review", f"“{course['title']}” was submitted for approval.")
    return ok({"message": "Course submitted for review"})


# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------

@course_bp.post("/courses/<course_id>/sections")
@require_auth
def create_section(course_id):
    course = get_course(course_id)
    if not course:
        return fail("Course not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    try:
        data = body(request)
        required(data, "title")
        str_len(data["title"], "title", 2, 160, allow_none=False)
        highest = (sb().table("sections").select("position").eq("course_id", course_id)
                   .order("position", desc=True).limit(1).execute().data or [{}])
        position = (highest[0].get("position") or 0) + 1
        res = sb().table("sections").insert({
            "course_id": course_id,
            "title": data["title"].strip(),
            "description": data.get("description"),
            "position": as_int(data.get("position"), "position") or position,
        }).execute()
        return ok({"section": first_row(res)}, status=201, message="Section added")
    except ValueError as exc:
        return fail(str(exc), 400)


def _section_course(section_id):
    sec = first_row(sb().table("sections").select("*").eq("id", section_id).execute())
    if not sec:
        return None, None
    return sec, get_course(sec["course_id"])


@course_bp.put("/sections/<section_id>")
@require_auth
def update_section(section_id):
    sec, course = _section_course(section_id)
    if not course:
        return fail("Section not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    try:
        data = body(request)
        update = {}
        if "title" in data:
            str_len(data["title"], "title", 2, 160, allow_none=False)
            update["title"] = data["title"].strip()
        if "description" in data:
            update["description"] = data["description"]
        if "position" in data:
            update["position"] = as_int(data["position"], "position", 0)
        if not update:
            return fail("Nothing to update")
        sb().table("sections").update(update).eq("id", section_id).execute()
        return ok({"message": "Section updated"})
    except ValueError as exc:
        return fail(str(exc), 400)


@course_bp.delete("/sections/<section_id>")
@require_auth
def delete_section(section_id):
    sec, course = _section_course(section_id)
    if not course:
        return fail("Section not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    sb().table("sections").delete().eq("id", section_id).execute()
    return ok({"message": "Section deleted"})


# ---------------------------------------------------------------------------
# Categories & featured instructors
# ---------------------------------------------------------------------------

@course_bp.get("/categories")
def list_categories():
    res = sb().table("categories").select("*").order("name").execute()
    counts = {}
    for row in (sb().table("courses").select("category_id").eq("status", "published").execute().data or []):
        if row.get("category_id"):
            counts[row["category_id"]] = counts.get(row["category_id"], 0) + 1
    for c in res.data or []:
        c["course_count"] = counts.get(c["id"], 0)
    return ok({"items": res.data or []})


@course_bp.get("/instructors/featured")
def featured_instructors():
    res = (sb().table("profiles").select("id, full_name, bio, avatar_url")
           .eq("role", "instructor").eq("is_approved", True).limit(40).execute())
    instructors = res.data or []
    if not instructors:
        return ok({"items": []})
    ids = [i["id"] for i in instructors]
    courses = (sb().table("courses").select("id, instructor_id").eq("status", "published")
               .in_("instructor_id", ids).execute().data or [])
    course_ids = [c["id"] for c in courses]
    counts = {}
    if course_ids:
        enrolls = (sb().table("enrollments").select("course_id")
                   .in_("course_id", course_ids).execute().data or [])
        course_map = {c["id"]: c["instructor_id"] for c in courses}
        for e in enrolls:
            counts[course_map[e["course_id"]]] = counts.get(course_map[e["course_id"]], 0) + 1
    course_count = {}
    for c in courses:
        course_count[c["instructor_id"]] = course_count.get(c["instructor_id"], 0) + 1
    for i in instructors:
        i["students_count"] = counts.get(i["id"], 0)
        i["courses_count"] = course_count.get(i["id"], 0)
    instructors.sort(key=lambda i: i["students_count"], reverse=True)
    return ok({"items": instructors[:4]})
