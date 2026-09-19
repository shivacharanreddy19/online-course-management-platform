"""
Orders & checkout (mock payment mode).

POST /api/orders        checkout — converts the caller's cart into a paid order
                        + enrollments (mock payment; see services/payment_service.py)
GET  /api/orders        my order history (+ items + courses)
"""
from flask import Blueprint, g, request

from services.payment_service import checkout
from services.supabase_service import sb
from utils.decorators import require_auth
from utils.helpers import ok, fail

payment_bp = Blueprint("payments", __name__)


@payment_bp.post("")
@require_auth
def create_order():
    data = request.get_json(silent=True) or {}
    method = data.get("payment_method") or "mock_card"
    if method not in ("mock_card", "mock_upi", "mock_wallet"):
        method = "mock_card"
    try:
        order = checkout(g.profile, method)
        return ok({"order": order}, status=201,
                  message="Payment successful — you're enrolled!")
    except ValueError as exc:
        return fail(str(exc), 400)


@payment_bp.get("")
@require_auth
def list_orders():
    res = (sb().table("orders").select("*").eq("student_id", g.user.id)
           .order("created_at", desc=True).execute())
    orders = res.data or []
    if orders:
        items = (sb().table("order_items").select("*")
                 .in_("order_id", [o["id"] for o in orders]).execute().data or [])
        course_ids = list({i["course_id"] for i in items})
        courses = {}
        if course_ids:
            for c in (sb().table("courses").select("id, title, thumbnail_url")
                      .in_("id", course_ids).execute().data or []):
                courses[c["id"]] = c
        by_order = {}
        for i in items:
            i["course"] = courses.get(i["course_id"])
            by_order.setdefault(i["order_id"], []).append(i)
        for o in orders:
            o["items"] = by_order.get(o["id"], [])
    return ok({"items": orders})
