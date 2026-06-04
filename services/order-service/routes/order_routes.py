from flask import Blueprint
from Controllers.order_controller import (
    create_order_controller,
    get_orders_controller,
    get_order_controller,
    search_order_controller,
    add_item_controller,
    update_item_controller,
    delete_item_controller,
    cancel_item_controller,
    send_kitchen_controller,
    start_preparing_controller,
    mark_done_controller,
    receive_food_controller,
    cancel_order_controller,
    get_history_controller
)
from utils.auth_decorator import token_required, require_roles

order_bp = Blueprint("order", __name__)

ORDER_ID_ROUTE = "/<int:order_id>"
ORDER_ITEM_ROUTE = "/<int:order_id>/items/<int:item_id>"

# ==================== ORDER CRUD ====================

order_bp.route("/", methods=["POST"])(
    require_roles("CUSTOMER", "CASHIER_LOBBY", "MANAGER", "ADMIN")(create_order_controller)
)

order_bp.route("/", methods=["GET"])(
    require_roles("CASHIER_LOBBY", "MANAGER", "ADMIN")(get_orders_controller)
)

order_bp.route(ORDER_ID_ROUTE, methods=["GET"])(
    require_roles("CUSTOMER", "CASHIER_LOBBY", "MANAGER", "ADMIN")(get_order_controller)
)

order_bp.route("/search", methods=["GET"])(
    require_roles("CASHIER_LOBBY", "MANAGER", "ADMIN")(search_order_controller)
)

# ==================== ORDER ITEMS ====================

order_bp.route("/<int:order_id>/items", methods=["POST"])(
    require_roles("CUSTOMER", "CASHIER_LOBBY", "MANAGER", "ADMIN")(add_item_controller)
)

order_bp.route(ORDER_ITEM_ROUTE, methods=["PUT"])(
    require_roles("CUSTOMER", "CASHIER_LOBBY", "MANAGER", "ADMIN")(update_item_controller)
)

order_bp.route(ORDER_ITEM_ROUTE, methods=["DELETE"])(
    require_roles("CUSTOMER", "CASHIER_LOBBY", "MANAGER", "ADMIN")(delete_item_controller)
)

order_bp.route("/<int:order_id>/items/<int:item_id>/cancel", methods=["PUT"])(
    require_roles("MANAGER", "ADMIN")(cancel_item_controller)
)

# ==================== KITCHEN WORKFLOW ====================

order_bp.route("/<int:order_id>/send-kitchen", methods=["POST"])(
    require_roles("CASHIER_LOBBY", "MANAGER", "ADMIN")(send_kitchen_controller)
)

order_bp.route("/<int:order_id>/preparing", methods=["PUT"])(
    require_roles("KITCHEN", "MANAGER", "ADMIN")(start_preparing_controller)
)

order_bp.route("/<int:order_id>/done", methods=["PUT"])(
    require_roles("KITCHEN", "MANAGER", "ADMIN")(mark_done_controller)
)

order_bp.route("/<int:order_id>/receive", methods=["PUT"])(
    require_roles("CUSTOMER", "CASHIER_LOBBY", "MANAGER", "ADMIN")(receive_food_controller)
)

# ==================== CANCEL ====================

order_bp.route("/<int:order_id>/cancel", methods=["PUT"])(
    require_roles("CUSTOMER", "CASHIER_LOBBY", "MANAGER", "ADMIN")(cancel_order_controller)
)

# ==================== HISTORY ====================

order_bp.route("/<int:order_id>/history", methods=["GET"])(
    require_roles("CUSTOMER", "CASHIER_LOBBY", "MANAGER", "ADMIN")(get_history_controller)
)