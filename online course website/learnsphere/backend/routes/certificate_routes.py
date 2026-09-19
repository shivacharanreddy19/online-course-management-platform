"""
Certificates.

GET /api/certificates                  my certificates (+ course + instructor)
GET /api/certificates/<id>             single certificate (owner/admin)
GET /api/certificates/verify/<number>  public verification by certificate number
"""
from flask import Blueprint, g

from services.supabase_service import sb
from utils.decorators import require_auth
from utils.helpers import ok, fail, first_row

certificate_bp = Blueprint("certificates", __name__)


def _decorate(cert):
    course = first_row(sb().table("courses").select("id, title, instructor_id")
                       .eq("id", cert["course_id"]).execute()) or {}
    instructor = first_row(sb().table("profiles").select("full_name")
                           .eq("id", course.get("instructor_id")).execute()) or {}
    student = first_row(sb().table("profiles").select("full_name, email")
                        .eq("id", cert["student_id"]).execute()) or {}
    cert["course"] = course
    cert["instructor_name"] = instructor.get("full_name")
    cert["student_name"] = student.get("full_name")
    return cert


@certificate_bp.get("")
@require_auth
def my_certificates():
    res = (sb().table("certificates").select("*").eq("student_id", g.user.id)
           .order("issued_at", desc=True).execute())
    return ok({"items": [_decorate(c) for c in res.data or []]})


@certificate_bp.get("/verify/<number>")
def verify(number):
    cert = first_row(sb().table("certificates").select("*")
                     .eq("certificate_number", number).execute())
    if not cert:
        return fail("Certificate not found", 404)
    return ok({"certificate": _decorate(cert), "valid": True})


@certificate_bp.get("/<cert_id>")
@require_auth
def get_certificate(cert_id):
    cert = first_row(sb().table("certificates").select("*").eq("id", cert_id).execute())
    if not cert:
        return fail("Certificate not found", 404)
    if cert["student_id"] != g.user.id and g.profile["role"] != "admin":
        return fail("Permission denied", 403)
    return ok({"certificate": _decorate(cert)})
