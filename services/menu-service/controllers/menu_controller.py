from flask import request, jsonify

from services.menu_service import (
    list_categories,
    add_category,
    update_category,
    delete_category,
    list_menu_items,
    get_menu_detail,
    search_menu,
    get_menu_by_category,
    add_menu_item,
    update_menu_item,
    delete_menu_item,
    update_menu_status
)


def get_categories():
    response, status_code = list_categories()
    return jsonify(response), status_code


def create_category_controller():
    data = request.get_json()
    response, status_code = add_category(data)
    return jsonify(response), status_code


def update_category_controller(category_id):
    data = request.get_json()
    response, status_code = update_category(category_id, data)
    return jsonify(response), status_code


def delete_category_controller(category_id):
    response, status_code = delete_category(category_id)
    return jsonify(response), status_code


def get_menu_items():
    response, status_code = list_menu_items()
    return jsonify(response), status_code


def get_menu_item(item_id):
    response, status_code = get_menu_detail(item_id)
    return jsonify(response), status_code


def search_menu_controller():
    keyword = request.args.get("keyword")
    response, status_code = search_menu(keyword)
    return jsonify(response), status_code


def get_menu_by_category_controller(category_id):
    response, status_code = get_menu_by_category(category_id)
    return jsonify(response), status_code


def create_menu_item_controller():
    data = request.get_json()
    response, status_code = add_menu_item(data)
    return jsonify(response), status_code


def update_menu_item_controller(item_id):
    data = request.get_json()
    response, status_code = update_menu_item(item_id, data)
    return jsonify(response), status_code


def delete_menu_item_controller(item_id):
    response, status_code = delete_menu_item(item_id)
    return jsonify(response), status_code


def update_menu_status_controller(item_id):
    data = request.get_json()
    response, status_code = update_menu_status(item_id, data)
    return jsonify(response), status_code