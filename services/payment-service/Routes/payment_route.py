from flask import Blueprint
from Controllers.payment_controller import (
    create_invoice_controller, get_invoice_controller, process_payment_controller
)
from untils.auth_decorator import require_auth, require_roles

payment_bp = Blueprint("payment_bp", __name__)

# 1. POST /api/payments/invoices -> Tạo hóa đơn mới
# Require: Phải là Staff hoặc Quản lý
payment_bp.route("/invoices", methods=["POST"])(
    require_roles("CASHIER_LOBBY", "MANAGER", "ADMIN")(create_invoice_controller)
)

# 2. GET /api/payments/invoices/<id> -> Xem chi tiết hóa đơn
# Require: Customer chỉ được xem hóa đơn của chính mình, Staff/Manager/Admin được xem tất cả
payment_bp.route("/invoices/<int:invoice_id>", methods=["GET"])(
    require_auth(get_invoice_controller)
)
# 3. POST /api/payments/invoices/<id>/pay -> Thanh toán tiền
payment_bp.route("/invoices/<int:invoice_id>/pay", methods=["POST"])(
    require_auth(process_payment_controller)
)