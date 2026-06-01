from flask import Blueprint
from controllers.table_controller import (
    get_table_map_controller, post_table_controller, put_table_controller,
    delete_table_controller, post_area_controller, put_table_status_controller, post_transfer_table_controller
)
from untils.auth_decorator import require_roles

table_bp = Blueprint("table_bp", __name__)

# Quản lý sơ đồ bàn & Khu vực bàn ăn
table_bp.route("/tables/map", methods=["GET"])(require_roles("ADMIN", "MANAGER", "CASHIER_LOBBY")(get_table_map_controller))
table_bp.route("/tables", methods=["POST"])(require_roles("ADMIN", "MANAGER")(post_table_controller))
table_bp.route("/tables/<int:table_id>", methods=["PUT"])(require_roles("ADMIN", "MANAGER")(put_table_controller))
table_bp.route("/tables/<int:table_id>", methods=["DELETE"])(require_roles("ADMIN", "MANAGER")(delete_table_controller))
table_bp.route("/tables/areas", methods=["POST"])(require_roles("ADMIN", "MANAGER")(post_area_controller))

# Vận hành thay đổi trạng thái bàn ăn (Mở khóa cho cả luồng gọi nội bộ từ order-service)
table_bp.route("/tables/status", methods=["PUT"])(require_roles("ADMIN", "MANAGER", "CASHIER_LOBBY")(put_table_status_controller))
table_bp.route("/tables/transfer", methods=["POST"])(require_roles("ADMIN", "MANAGER", "CASHIER_LOBBY")(post_transfer_table_controller))