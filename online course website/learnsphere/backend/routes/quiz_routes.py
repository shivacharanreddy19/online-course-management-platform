"""
Quizzes: builder CRUD (instructor) + taking + grading (student).

POST   /api/courses/<id>/quizzes     [instructor] create quiz (+questions in one payload)
PUT    /api/quizzes/<id>             [instructor] update (+replace questions when provided)
DELETE /api/quizzes/<id>             [instructor]
GET    /api/courses/<id>/quizzes     [enrolled/owner] list quizzes for a course
GET    /api/quizzes/<id>             quiz detail — correct answers hidden from students
POST   /api/quizzes/<id>/submit      [enrolled student] {answers:{question_id:"a"}}
GET    /api/quizzes/<id>/attempts    my attempt history
"""
from flask import Blueprint, g, request

from services.supabase_service import sb, get_course, course_owner_or_admin, is_enrolled, notify
from utils.decorators import require_auth
from utils.helpers import ok, fail, first_row
from utils.validators import body, required, str_len, as_int

quiz_bp = Blueprint("quizzes", __name__)

Q_FIELDS = ("question", "option_a", "option_b", "option_c", "option_d", "correct_option", "points")


def _quiz_course(quiz_id):
    quiz = first_row(sb().table("quizzes").select("*").eq("id", quiz_id).execute())
    if not quiz:
        return None, None
    return quiz, get_course(quiz["course_id"])


def _validate_questions(questions):
    if not isinstance(questions, list):
        raise ValueError("questions must be a list")
    cleaned = []
    for i, q in enumerate(questions, 1):
        if not str(q.get("question", "")).strip():
            raise ValueError(f"Question {i} is empty")
        if q.get("correct_option") not in ("a", "b", "c", "d"):
            raise ValueError(f"Question {i}: choose the correct option (a–d)")
        cleaned.append({
            "question": str(q["question"]).strip()[:1000],
            "option_a": str(q.get("option_a") or "")[:400],
            "option_b": str(q.get("option_b") or "")[:400],
            "option_c": str(q.get("option_c") or "")[:400],
            "option_d": str(q.get("option_d") or "")[:400],
            "correct_option": q["correct_option"],
            "points": as_int(q.get("points"), f"points (question {i})", 1, 100) or 1,
        })
    return cleaned


def _replace_questions(quiz_id, questions):
    cleaned = _validate_questions(questions)
    sb().table("quiz_questions").delete().eq("quiz_id", quiz_id).execute()
    if cleaned:
        for row in cleaned:
            row["quiz_id"] = quiz_id
        sb().table("quiz_questions").insert(cleaned).execute()


@quiz_bp.post("/courses/<course_id>/quizzes")
@require_auth
def create_quiz(course_id):
    course = get_course(course_id)
    if not course:
        return fail("Course not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    try:
        data = body(request)
        required(data, "title")
        str_len(data["title"], "title", 2, 200, allow_none=False)
        res = sb().table("quizzes").insert({
            "course_id": course_id,
            "section_id": data.get("section_id") or None,
            "title": data["title"].strip(),
            "description": data.get("description"),
            "passing_score": as_int(data.get("passing_score"), "passing_score", 0, 100) or 60,
        }).execute()
        quiz = first_row(res)
        if data.get("questions"):
            _replace_questions(quiz["id"], data["questions"])
        return ok({"quiz": quiz}, status=201, message="Quiz created")
    except ValueError as exc:
        return fail(str(exc), 400)


@quiz_bp.put("/quizzes/<quiz_id>")
@require_auth
def update_quiz(quiz_id):
    quiz, course = _quiz_course(quiz_id)
    if not course:
        return fail("Quiz not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    try:
        data = body(request)
        update = {}
        if "title" in data:
            str_len(data["title"], "title", 2, 200, allow_none=False)
            update["title"] = data["title"].strip()
        if "description" in data:
            update["description"] = data["description"]
        if "section_id" in data:
            update["section_id"] = data["section_id"] or None
        if "passing_score" in data:
            update["passing_score"] = as_int(data["passing_score"], "passing_score", 0, 100)
        if update:
            sb().table("quizzes").update(update).eq("id", quiz_id).execute()
        if "questions" in data:
            _replace_questions(quiz_id, data["questions"])
        return ok({"message": "Quiz updated"})
    except ValueError as exc:
        return fail(str(exc), 400)


@quiz_bp.delete("/quizzes/<quiz_id>")
@require_auth
def delete_quiz(quiz_id):
    quiz, course = _quiz_course(quiz_id)
    if not course:
        return fail("Quiz not found", 404)
    if not course_owner_or_admin(course, g.profile):
        return fail("You can only edit your own courses", 403)
    sb().table("quizzes").delete().eq("id", quiz_id).execute()
    return ok({"message": "Quiz deleted"})


@quiz_bp.get("/courses/<course_id>/quizzes")
@require_auth
def course_quizzes(course_id):
    res = (sb().table("quizzes").select("*").eq("course_id", course_id)
           .order("title").execute())
    return ok({"items": res.data or []})


@quiz_bp.get("/quizzes/<quiz_id>")
@require_auth
def get_quiz(quiz_id):
    quiz, course = _quiz_course(quiz_id)
    if not course:
        return fail("Quiz not found", 404)

    owner = course_owner_or_admin(course, g.profile)
    enrolled = is_enrolled(g.user.id, course["id"])
    if not owner and not enrolled:
        return fail("Enroll in this course to take its quizzes", 403)

    questions = (sb().table("quiz_questions").select("*").eq("quiz_id", quiz_id)
                 .order("id").execute().data or [])
    if not owner:
        for q in questions:                       # hide answers from students
            q.pop("correct_option", None)

    best = (sb().table("quiz_attempts").select("*").eq("quiz_id", quiz_id)
            .eq("student_id", g.user.id).order("score", desc=True).limit(1).execute().data or [])
    return ok({"quiz": quiz, "questions": questions,
               "best_attempt": best[0] if best else None, "is_owner": owner})


@quiz_bp.post("/quizzes/<quiz_id>/submit")
@require_auth
def submit_quiz(quiz_id):
    quiz, course = _quiz_course(quiz_id)
    if not course:
        return fail("Quiz not found", 404)
    if not is_enrolled(g.user.id, course["id"]):
        return fail("Enroll in this course to take its quizzes", 403)

    try:
        data = body(request)
        answers = data.get("answers") or {}
        if not isinstance(answers, dict):
            raise ValueError("answers must be an object {question_id: 'a'|'b'|'c'|'d'}")

        questions = (sb().table("quiz_questions").select("*").eq("quiz_id", quiz_id)
                     .execute().data or [])
        if not questions:
            return fail("This quiz has no questions yet", 400)

        earned = total = 0.0
        results = []
        for q in questions:
            pts = float(q.get("points") or 1)
            total += pts
            given = (answers.get(q["id"]) or "").lower()
            correct = (q.get("correct_option") or "").lower()
            right = given == correct and given != ""
            if right:
                earned += pts
            results.append({"question_id": q["id"], "given": given or None,
                            "correct_option": correct, "correct": right,
                            "points": pts, "earned": pts if right else 0})

        score = round(earned * 100.0 / total, 2) if total else 0.0
        passed = score >= float(quiz.get("passing_score") or 60)

        attempt = first_row(sb().table("quiz_attempts").insert({
            "quiz_id": quiz_id, "student_id": g.user.id,
            "score": score, "passed": passed,
        }).execute())

        notify(g.user.id, f"Quiz {'passed ✅' if passed else 'submitted'}",
               f"“{quiz['title']}” — you scored {score:.0f}% (pass mark {quiz['passing_score']}%).")

        return ok({"attempt": attempt, "score": score, "passed": passed,
                   "total_points": total, "earned_points": earned, "results": results},
                  message="Quiz graded")
    except ValueError as exc:
        return fail(str(exc), 400)


@quiz_bp.get("/quizzes/<quiz_id>/attempts")
@require_auth
def attempts(quiz_id):
    res = (sb().table("quiz_attempts").select("*")
           .eq("quiz_id", quiz_id).eq("student_id", g.user.id)
           .order("attempted_at", desc=True).execute())
    return ok({"items": res.data or []})
