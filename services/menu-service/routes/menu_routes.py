from flask import Blueprint
from controllers.menu_controller import (
    get_categories,
    create_category_controller,
    update_category_controller,
    delete_category_controller,
    get_menu_items,
    get_menu_item,
    search_menu_controller,
    get_menu_by_category_controller,
    create_menu_item_controller,
    update_menu_item_controller,
    delete_menu_item_controller,
    update_menu_status_controller
)

menu_bp = Blueprint("menu_bp", __name__)
# Category routes
menu_bp.route("/categories", methods=["GET"])(get_categories)
menu_bp.route("/categories", methods=["POST"])(create_category_controller)
menu_bp.route("/categories/<int:category_id>", methods=["PUT"])(update_category_controller)
menu_bp.route("/categories/<int:category_id>", methods=["DELETE"])(delete_category_controller)
# Menu item routes
menu_bp.route("/menu", methods=["GET"])(get_menu_items)
menu_bp.route("/menu/search", methods=["GET"])(search_menu_controller)
menu_bp.route("/menu/category/<int:category_id>", methods=["GET"])(get_menu_by_category_controller)
menu_bp.route("/menu/<int:item_id>", methods=["GET"])(get_menu_item)
menu_bp.route("/menu", methods=["POST"])(create_menu_item_controller)
menu_bp.route("/menu/<int:item_id>", methods=["PUT"])(update_menu_item_controller)
menu_bp.route("/menu/<int:item_id>", methods=["DELETE"])(delete_menu_item_controller)
menu_bp.route("/menu/<int:item_id>/status", methods=["PATCH"])(update_menu_status_controller)