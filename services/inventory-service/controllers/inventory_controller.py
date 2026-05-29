from flask import request, jsonify
from services.inventory_service import (
    list_inventory, add_new_ingredient, edit_ingredient, 
    import_goods, waste_goods, check_and_deduct_order_stock, get_inventory_alerts, view_logs
)

def get_inventory():
    res, status_code = list_inventory()
    return jsonify(res), status_code


def post_ingredient():
    res, status_code = add_new_ingredient(request.json)
    return jsonify(res), status_code


def put_ingredient(ingredient_id):
    res, status_code = edit_ingredient(ingredient_id, request.json)
    return jsonify(res), status_code


def import_stock_controller():
    res, status_code = import_goods(request.json)
    return jsonify(res), status_code


def waste_stock_controller():
    res, status_code = waste_goods(request.json)
    return jsonify(res), status_code


def check_ingredient_by_menu(menu_item_id):
    
    quantity = request.args.get('quantity', 1, type=int) 
    
    # Đóng gói dữ liệu thành mảng (list) để khớp với hàm check_and_deduct_order_stock
    data = {
        "items": [
            {"menu_item_id": menu_item_id, "quantity": quantity}
        ]
    }
    

    res, status_code = check_and_deduct_order_stock(data, is_deduct=False)
    return jsonify(res), status_code


def deduct_stock_internal():
    res, status_code = check_and_deduct_order_stock(request.json, is_deduct=True)
    return jsonify(res), status_code


def get_alerts_controller():
    res, status_code = get_inventory_alerts()
    return jsonify(res), status_code


def get_logs_history():
    res, status_code = view_logs()
    return jsonify(res), status_code