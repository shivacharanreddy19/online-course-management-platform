"""
File uploads → Supabase Storage (server-side, service role).

POST /api/uploads?bucket=<bucket>   multipart/form-data, field name: "file"

Allowed buckets are whitelisted in config.ALLOWED_BUCKETS. Returns the file's
public URL, which the client then stores on the relevant record
(course.thumbnail_url, lesson.video_url, profiles.avatar_url, ...).
Large binary data is NEVER stored in database columns.
"""
import uuid

from flask import Blueprint, g, request

from config import ALLOWED_BUCKETS
from services.supabase_service import sb
from utils.decorators import require_auth
from utils.helpers import ok, fail

upload_bp = Blueprint("uploads", __name__)

MAX_BYTES = 200 * 1024 * 1024  # 200 MB (videos)


@upload_bp.post("")
@require_auth
def upload():
    bucket = request.args.get("bucket", "")
    if bucket not in ALLOWED_BUCKETS:
        return fail(f"Invalid bucket. Allowed: {', '.join(sorted(ALLOWED_BUCKETS))}", 400)

    file = request.files.get("file")
    if file is None or not file.filename:
        return fail("Attach a file as multipart field 'file'", 400)

    data = file.read()
    if not data:
        return fail("The file is empty", 400)
    if len(data) > MAX_BYTES:
        return fail("File is too large (max 200 MB)", 400)

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    path = f"{g.user.id}/{uuid.uuid4().hex}.{ext}"
    mime = file.mimetype or "application/octet-stream"

    try:
        sb().storage.from_(bucket).upload(
            path=path, file=data,
            file_options={"content-type": mime, "upsert": "true"},
        )
        public_url = sb().storage.from_(bucket).get_public_url(path)
        return ok({"url": public_url, "path": path, "bucket": bucket}, status=201,
                  message="File uploaded")
    except Exception as exc:
        return fail(f"Upload failed: {exc}", 500)
