"""
Authentication & authorization decorators.

@require_auth
    Verifies the `Authorization: Bearer <jwt>` header against Supabase Auth,
    loads the caller's profile into flask.g, then runs the endpoint.

@require_role("admin") / @require_role("instructor", "admin")
    Must be stacked UNDER @require_auth. Rejects callers whose profile role
    is not in the allowed list (403).

@optional_auth
    Attaches g.user/g.profile when a valid token is present, but never
    rejects anonymous visitors (used for public course pages).
"""
from functools import wraps

from flask import g, request

from config import get_supabase
from utils.helpers import fail, first_row


def _load_profile(user_id: str):
    res = (
        get_supabase()
        .table("profiles")
        .select("*")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    return first_row(res)


def _authenticate():
    """Return (user, profile) or raise ValueError."""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise ValueError("Missing or malformed Authorization header")
    token = header.split(" ", 1)[1].strip()
    if not token:
        raise ValueError("Missing access token")
    try:
        res = get_supabase().auth.get_user(token)
    except Exception:
        raise ValueError("Invalid or expired session — please log in again")
    user = getattr(res, "user", None)
    if user is None:
        raise ValueError("Invalid or expired session — please log in again")
    profile = _load_profile(user.id)
    if profile is None:
        # Profile row missing (e.g. created before schema trigger) — auto-heal.
        get_supabase().table("profiles").upsert({
            "id": user.id,
            "email": user.email,
            "full_name": (user.user_metadata or {}).get("full_name")
                          or (user.email or "").split("@")[0],
            "role": "student",
        }, on_conflict="id").execute()
        profile = _load_profile(user.id)
    return user, profile


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            g.user, g.profile = _authenticate()
        except ValueError as exc:
            return fail(str(exc), 401)
        except RuntimeError as exc:          # Supabase not configured
            return fail(str(exc), 503)
        return fn(*args, **kwargs)
    return wrapper


def require_role(*roles):
    def decorator(fn):
        @wraps(fn)
        @require_auth
        def wrapper(*args, **kwargs):
            if g.profile.get("role") not in roles:
                return fail("Permission denied — insufficient role", 403)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def require_approved_instructor(fn):
    """Instructors must be approved by an admin before creating content.
    Admins are always allowed."""
    @wraps(fn)
    @require_auth
    def wrapper(*args, **kwargs):
        role = g.profile.get("role")
        if role == "admin":
            return fn(*args, **kwargs)
        if role != "instructor":
            return fail("Only instructors can perform this action", 403)
        if not g.profile.get("is_approved"):
            return fail("Your instructor account is awaiting admin approval", 403)
        return fn(*args, **kwargs)
    return wrapper


def optional_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        g.user = None
        g.profile = None
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            try:
                g.user, g.profile = _authenticate()
            except Exception:
                g.user, g.profile = None, None
        return fn(*args, **kwargs)
    return wrapper
