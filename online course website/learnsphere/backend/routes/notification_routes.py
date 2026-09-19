"""
Notifications (+ public announcements feed).

GET /api/notifications               my notifications (newest first, unread_count)
PUT /api/notifications/<id>/read     mark one read
PUT /api/notifications/read-all      mark all read
GET /api/announcements               public announcement feed
"""
from flask import Blueprint, g

from services.supabase_service import sb
from utils.decorators import require_auth
from utils.helpers import ok, fail, first_row

notification_bp = Blueprint("notifications", __name__)


@notification_bp.get("/notifications")
@require_auth
def list_notifications():
    res = (sb().table("notifications").select("*").eq("user_id", g.user.id)
           .order("created_at", desc=True).limit(50).execute())
    items = res.data or []
    unread = sum(1 for n in items if not n.get("is_read"))
    return ok({"items": items, "unread_count": unread})


@notification_bp.put("/notifications/<notif_id>/read")
@require_auth
def mark_read(notif_id):
    sb().table("notifications").update({"is_read": True}) \
        .eq("id", notif_id).eq("user_id", g.user.id).execute()
    return ok({"message": "Marked as read"})


@notification_bp.put("/notifications/read-all")
@require_auth
def mark_all_read():
    sb().table("notifications").update({"is_read": True}) \
        .eq("user_id", g.user.id).eq("is_read", False).execute()
    return ok({"message": "All caught up"})


@notification_bp.get("/announcements")
def announcements():
    res = (sb().table("announcements").select("*")
           .order("created_at", desc=True).limit(20).execute())
    return ok({"items": res.data or []})
