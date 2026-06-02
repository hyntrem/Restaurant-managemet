from flask import Blueprint
from Controllers.table_controller import (
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
from untils.auth_decorator import require_roles

table_bp = Blueprint("table_bp", __name__)

TABLE_ID_ROUTE = "/<int:table_id>"

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