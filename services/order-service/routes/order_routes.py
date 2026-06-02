from flask import Blueprint
from controllers.order_controller import (
    create_order_controller, get_orders_controller, get_order_controller,
    search_order_controller, add_item_controller, update_item_controller,
    delete_item_controller, cancel_item_controller, send_kitchen_controller,
    start_preparing_controller, mark_done_controller, receive_food_controller,
    cancel_order_controller, get_history_controller
)
from utils.auth_decorator import token_required

order_bp = Blueprint("order", __name__, url_prefix="/api/orders")

# ==================== ORDER CRUD ====================
order_bp.route("/", methods=["POST"])(token_required(create_order_controller))
order_bp.route("/", methods=["GET"])(token_required(get_orders_controller))
order_bp.route("/<int:order_id>", methods=["GET"])(token_required(get_order_controller))
order_bp.route("/search", methods=["GET"])(token_required(search_order_controller))

# ==================== ORDER ITEMS ====================
order_bp.route("/<int:order_id>/items", methods=["POST"])(token_required(add_item_controller))
order_bp.route("/<int:order_id>/items/<int:item_id>", methods=["PUT"])(token_required(update_item_controller))
order_bp.route("/<int:order_id>/items/<int:item_id>", methods=["DELETE"])(token_required(delete_item_controller))
order_bp.route("/<int:order_id>/items/<int:item_id>/cancel", methods=["PUT"])(token_required(cancel_item_controller))

# ==================== KITCHEN WORKFLOW ====================
order_bp.route("/<int:order_id>/send-kitchen", methods=["POST"])(token_required(send_kitchen_controller))
order_bp.route("/<int:order_id>/preparing", methods=["PUT"])(token_required(start_preparing_controller))
order_bp.route("/<int:order_id>/done", methods=["PUT"])(token_required(mark_done_controller))
order_bp.route("/<int:order_id>/receive", methods=["PUT"])(token_required(receive_food_controller))

# ==================== CANCEL ====================
order_bp.route("/<int:order_id>/cancel", methods=["PUT"])(token_required(cancel_order_controller))

# ==================== HISTORY ====================
order_bp.route("/<int:order_id>/history", methods=["GET"])(token_required(get_history_controller))
