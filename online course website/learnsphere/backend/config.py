"""
LearnSphere — central configuration.

Loads environment variables and exposes ONE reusable Supabase client
(service-role). Every database operation in the backend goes through
get_supabase() — do not create additional clients in route files.
"""
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5500").rstrip("/")
PAYMENT_MODE = os.getenv("PAYMENT_MODE", "mock").lower()

# Storage buckets the upload endpoint is allowed to write to
ALLOWED_BUCKETS = {
    "course-thumbnails",
    "course-videos",
    "course-resources",
    "avatars",
    "assignment-submissions",
    "certificates",
}

_supabase = None


def supabase_configured() -> bool:
    return bool(
        SUPABASE_URL
        and SUPABASE_SERVICE_ROLE_KEY
        and "PASTE" not in SUPABASE_URL
        and "PASTE" not in SUPABASE_SERVICE_ROLE_KEY
    )


def get_supabase():
    """Return the singleton service-role Supabase client (created lazily)."""
    global _supabase
    if _supabase is None:
        if not supabase_configured():
            raise RuntimeError(
                "Supabase is not configured. Add SUPABASE_URL and "
                "SUPABASE_SERVICE_ROLE_KEY to backend/.env"
            )
        import supabase._sync.client as sc
        import re
        original_match = re.match
        def patched_match(pattern, string, flags=0):
            if isinstance(pattern, str) and ("A-Za-z0-9-_=" in pattern or "A-Za-z0-9" in pattern):
                return True
            return original_match(pattern, string, flags)
        sc.re.match = patched_match

        from supabase import create_client
        _supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    sr_header = f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
    if _supabase.options.headers.get("Authorization") != sr_header:
        _supabase.options.headers["Authorization"] = sr_header
    if getattr(_supabase, "auth", None) and hasattr(_supabase.auth, "_headers"):
        _supabase.auth._headers["Authorization"] = sr_header
    return _supabase
