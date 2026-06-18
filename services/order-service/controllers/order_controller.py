from flask import request, jsonify
from Services.order_service import (
    create_order_service, get_order_detail_service, list_orders_service,
    search_orders_service, add_item_to_order_service, update_item_service,
    remove_item_service, cancel_item_service, send_to_kitchen_service,
    start_preparing_service, mark_order_done_service, receive_food_service,
    cancel_order_service, get_order_history_service
)


# ==================== ORDER CRUD ====================

def create_order_controller():
    """POST /api/orders"""
    data = request.get_json()
    user_id = request.user_id
    response, status_code = create_order_service(data, user_id)
    return jsonify(response), status_code


def get_orders_controller():
    filters = {
        "status": request.args.get("status"),
        "order_type": request.args.get("order_type"),
        "customer_id": request.args.get("customer_id"),
        "branch_id": request.args.get("branch_id"),
        "start_date": request.args.get("start_date"),
        "end_date": request.args.get("end_date")
    }

    if request.user_role == "CUSTOMER":
        filters["customer_id"] = request.user_id

    response, status_code = list_orders_service(filters)
    return jsonify(response), status_code


def get_order_controller(order_id):
    response, status_code = get_order_detail_service(
        order_id,
        request.user_id,
        request.user_role
    )
    return jsonify(response), status_code


def search_order_controller():
    """GET /api/orders/search?keyword=ORD-001"""
    keyword = request.args.get("keyword", "")
    filters = {
        "order_type": request.args.get("order_type"),
        "status": request.args.get("status"),
        "start_date": request.args.get("start_date"),
        "end_date": request.args.get("end_date")
    }
    response, status_code = search_orders_service(keyword, filters)
    return jsonify(response), status_code


# ==================== ORDER ITEMS ====================

def add_item_controller(order_id):
    """POST /api/orders/{id}/items"""
    data = request.get_json()
    user_id = request.user_id
    response, status_code = add_item_to_order_service(order_id, data, user_id)
    return jsonify(response), status_code


def update_item_controller(order_id, item_id):
    """PUT /api/orders/{id}/items/{item_id}"""
    data = request.get_json()
    user_id = request.user_id
    response, status_code = update_item_service(order_id, item_id, data, user_id)
    return jsonify(response), status_code


def delete_item_controller(order_id, item_id):
    """DELETE /api/orders/{id}/items/{item_id}"""
    user_id = request.user_id
    response, status_code = remove_item_service(order_id, item_id, user_id)
    return jsonify(response), status_code


def cancel_item_controller(order_id, item_id):
    """PUT /api/orders/{id}/items/{item_id}/cancel"""
    data = request.get_json()
    user_id = request.user_id
    reason = data.get("reason", "")
    response, status_code = cancel_item_service(order_id, item_id, user_id, reason)
    return jsonify(response), status_code


# ==================== KITCHEN WORKFLOW ====================

def send_kitchen_controller(order_id):
    """POST /api/orders/{id}/send-kitchen"""
    user_id = request.user_id
    response, status_code = send_to_kitchen_service(order_id, user_id)
    return jsonify(response), status_code


def start_preparing_controller(order_id):
    """PUT /api/orders/{id}/preparing"""
    user_id = request.user_id
    response, status_code = start_preparing_service(order_id, user_id)
    return jsonify(response), status_code


def mark_done_controller(order_id):
    """PUT /api/orders/{id}/done"""
    user_id = request.user_id
    response, status_code = mark_order_done_service(order_id, user_id)
    return jsonify(response), status_code


def receive_food_controller(order_id):
    """PUT /api/orders/{id}/receive"""
    user_id = request.user_id
    response, status_code = receive_food_service(order_id, user_id)
    return jsonify(response), status_code


# ==================== CANCEL ====================

def cancel_order_controller(order_id):
    """PUT /api/orders/{id}/cancel"""
    data = request.get_json()
    user_id = request.user_id
    reason = data.get("reason", "")
    response, status_code = cancel_order_service(order_id, user_id, reason)
    return jsonify(response), status_code


# ==================== HISTORY ====================

def get_history_controller(order_id):
    response, status_code = get_order_history_service(
        order_id,
        request.user_id,
        request.user_role
    )
    return jsonify(response), status_code