"""
LearnSphere — Flask application entry point.

Run locally:   python app.py          → http://localhost:5000
Production:    gunicorn app:app --bind 0.0.0.0:$PORT
"""
import os
import traceback
from flask import Flask, jsonify
from flask_cors import CORS

from config import FRONTEND_URL, supabase_configured
from utils.helpers import ok, fail


def create_app() -> Flask:
    app = Flask(__name__)

    # CORS — allow the frontend origin (plus any origin in local development).
    CORS(
        app,
        resources={r"/api/*": {"origins": [FRONTEND_URL, "http://localhost:5500",
                                           "http://127.0.0.1:5500", "*"]}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    # ------------------------------------------------------------------
    # Blueprints
    # ------------------------------------------------------------------
    from routes.auth_routes import auth_bp
    from routes.course_routes import course_bp
    from routes.lesson_routes import lesson_bp
    from routes.enrollment_routes import enrollment_bp
    from routes.progress_routes import progress_bp
    from routes.quiz_routes import quiz_bp
    from routes.assignment_routes import assignment_bp
    from routes.certificate_routes import certificate_bp
    from routes.review_routes import review_bp
    from routes.commerce_routes import commerce_bp
    from routes.payment_routes import payment_bp
    from routes.upload_routes import upload_bp
    from routes.instructor_routes import instructor_bp
    from routes.admin_routes import admin_bp
    from routes.notification_routes import notification_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(course_bp, url_prefix="/api")
    app.register_blueprint(lesson_bp, url_prefix="/api")
    app.register_blueprint(enrollment_bp, url_prefix="/api/enrollments")
    app.register_blueprint(progress_bp, url_prefix="/api/progress")
    app.register_blueprint(quiz_bp, url_prefix="/api")
    app.register_blueprint(assignment_bp, url_prefix="/api")
    app.register_blueprint(certificate_bp, url_prefix="/api/certificates")
    app.register_blueprint(review_bp, url_prefix="/api")
    app.register_blueprint(commerce_bp, url_prefix="/api")
    app.register_blueprint(payment_bp, url_prefix="/api/orders")
    app.register_blueprint(upload_bp, url_prefix="/api/uploads")
    app.register_blueprint(instructor_bp, url_prefix="/api/instructor")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(notification_bp, url_prefix="/api")

    # ------------------------------------------------------------------
    # Meta endpoints
    # ------------------------------------------------------------------
    @app.get("/api/health")
    def health():
        return ok({
            "status": "up",
            "supabase_configured": supabase_configured(),
            "service": "learnsphere-api",
        })

    # ------------------------------------------------------------------
    # JSON error handling
    # ------------------------------------------------------------------
    @app.errorhandler(404)
    def not_found(_):
        return fail("Resource not found", 404)

    @app.errorhandler(405)
    def method_not_allowed(_):
        return fail("Method not allowed", 405)

    @app.errorhandler(Exception)
    def unhandled(exc: Exception):
        traceback.print_exc()
        return fail("Server error: " + str(exc), 500)

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    print(f"LearnSphere API → http://localhost:{port}")
    if not supabase_configured():
        print("⚠  Supabase credentials missing — fill backend/.env "
              "(see README section 3&4)")
    app.run(host="0.0.0.0", port=port, debug=True)
