from flask import Blueprint
from controllers.inventory_controller import (
    get_inventory, post_ingredient, put_ingredient, 
    import_stock_controller, waste_stock_controller, 
    check_ingredient_by_menu, deduct_stock_internal, 
    get_alerts_controller, get_logs_history,
    delete_ingredient_controller, get_ingredient_by_id_controller, 
    export_stock_controller
)
from untils.auth_decorator import require_roles

inventory_bp = Blueprint("inventory_bp", __name__)

# Quản lý danh mục & Thông tin nền tảng
inventory_bp.route("/ingredients", methods=["GET"])(require_roles("ADMIN", "MANAGER", "KITCHEN")(get_inventory))
inventory_bp.route("/ingredients/<int:ingredient_id>", methods=["GET"])(require_roles("ADMIN", "MANAGER", "KITCHEN")(get_ingredient_by_id_controller))
inventory_bp.route("/ingredients", methods=["POST"])(require_roles("ADMIN", "MANAGER")(post_ingredient))
inventory_bp.route("/ingredients/<int:ingredient_id>", methods=["PUT"])(require_roles("ADMIN", "MANAGER")(put_ingredient))
inventory_bp.route("/ingredients/<int:ingredient_id>", methods=["DELETE"])(require_roles("ADMIN", "MANAGER")(delete_ingredient_controller))

# Nghiệp vụ Thay đổi Kho thực tế & Nhật ký hành trình
inventory_bp.route("/import", methods=["POST"])(require_roles("ADMIN", "MANAGER")(import_stock_controller))
inventory_bp.route("/export", methods=["POST"])(require_roles("ADMIN", "MANAGER")(export_stock_controller))
inventory_bp.route("/waste", methods=["POST"])(require_roles("ADMIN", "MANAGER")(waste_stock_controller))
inventory_bp.route("/logs", methods=["GET"])(require_roles("ADMIN", "MANAGER")(get_logs_history))
inventory_bp.route("/alerts", methods=["GET"])(require_roles("ADMIN", "MANAGER", "KITCHEN")(get_alerts_controller))

# API Gọi Liên Phân Hệ Nội Bộ (Microservices)
inventory_bp.route("/check/menu/<int:menu_item_id>", methods=["GET"])(check_ingredient_by_menu)
inventory_bp.route("/deduct-internal", methods=["POST"])(deduct_stock_internal)