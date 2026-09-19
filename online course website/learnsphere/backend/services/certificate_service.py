"""
Certificate issuance.
"""
from services.supabase_service import sb, notify
from utils.helpers import certificate_number, first_row


def issue_certificate(student_id: str, course_id: str) -> dict:
    """Create a certificate for a completed course (idempotent)."""
    existing = (
        sb().table("certificates")
        .select("*")
        .eq("student_id", student_id)
        .eq("course_id", course_id)
        .limit(1)
        .execute()
    )
    row = first_row(existing)
    if row:
        return row

    res = sb().table("certificates").insert({
        "student_id": student_id,
        "course_id": course_id,
        "certificate_number": certificate_number(),
    }).execute()
    cert = first_row(res)

    course = first_row(sb().table("courses").select("title").eq("id", course_id).execute())
    notify(
        student_id,
        "Certificate issued 🎓",
        f"You completed “{course['title'] if course else 'a course'}” — your certificate is ready.",
    )
    return cert
