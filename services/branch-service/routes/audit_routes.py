from flask import Blueprint
from controllers.audit_controller import AuditController

audit_bp = Blueprint("audit_bp", __name__)

audit_bp.route("/", methods=["GET"])(AuditController.list_logs)
audit_bp.route("/", methods=["POST"])(AuditController.create_log)