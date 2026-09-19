"""
Admin control room.

GET    /api/admin/statistics
GET    /api/admin/users?role=&q=&page=
PUT    /api/admin/users/<id>            {role?, is_approved?}
DELETE /api/admin/users/<id>
GET    /api/admin/instructors?approved=false
PUT    /api/admin/instructors/<id>/approve
GET    /api/admin/courses?status=&q=&page=
PUT    /api/admin/courses/<id>/approve
PUT    /api/admin/courses/<id>/reject   {reason}
GET/POST/PUT/DELETE /api/admin/categories[/<id>]
GET    /api/admin/reviews · DELETE /api/admin/reviews/<id>
GET    /api/admin/orders
GET    /api/admin/certificates
GET/POST /api/admin/announcements · DELETE /api/admin/announcements/<id>
"""
from flask import Blueprint, g, request

from services.supabase_service import sb, get_course, notify
from services.course_service import attach_course_meta
from utils.decorators import require_role
from utils.helpers import ok, fail, first_row, page_params, paged, sanitize_search
from utils.validators import body, required, str_len

admin_bp = Blueprint("admin", __name__)


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------

@admin_bp.get("/statistics")
@require_role("admin")
def statistics():
    def count(table, **eq):
        q = sb().table(table).select("id", count="exact")
        for k, v in eq.items():
            q = q.eq(k, v)
        return q.execute().count or 0

    profiles = sb().table("profiles").select("id, role, created_at").execute().data or []
    orders = sb().table("orders").select("id, total_amount, payment_status, created_at") \
        .eq("payment_status", "paid").execute().data or []
    enrolls = sb().table("enrollments").select("id, enrolled_at, completed").execute().data or []

    revenue = round(sum(float(o.get("total_amount") or 0) for o in orders), 2)

    from collections import Counter
    users_by_month = Counter((p.get("created_at") or "")[:7] for p in profiles if p.get("created_at"))
    revenue_by_month = Counter()
    for o in orders:
        key = (o.get("created_at") or "")[:7]
        if key:
            revenue_by_month[key] += float(o.get("total_amount") or 0)

    # top courses by enrollments, top instructors by students
    top_courses = []
    course_counts = Counter()
    enroll_rows = sb().table("enrollments").select("course_id").execute().data or []
    for e in enroll_rows:
        course_counts[e["course_id"]] += 1
    if course_counts:
        rows = sb().table("courses").select("id, title, instructor_id") \
            .in_("id", [cid for cid, _ in course_counts.most_common(5)]).execute().data or []
        for c in rows:
            c["students_count"] = course_counts[c["id"]]
        top_courses = sorted(rows, key=lambda c: c["students_count"], reverse=True)

    return ok({
        "total_users": len(profiles),
        "students": sum(1 for p in profiles if p["role"] == "student"),
        "instructors": sum(1 for p in profiles if p["role"] == "instructor"),
        "pending_instructors": count("profiles", role="instructor", is_approved=False),
        "total_courses": count("courses"),
        "published_courses": count("courses", status="published"),
        "pending_courses": count("courses", status="pending"),
        "total_enrollments": len(enrolls),
        "completion_rate": round(100.0 * sum(1 for e in enrolls if e.get("completed")) / len(enrolls), 1) if enrolls else 0,
        "revenue": revenue,
        "certificates_issued": count("certificates"),
        "total_reviews": count("reviews"),
        "users_by_month": dict(sorted(users_by_month.items())),
        "revenue_by_month": {k: round(v, 2) for k, v in sorted(revenue_by_month.items())},
        "top_courses": top_courses,
    })


# ---------------------------------------------------------------------------
# Users & instructors
# ---------------------------------------------------------------------------

@admin_bp.get("/users")
@require_role("admin")
def users():
    page, per, start, end = page_params(default_per=10)
    q = sanitize_search(request.args.get("q", ""))
    role = request.args.get("role", "")
    query = sb().table("profiles").select("*", count="exact")
    if role in ("student", "instructor", "admin"):
        query = query.eq("role", role)
    if q:
        query = query.or_(f"full_name.ilike.%{q}%,email.ilike.%{q}%")
    res = query.order("created_at", desc=True).range(start, end).execute()
    return ok(paged(res.data, res.count, page, per))


@admin_bp.put("/users/<user_id>")
@require_role("admin")
def update_user(user_id):
    if user_id == g.user.id:
        return fail("You cannot change your own role here", 400)
    try:
        data = body(request)
        update = {}
        if "role" in data:
            if data["role"] not in ("student", "instructor", "admin"):
                raise ValueError("Invalid role")
            update["role"] = data["role"]
        if "is_approved" in data:
            update["is_approved"] = bool(data["is_approved"])
        if "full_name" in data:
            str_len(data["full_name"], "full_name", 2, 120, allow_none=False)
            update["full_name"] = data["full_name"].strip()
        if not update:
            return fail("Nothing to update")
        sb().table("profiles").update(update).eq("id", user_id).execute()
        return ok({"message": "User updated"})
    except ValueError as exc:
        return fail(str(exc), 400)


@admin_bp.delete("/users/<user_id>")
@require_role("admin")
def delete_user(user_id):
    if user_id == g.user.id:
        return fail("You cannot delete your own account", 400)
    sb().table("profiles").delete().eq("id", user_id).execute()
    try:  # also remove the auth user so the email becomes reusable
        sb().auth.admin.delete_user(user_id)
    except Exception:
        pass
    return ok({"message": "User deleted"})


@admin_bp.get("/instructors")
@require_role("admin")
def instructors():
    approved = request.args.get("approved", "")
    query = sb().table("profiles").select("*").eq("role", "instructor")
    if approved == "false":
        query = query.eq("is_approved", False)
    elif approved == "true":
        query = query.eq("is_approved", True)
    res = query.order("created_at", desc=True).execute()
    return ok({"items": res.data or []})


@admin_bp.put("/instructors/<user_id>/approve")
@require_role("admin")
def approve_instructor(user_id):
    profile = first_row(sb().table("profiles").select("*").eq("id", user_id).execute())
    if not profile or profile["role"] != "instructor":
        return fail("Instructor not found", 404)
    sb().table("profiles").update({"is_approved": True}).eq("id", user_id).execute()
    notify(user_id, "Instructor account approved ✅",
           "You can now create and submit courses. Welcome aboard!")
    return ok({"message": f"{profile.get('full_name') or 'Instructor'} approved"})


# ---------------------------------------------------------------------------
# Course moderation
# ---------------------------------------------------------------------------

@admin_bp.get("/courses")
@require_role("admin")
def admin_courses():
    page, per, start, end = page_params(default_per=10)
    status = request.args.get("status", "")
    q = sanitize_search(request.args.get("q", ""))
    query = sb().table("courses").select("*", count="exact")
    if status in ("draft", "pending", "published", "rejected"):
        query = query.eq("status", status)
    if q:
        query = query.ilike("title", f"%{q}%")
    res = query.order("updated_at", desc=True).range(start, end).execute()
    data = paged(attach_course_meta(res.data or []), res.count, page, per)
    return ok(data)


@admin_bp.put("/courses/<course_id>/approve")
@require_role("admin")
def approve_course(course_id):
    course = get_course(course_id)
    if not course:
        return fail("Course not found", 404)
    sb().table("courses").update({"status": "published", "rejection_reason": None}) \
        .eq("id", course_id).execute()
    notify(course["instructor_id"], "Course approved 🎉",
           f"“{course['title']}” is now published and visible to students.")
    return ok({"message": "Course published"})


@admin_bp.put("/courses/<course_id>/reject")
@require_role("admin")
def reject_course(course_id):
    course = get_course(course_id)
    if not course:
        return fail("Course not found", 404)
    try:
        data = body(request)
        reason = (data.get("reason") or "").strip() or "Does not meet quality guidelines."
        str_len(reason, "reason", 0, 1000)
        sb().table("courses").update({"status": "rejected", "rejection_reason": reason}) \
            .eq("id", course_id).execute()
        notify(course["instructor_id"], "Course returned for changes",
               f"“{course['title']}” was rejected: {reason}")
        return ok({"message": "Course rejected"})
    except ValueError as exc:
        return fail(str(exc), 400)


# ---------------------------------------------------------------------------
# Categories
# ---------------------------------------------------------------------------

@admin_bp.get("/categories")
@require_role("admin")
def admin_categories():
    res = sb().table("categories").select("*").order("name").execute()
    return ok({"items": res.data or []})


@admin_bp.post("/categories")
@require_role("admin")
def create_category():
    try:
        data = body(request)
        required(data, "name")
        str_len(data["name"], "name", 2, 80, allow_none=False)
        res = sb().table("categories").insert({
            "name": data["name"].strip(),
            "description": data.get("description"),
            "image_url": data.get("image_url"),
        }).execute()
        return ok({"category": first_row(res)}, status=201, message="Category created")
    except ValueError as exc:
        return fail(str(exc), 400)
    except Exception:
        return fail("A category with this name may already exist", 409)


@admin_bp.put("/categories/<cat_id>")
@require_role("admin")
def update_category(cat_id):
    try:
        data = body(request)
        update = {f: data[f] for f in ("name", "description", "image_url") if f in data}
        if "name" in update:
            str_len(update["name"], "name", 2, 80, allow_none=False)
        if not update:
            return fail("Nothing to update")
        sb().table("categories").update(update).eq("id", cat_id).execute()
        return ok({"message": "Category updated"})
    except ValueError as exc:
        return fail(str(exc), 400)


@admin_bp.delete("/categories/<cat_id>")
@require_role("admin")
def delete_category(cat_id):
    used = sb().table("courses").select("id", count="exact").eq("category_id", cat_id).execute()
    if (used.count or 0) > 0:
        return fail(f"{used.count} course(s) use this category — reassign them first", 409)
    sb().table("categories").delete().eq("id", cat_id).execute()
    return ok({"message": "Category deleted"})


# ---------------------------------------------------------------------------
# Reviews / orders / certificates / announcements
# ---------------------------------------------------------------------------

@admin_bp.get("/reviews")
@require_role("admin")
def admin_reviews():
    page, per, start, end = page_params(default_per=10)
    res = (sb().table("reviews").select("*", count="exact")
           .order("created_at", desc=True).range(start, end).execute())
    rows = res.data or []
    students = {p["id"]: p for p in
                sb().table("profiles").select("id, full_name")
                .in_("id", list({r["student_id"] for r in rows}) or ["00000000-0000-0000-0000-000000000000"])
                .execute().data or []}
    courses = {c["id"]: c for c in
               sb().table("courses").select("id, title")
               .in_("id", list({r["course_id"] for r in rows}) or ["00000000-0000-0000-0000-000000000000"])
               .execute().data or []}
    for r in rows:
        r["student"] = students.get(r["student_id"])
        r["course"] = courses.get(r["course_id"])
    return ok(paged(rows, res.count, page, per))


@admin_bp.delete("/reviews/<review_id>")
@require_role("admin")
def admin_delete_review(review_id):
    sb().table("reviews").delete().eq("id", review_id).execute()
    return ok({"message": "Review removed"})


@admin_bp.get("/orders")
@require_role("admin")
def admin_orders():
    page, per, start, end = page_params(default_per=10)
    res = (sb().table("orders").select("*", count="exact")
           .order("created_at", desc=True).range(start, end).execute())
    orders = res.data or []
    students = {p["id"]: p for p in
                sb().table("profiles").select("id, full_name, email")
                .in_("id", list({o["student_id"] for o in orders}) or ["00000000-0000-0000-0000-000000000000"])
                .execute().data or []}
    if orders:
        items = sb().table("order_items").select("*") \
            .in_("order_id", [o["id"] for o in orders]).execute().data or []
        by_order = {}
        for i in items:
            by_order.setdefault(i["order_id"], 0)
            by_order[i["order_id"]] += 1
    else:
        by_order = {}
    for o in orders:
        o["student"] = students.get(o["student_id"])
        o["item_count"] = by_order.get(o["id"], 0)
    return ok(paged(orders, res.count, page, per))


@admin_bp.get("/certificates")
@require_role("admin")
def admin_certificates():
    page, per, start, end = page_params(default_per=10)
    res = (sb().table("certificates").select("*", count="exact")
           .order("issued_at", desc=True).range(start, end).execute())
    certs = res.data or []
    students = {p["id"]: p for p in
                sb().table("profiles").select("id, full_name")
                .in_("id", list({c["student_id"] for c in certs}) or ["00000000-0000-0000-0000-000000000000"])
                .execute().data or []}
    courses = {c["id"]: c for c in
               sb().table("courses").select("id, title")
               .in_("id", list({c["course_id"] for c in certs}) or ["00000000-0000-0000-0000-000000000000"])
               .execute().data or []}
    for c in certs:
        c["student"] = students.get(c["student_id"])
        c["course"] = courses.get(c["course_id"])
    return ok(paged(certs, res.count, page, per))


@admin_bp.get("/announcements")
@require_role("admin")
def admin_announcements():
    res = sb().table("announcements").select("*").order("created_at", desc=True).execute()
    return ok({"items": res.data or []})


@admin_bp.post("/announcements")
@require_role("admin")
def create_announcement():
    try:
        data = body(request)
        required(data, "title", "message")
        str_len(data["title"], "title", 2, 200, allow_none=False)
        str_len(data["message"], "message", 2, 4000, allow_none=False)

        res = sb().table("announcements").insert({
            "title": data["title"].strip(),
            "message": data["message"].strip(),
            "created_by": g.user.id,
        }).execute()

        # fan out to every user's notifications
        profiles = sb().table("profiles").select("id").execute().data or []
        rows = [{"user_id": p["id"], "title": f"📢 {data['title'].strip()}",
                 "message": data["message"].strip()} for p in profiles]
        for i in range(0, len(rows), 500):
            sb().table("notifications").insert(rows[i:i + 500]).execute()

        return ok({"announcement": first_row(res), "notified": len(rows)},
                  status=201, message="Announcement sent to all users")
    except ValueError as exc:
        return fail(str(exc), 400)


@admin_bp.delete("/announcements/<ann_id>")
@require_role("admin")
def delete_announcement(ann_id):
    sb().table("announcements").delete().eq("id", ann_id).execute()
    return ok({"message": "Announcement deleted"})
