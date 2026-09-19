"""
Shared response + DB helpers. Every endpoint returns the same JSON shape:

    success → {"success": true,  "data": ...}
    failure → {"success": false, "message": "..."}
"""
import re
import uuid
import random
import string
from datetime import datetime
from flask import jsonify


def ok(data=None, status=200, **extra):
    payload = {"success": True, "data": data if data is not None else {}}
    payload.update(extra)
    return jsonify(payload), status


def fail(message, status=400, **extra):
    payload = {"success": False, "message": str(message)}
    payload.update(extra)
    return jsonify(payload), status


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

def page_params(default_per=12, max_per=60):
    from flask import request
    try:
        page = max(1, int(request.args.get("page", 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        per = int(request.args.get("per_page", default_per))
    except (TypeError, ValueError):
        per = default_per
    per = min(max(1, per), max_per)
    return page, per, (page - 1) * per, (page * per) - 1


def paged(data, count, page, per):
    return {
        "items": data or [],
        "total": count or 0,
        "page": page,
        "per_page": per,
        "pages": max(1, -(-(count or 0) // per)),
    }


# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------

_slug_re = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    base = _slug_re.sub("-", (text or "").lower()).strip("-") or "course"
    return f"{base}-{uuid.uuid4().hex[:6]}"


def certificate_number() -> str:
    stamp = datetime.utcnow().strftime("%Y")
    rand = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"LS-{stamp}-{rand}"


def sanitize_search(q: str) -> str:
    """Make a user search string safe for PostgREST or_() expressions."""
    return re.sub(r"[(),.%_]", " ", (q or "")).strip()[:80]


def is_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def first_row(result):
    data = getattr(result, "data", None) or []
    return data[0] if data else None
