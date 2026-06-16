from flask import Blueprint
from controllers.table_controller import (
    get_table_map_controller,
    get_single_table_controller,
    post_table_controller,
    put_table_controller,
    delete_table_controller,
    post_area_controller,
    put_table_status_controller,
    post_transfer_table_controller,
    assign_order_controller
)
from controllers.reservation_controller import (
    check_availability_controller,
    create_reservation_controller,
    get_reservation_controller,
    get_my_reservations_controller,
    list_reservations_controller,
    update_reservation_status_controller,
    cancel_reservation_controller
)
from untils.auth_decorator import require_roles

table_bp = Blueprint("table_bp", __name__)

TABLE_ID_ROUTE = "/<int:table_id>"

# ===========================
# TABLE MANAGEMENT ROUTES (Staff Only)
# ===========================

table_bp.route("/map", methods=["GET"])(
    require_roles("ADMIN", "MANAGER", "CASHIER_LOBBY")(get_table_map_controller)
)

table_bp.route(TABLE_ID_ROUTE, methods=["GET"])(
    require_roles("ADMIN", "MANAGER", "CASHIER_LOBBY")(get_single_table_controller)
)

table_bp.route("/", methods=["POST"])(
    require_roles("ADMIN", "MANAGER")(post_table_controller)
)

table_bp.route(TABLE_ID_ROUTE, methods=["PUT"])(
    require_roles("ADMIN", "MANAGER")(put_table_controller)
)

table_bp.route(TABLE_ID_ROUTE, methods=["DELETE"])(
    require_roles("ADMIN", "MANAGER")(delete_table_controller)
)

table_bp.route("/areas", methods=["POST"])(
    require_roles("ADMIN", "MANAGER")(post_area_controller)
)

table_bp.route("/status", methods=["PUT"])(
    require_roles("ADMIN", "MANAGER", "CASHIER_LOBBY")(put_table_status_controller)
)

table_bp.route("/transfer", methods=["POST"])(
    require_roles("ADMIN", "MANAGER", "CASHIER_LOBBY")(post_transfer_table_controller)
)

table_bp.route("/assign-order", methods=["PUT"])(
    require_roles("ADMIN", "MANAGER", "CASHIER_LOBBY")(assign_order_controller)
)

# ===========================
# RESERVATION ROUTES (Public + Staff)
# ===========================

# Public endpoints - no authentication required
table_bp.route("/reservations/check-availability", methods=["POST"])(
    check_availability_controller
)

table_bp.route("/reservations", methods=["POST"])(
    create_reservation_controller
)

table_bp.route("/reservations/<reservation_code>", methods=["GET"])(
    get_reservation_controller
)

table_bp.route("/reservations/my", methods=["GET"])(
    get_my_reservations_controller
)

table_bp.route("/reservations/cancel", methods=["POST"])(
    cancel_reservation_controller
)

# Staff endpoints - authentication required
table_bp.route("/reservations/all", methods=["GET"])(
    require_roles("ADMIN", "MANAGER", "CASHIER_LOBBY")(list_reservations_controller)
)

table_bp.route("/reservations/<int:reservation_id>/status", methods=["PUT"])(
    require_roles("ADMIN", "MANAGER", "CASHIER_LOBBY")(update_reservation_status_controller)
)