"""
Authentication endpoints. The frontend talks ONLY to these — the service
role key never leaves the server.

POST /api/auth/register         {email, password, full_name, role?}
POST /api/auth/login            {email, password}
POST /api/auth/logout           (client-side token discard; endpoint for parity)
POST /api/auth/refresh          {refresh_token}
GET  /api/auth/me               [auth]
PUT  /api/auth/profile          [auth] {full_name?, phone?, bio?, avatar_url?}
POST /api/auth/forgot-password  {email}
POST /api/auth/exchange         {code}        (PKCE reset-link exchange)
PUT  /api/auth/reset-password   {access_token, password}
PUT  /api/auth/password         [auth] {password}
"""
from flask import Blueprint, g, request, current_app

from config import FRONTEND_URL
from services import auth_service
from services.supabase_service import sb
from utils.decorators import require_auth
from utils.helpers import ok, fail
from utils.validators import body, required, str_len, valid_email

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    try:
        data = body(request)
        required(data, "email", "password", "full_name")
        email = str(data["email"]).strip().lower()
        if not valid_email(email):
            raise ValueError("Please enter a valid email address")
        if len(str(data["password"])) < 6:
            raise ValueError("Password must be at least 6 characters")
        str_len(data["full_name"], "full_name", 2, 120, allow_none=False)
        role = "instructor" if data.get("role") == "instructor" else "student"

        user = auth_service.register_user(email, str(data["password"]),
                                          str(data["full_name"]).strip(), role)
        # Auto-login right after registration
        session, profile = auth_service.login_user(email, str(data["password"]))
        return ok({"session": session, "profile": profile,
                   "instructor_pending": role == "instructor"},
                  status=201, message="Account created")
    except ValueError as exc:
        return fail(str(exc), 400)
    except Exception as exc:
        current_app.logger.exception(exc)
        err_msg = str(exc)
        if "already" in err_msg.lower() or "unique" in err_msg.lower() or "registered" in err_msg.lower():
            return fail("This email is already registered. Please log in instead.", 400)
        return fail(err_msg or "Registration failed. Please try again.", 400)


@auth_bp.post("/login")
def login():
    try:
        data = body(request)
        required(data, "email", "password")
        session, profile = auth_service.login_user(
            str(data["email"]).strip().lower(), str(data["password"]))
        return ok({"session": session, "profile": profile}, message="Welcome back")
    except ValueError as exc:
        return fail(str(exc), 401)


@auth_bp.post("/logout")
def logout():
    # Sessions are stateless JWTs — the client discards its stored tokens.
    return ok({"message": "Logged out"})


@auth_bp.post("/refresh")
def refresh():
    try:
        data = body(request)
        required(data, "refresh_token")
        return ok({"session": auth_service.refresh_session(str(data["refresh_token"]))})
    except ValueError as exc:
        return fail(str(exc), 401)


@auth_bp.get("/me")
@require_auth
def me():
    return ok({"profile": g.profile})


@auth_bp.put("/profile")
@require_auth
def update_profile():
    try:
        data = body(request)
        update = {}
        if "full_name" in data:
            str_len(data["full_name"], "full_name", 2, 120, allow_none=False)
            update["full_name"] = data["full_name"].strip()
        for f, maxn in (("phone", 30), ("bio", 1200), ("avatar_url", 800)):
            if f in data:
                str_len(data[f], f, 0, maxn)
                update[f] = data[f]
        if not update:
            return fail("Nothing to update")
        # role / is_approved are deliberately NOT updatable here
        sb().table("profiles").update(update).eq("id", g.user.id).execute()
        return ok({"profile": auth_service.get_profile(g.user.id)}, message="Profile updated")
    except ValueError as exc:
        return fail(str(exc), 400)


@auth_bp.post("/forgot-password")
def forgot_password():
    try:
        data = body(request)
        required(data, "email")
        redirect_to = f"{FRONTEND_URL}/login.html"
        auth_service.request_password_reset(str(data["email"]).strip().lower(), redirect_to)
        # Always the same response — never reveal whether an email exists
        return ok({"message": "If that email is registered, a reset link is on its way."})
    except ValueError as exc:
        return fail(str(exc), 400)


@auth_bp.post("/exchange")
def exchange():
    try:
        data = body(request)
        required(data, "code")
        return ok({"session": auth_service.exchange_code_for_session(str(data["code"]))})
    except ValueError as exc:
        return fail(str(exc), 400)


@auth_bp.put("/reset-password")
def reset_password():
    try:
        data = body(request)
        required(data, "access_token", "password")
        if len(str(data["password"])) < 6:
            raise ValueError("Password must be at least 6 characters")
        auth_service.reset_password(str(data["access_token"]), str(data["password"]))
        return ok({"message": "Password updated — you can log in now"})
    except ValueError as exc:
        return fail(str(exc), 400)


@auth_bp.put("/password")
@require_auth
def change_password():
    try:
        data = body(request)
        required(data, "password")
        if len(str(data["password"])) < 6:
            raise ValueError("Password must be at least 6 characters")
        sb().auth.admin.update_user_by_id(g.user.id, {"password": str(data["password"])})
        return ok({"message": "Password changed"})
    except ValueError as exc:
        return fail(str(exc), 400)
