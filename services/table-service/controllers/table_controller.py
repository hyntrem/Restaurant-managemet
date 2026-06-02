from flask import request, jsonify
from Services.table_service import (
    list_table_map,
    get_table_detail,
    add_new_table,
    edit_table_info,
    remove_table_from_system,
    add_new_area,
    update_table_status_service,
    transfer_table_service,
    assign_order_to_table_service
)

def get_table_map_controller():
    res, status_code = list_table_map()
    return jsonify(res), status_code

def get_single_table_controller(table_id):
    res, status_code = get_table_detail(table_id)
    return jsonify(res), status_code

def post_table_controller():
    res, status_code = add_new_table(request.json)
    return jsonify(res), status_code

def put_table_controller(table_id):
    res, status_code = edit_table_info(table_id, request.json)
    return jsonify(res), status_code

def delete_table_controller(table_id):
    res, status_code = remove_table_from_system(table_id)
    return jsonify(res), status_code

def post_area_controller():
    res, status_code = add_new_area(request.json)
    return jsonify(res), status_code

def put_table_status_controller():
    res, status_code = update_table_status_service(request.json)
    return jsonify(res), status_code

def post_transfer_table_controller():
    res, status_code = transfer_table_service(request.json)
    return jsonify(res), status_code

def assign_order_controller():
    res, status_code = assign_order_to_table_service(request.json)
    return jsonify(res), status_code