from flask import request, jsonify
from Services.payment_service import (
    create_invoice_service, get_invoice_detail_service, process_payment_service
)

def extract_token():
    """Trích xuất chuỗi JWT Token từ Header của Request"""
    auth_header = request.headers.get("Authorization", "")
    return auth_header.split(" ")[1] if " " in auth_header else ""

def create_invoice_controller():
    """Controller: Tiếp nhận Request tạo hóa đơn mới"""
    data = request.get_json()
    token = extract_token()
    user_role = getattr(request, 'user_role', '')
    
    response, status = create_invoice_service(data, token, user_role)
    return jsonify(response), status

def get_invoice_controller(invoice_id):
    """Controller: Tiếp nhận Request yêu cầu xem chi tiết hóa đơn"""
    token = extract_token()
    user_id = getattr(request, 'user_id', None)
    user_role = getattr(request, 'user_role', '')

    response, status = get_invoice_detail_service(invoice_id, user_id, user_role, token)
    return jsonify(response), status

def process_payment_controller(invoice_id):
    """Controller: Tiếp nhận Request thanh toán tiền"""
    data = request.get_json()
    token = extract_token()
    user_id = getattr(request, 'user_id', None)
    user_role = getattr(request, 'user_role', '')

    response, status = process_payment_service(invoice_id, data, token, user_id, user_role)
    return jsonify(response), status