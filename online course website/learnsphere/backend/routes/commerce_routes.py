"""
Wishlist + cart.

GET    /api/wishlist               my wishlist (+ courses)
POST   /api/wishlist               {course_id}
DELETE /api/wishlist/<course_id>

GET    /api/cart                   my cart (+ courses, subtotal/discount/total)
POST   /api/cart                   {course_id}
DELETE /api/cart/<course_id>
"""
from flask import Blueprint, g, request

from services.supabase_service import sb, get_course, is_enrolled
from services.course_service import attach_course_meta, effective_price
from utils.decorators import require_auth
from utils.helpers import ok, fail
from utils.validators import body, required

commerce_bp = Blueprint("commerce", __name__)


def _hydrate(table, user_id):
    res = (sb().table(table).select("id, course_id, created_at"
                                    if table == "cart_items" else "id, course_id")
           .eq("student_id", user_id).execute())
    rows = res.data or []
    course_ids = [r["course_id"] for r in rows]
    courses = []
    if course_ids:
        courses = attach_course_meta(
            sb().table("courses").select("*").in_("id", course_ids).execute().data or [])
    cmap = {c["id"]: c for c in courses}
    for r in rows:
        r["course"] = cmap.get(r["course_id"])
    return rows


# --------------------------------------------------------------------------
# Wishlist
# --------------------------------------------------------------------------

@commerce_bp.get("/wishlist")
@require_auth
def wishlist_get():
    return ok({"items": _hydrate("wishlists", g.user.id)})


@commerce_bp.post("/wishlist")
@require_auth
def wishlist_add():
    try:
        data = body(request)
        required(data, "course_id")
        course_id = str(data["course_id"])
        course = get_course(course_id)
        if not course or course["status"] != "published":
            return fail("Course not available", 404)
        existing = sb().table("wishlists").select("id").eq("student_id", g.user.id) \
            .eq("course_id", course_id).execute().data or []
        if existing:
            return fail("Already in your wishlist", 409)
        sb().table("wishlists").insert({
            "student_id": g.user.id, "course_id": course_id}).execute()
        return ok({"message": "Saved to wishlist"}, status=201)
    except ValueError as exc:
        return fail(str(exc), 400)


@commerce_bp.delete("/wishlist/<course_id>")
@require_auth
def wishlist_remove(course_id):
    sb().table("wishlists").delete().eq("student_id", g.user.id) \
        .eq("course_id", course_id).execute()
    return ok({"message": "Removed from wishlist"})


# --------------------------------------------------------------------------
# Cart
# --------------------------------------------------------------------------

@commerce_bp.get("/cart")
@require_auth
def cart_get():
    items = _hydrate("cart_items", g.user.id)
    subtotal = discount = total = 0.0
    for it in items:
        c = it.get("course")
        if not c:
            continue
        price = float(c.get("price") or 0)
        eff = effective_price(c)
        subtotal += price
        discount += max(0.0, price - eff)
        total += eff
    return ok({"items": items, "summary": {
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "total": round(total, 2),
        "count": len(items),
    }})


@commerce_bp.post("/cart")
@require_auth
def cart_add():
    try:
        data = body(request)
        required(data, "course_id")
        course_id = str(data["course_id"])
        course = get_course(course_id)
        if not course or course["status"] != "published":
            return fail("Course not available", 404)
        if course["instructor_id"] == g.user.id:
            return fail("You cannot buy your own course", 400)
        if is_enrolled(g.user.id, course_id):
            return fail("You already own this course", 409)
        existing = sb().table("cart_items").select("id").eq("student_id", g.user.id) \
            .eq("course_id", course_id).execute().data or []
        if existing:
            return fail("Already in your cart", 409)
        sb().table("cart_items").insert({
            "student_id": g.user.id, "course_id": course_id}).execute()
        return ok({"message": "Added to cart"}, status=201)
    except ValueError as exc:
        return fail(str(exc), 400)


@commerce_bp.delete("/cart/<course_id>")
@require_auth
def cart_remove(course_id):
    sb().table("cart_items").delete().eq("student_id", g.user.id) \
        .eq("course_id", course_id).execute()
    return ok({"message": "Removed from cart"})
