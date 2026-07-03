from flask import request, jsonify
from common.auth import verify_token

from services.user_service import (
    register_user,
    login_user,
    logout_user,
    send_otp_service,
    reset_password_service,
    get_user_profile,
    admin_get_all_users
)

def register():
    data = request.get_json()
    response, status_code = register_user(data)
    return jsonify(response), status_code


def login():
    data = request.get_json()
    response, status_code = login_user(data)
    return jsonify(response), status_code


def logout():
    response, status_code = logout_user()
    return jsonify(response), status_code


def send_otp():
    data = request.get_json()
    response, status_code = send_otp_service(data)
    return jsonify(response), status_code


def reset_password():
    data = request.get_json()
    response, status_code = reset_password_service(data)
    return jsonify(response), status_code


def get_user():
    current_user = verify_token(request)

    if not current_user:
        return jsonify({
            "success": False,
            "message": "Invalid or missing token"
        }), 401

    response, status_code = get_user_profile(current_user)
    return jsonify(response), status_code


def admin_get_users():
    current_user = verify_token(request)

    if not current_user:
        return jsonify({
            "success": False,
            "message": "Invalid or missing token"
        }), 401

    response, status_code = admin_get_all_users(current_user)
    return jsonify(response), status_code