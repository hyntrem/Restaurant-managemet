from flask import Flask
from flask_cors import CORS

from models.branch_model import BranchModel
from models.audit_model import AuditModel
from routes.branch_routes import branch_bp
from routes.audit_routes import audit_bp
from utils.response import success


def create_app():
    app = Flask(__name__)
    CORS(app)

    from common.database import init_db_app
    init_db_app(app)

    # Tự bổ sung cột cần thiết nếu schema đang dùng bản cũ.
    with app.app_context():
        BranchModel.ensure_schema()
        AuditModel.ensure_schema()

    app.register_blueprint(branch_bp, url_prefix="/api/branches")
    app.register_blueprint(audit_bp, url_prefix="/api/audit-logs")

    @app.route("/health", methods=["GET"])
    def health():
        return success({"service": "branch-service", "status": "running"}, "Branch service đang chạy.")

    @app.route("/", methods=["GET"])
    def root():
        return success({
            "service": "branch-service",
            "endpoints": [
                "GET /api/branches",
                "POST /api/branches",
                "GET /api/branches/<id>",
                "PUT /api/branches/<id>",
                "PATCH /api/branches/<id>/status",
                "DELETE /api/branches/<id>",
                "GET /api/branches/<id>/staff",
                "GET /api/branches/<id>/summary",
                "GET /api/branches/dashboard",
                "GET /api/audit-logs"
            ]
        }, "Branch service API")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5007, debug=True)
