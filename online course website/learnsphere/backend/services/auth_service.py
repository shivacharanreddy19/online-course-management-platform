"""
Authentication business logic — wraps Supabase Auth so the frontend never
needs the service-role key (or even the anon key) to authenticate.
"""
from config import get_supabase
from utils.helpers import first_row


def register_user(email: str, password: str, full_name: str, role: str):
    """Create an auth.users row + matching profile.

    role: 'student' | 'instructor'  (admin can NEVER be created here)
    """
    role = "instructor" if role == "instructor" else "student"
    sb = get_supabase()

    res = sb.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,                    # no email confirmation needed in dev
        "user_metadata": {"full_name": full_name, "role": role},
    })
    user = getattr(res, "user", None)
    if user is None:
        raise ValueError("Could not create account — the email may already be registered")

    # The on_auth_user_created trigger normally creates the profile;
    # upsert here as a backstop so registration never leaves a user stranded.
    sb.table("profiles").upsert({
        "id": user.id,
        "email": email,
        "full_name": full_name,
        "role": role,
        "is_approved": role != "instructor",
    }, on_conflict="id").execute()

    return user


def login_user(email: str, password: str):
    """Sign in and return (session_dict, profile_dict)."""
    sb = get_supabase()
    try:
        res = sb.auth.sign_in_with_password({"email": email, "password": password})
    except Exception:
        raise ValueError("Invalid email or password")
    session = getattr(res, "session", None)
    user = getattr(res, "user", None)
    if not session or not user:
        raise ValueError("Invalid email or password")
    return session_to_dict(session), get_profile(user.id)


def session_to_dict(session):
    return {
        "access_token": session.access_token,
        "refresh_token": session.refresh_token,
        "expires_at": getattr(session, "expires_at", None),
        "token_type": getattr(session, "token_type", "bearer"),
    }


def refresh_session(refresh_token: str):
    sb = get_supabase()
    try:
        res = sb.auth.refresh_session(refresh_token)
    except Exception:
        raise ValueError("Could not refresh session — please log in again")
    session = getattr(res, "session", None)
    if not session:
        raise ValueError("Could not refresh session — please log in again")
    return session_to_dict(session)


def get_profile(user_id: str):
    res = get_supabase().table("profiles").select("*").eq("id", user_id).limit(1).execute()
    return first_row(res)


def request_password_reset(email: str, redirect_to: str):
    """Send Supabase's recovery email. The PKCE code-verifier is kept inside
    this singleton gotrue client, so /api/auth/exchange can later swap the
    emailed code for a session server-side."""
    try:
        get_supabase().auth.reset_password_for_email(
            email, {"redirect_to": redirect_to}
        )
    except TypeError:
        # older gotrue signature without options
        get_supabase().auth.reset_password_for_email(email)


def exchange_code_for_session(code: str):
    sb = get_supabase()
    try:
        res = sb.auth.exchange_code_for_session({"auth_code": code})
    except Exception:
        raise ValueError("Reset link is invalid or has expired — request a new one")
    session = getattr(res, "session", None)
    if not session:
        raise ValueError("Reset link is invalid or has expired — request a new one")
    return session_to_dict(session)


def reset_password(access_token: str, new_password: str):
    sb = get_supabase()
    res = sb.auth.get_user(access_token)
    user = getattr(res, "user", None)
    if user is None:
        raise ValueError("Reset link is invalid or has expired — request a new one")
    sb.auth.admin.update_user_by_id(user.id, {"password": new_password})
