"""
Lightweight input validation. Each validator raises ValueError with a
human-readable message; routes convert it into a 400 JSON error.
"""

COURSE_LEVELS = ("beginner", "intermediate", "advanced", "all")
COURSE_STATUSES = ("draft", "pending", "published", "rejected")


def body(request):
    data = request.get_json(silent=True)
    if data is None:
        raise ValueError("Request body must be valid JSON")
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object")
    return data


def required(data: dict, *fields):
    missing = []
    for f in fields:
        v = data.get(f)
        if v is None or (isinstance(v, str) and not v.strip()):
            missing.append(f)
    if missing:
        raise ValueError("Missing required field(s): " + ", ".join(missing))


def str_len(value, field, min_len=0, max_len=10_000, allow_none=True):
    if value is None:
        if allow_none:
            return
        raise ValueError(f"{field} is required")
    if not isinstance(value, str):
        raise ValueError(f"{field} must be text")
    n = len(value.strip())
    if n < min_len:
        raise ValueError(f"{field} must be at least {min_len} characters")
    if n > max_len:
        raise ValueError(f"{field} must be at most {max_len} characters")


def as_number(value, field, min_v=None, max_v=None, allow_none=True):
    if value is None or value == "":
        if allow_none:
            return None
        raise ValueError(f"{field} is required")
    try:
        num = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field} must be a number")
    if min_v is not None and num < min_v:
        raise ValueError(f"{field} must be at least {min_v}")
    if max_v is not None and num > max_v:
        raise ValueError(f"{field} must be at most {max_v}")
    return num


def as_int(value, field, min_v=None, max_v=None, allow_none=True):
    num = as_number(value, field, min_v, max_v, allow_none)
    return None if num is None else int(num)


def as_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ("true", "1", "yes")
    return bool(value)


def one_of(value, choices, field, allow_none=True):
    if value is None or value == "":
        if allow_none:
            return None
        raise ValueError(f"{field} is required")
    if value not in choices:
        raise ValueError(f"{field} must be one of: {', '.join(choices)}")
    return value


def valid_email(email: str) -> bool:
    import re
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email or ""))


def validate_course_payload(data: dict, partial=False):
    if not partial:
        required(data, "title")
    if "title" in data:
        str_len(data["title"], "title", 3, 160, allow_none=False)
    for f in ("short_description", "description", "requirements", "what_you_will_learn"):
        if f in data:
            str_len(data[f], f, 0, 20_000)
    if "price" in data:
        data["price"] = as_number(data["price"], "price", 0, 1_000_000) or 0
    if "discount_price" in data:
        data["discount_price"] = as_number(data["discount_price"], "discount_price", 0, 1_000_000)
    if "level" in data:
        data["level"] = one_of(data["level"], COURSE_LEVELS, "level") or "all"
    if "status" in data:
        one_of(data["status"], COURSE_STATUSES, "status")
    return data
