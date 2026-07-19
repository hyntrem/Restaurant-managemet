import random
import bcrypt
import os
from datetime import datetime, timedelta, timezone
import uuid
import jwt
from enum import Enum
from common.config import JWT_SECRET_KEY as SECRET_KEY

from common.auth import generate_token
from models.user_model import (
    create_user,
    find_user_by_username,
    find_user_by_identifier,
    find_user_by_id,
    get_all_users,
    save_otp,
    verify_otp,
    check_otp_rate_limit,
    update_password
)

class Purpose(Enum):
    ORDER_CREATION = "ORDER_CREATION"
    TABLE_RESERVATION = "TABLE_RESERVATION"
    PASSWORD_RESET = "PASSWORD_RESET"


def register_user(data):
    username = data.get("username")
    password = data.get("password")
    role_id = data.get("role_id", 1)
    branch_id = data.get("branch_id")

    if not username or not password:
        return {
            "success": False,
            "message": "Username and password are required"
        }, 400

    if find_user_by_username(username):
        return {
            "success": False,
            "message": "Username already exists"
        }, 400

    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    create_user(
        full_name=data.get("full_name"),
        username=username,
        email=data.get("email"),
        phone=data.get("phone"),
        password_hash=password_hash,
        role_id=role_id,
        branch_id=branch_id
    )

    return {
        "success": True,
        "message": "Register successfully"
    }, 201


def login_user(data):
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return {
            "success": False,
            "message": "Username and password are required"
        }, 400

    user = find_user_by_username(username)

    if not user:
        return {
            "success": False,
            "message": "Invalid username or password"
        }, 401

    if user.get("status") and user.get("status") != "ACTIVE":
        return {
            "success": False,
            "message": "Account is inactive or locked"
        }, 403

    is_valid = bcrypt.checkpw(
        password.encode("utf-8"),
        user["password_hash"].encode("utf-8")
    )

    if not is_valid:
        return {
            "success": False,
            "message": "Invalid username or password"
        }, 401

    token = generate_token(user)

    return {
        "success": True,
        "message": "Login successfully",
        "data": {
            "token": token,
            "user": {
                "id": user.get("id"),
                "full_name": user.get("full_name"),
                "username": user.get("username"),
                "email": user.get("email"),
                "phone": user.get("phone"),
                "role": user.get("role"),

                # Thông tin chi nhánh
                "branch_id": user.get("branch_id"),
                "branch_code": user.get("branch_code"),
                "branch_name": user.get("branch_name")
            }
        }
    }, 200


def logout_user():
    return {
        "success": True,
        "message": "Logout successfully. Please remove token on client side."
    }, 200


def send_otp_service(data):
    email = data.get("email")
    phone = data.get("phone")
    purpose_str = data.get("purpose")

    if not email and not phone:
        return {
            "success": False,
            "message": "Email or phone is required"
        }, 400

    if not purpose_str:
        return {
            "success": False,
            "message": "Purpose is required"
        }, 400

    try:
        purpose = Purpose(purpose_str)
    except ValueError:
        return {
            "success": False,
            "message": f"Invalid purpose. Must be one of: {[e.value for e in Purpose]}"
        }, 400

    identifier = email if email else phone

    # Rate limiting: 30 seconds cooldown
    if check_otp_rate_limit(identifier, 30):
        return {
            "success": False,
            "message": "Vui lòng đợi 30 giây trước khi yêu cầu gửi lại mã mới."
        }, 429

    if purpose == Purpose.PASSWORD_RESET:
        user = find_user_by_identifier(identifier)
        if not user:
            return {
                "success": False,
                "message": "User does not exist"
            }, 404

    # DEV Override: Use 123456 for testing in development
    if os.getenv("APP_ENV") == "development":
        otp_code = "123456"
        print(f"[TESTING ONLY] DEV MODE Enabled. OTP for {identifier} forced to: 123456")
    else:
        otp_code = str(random.randint(100000, 999999))

    expired_at = datetime.now() + timedelta(minutes=5)

    save_otp(identifier, otp_code, expired_at)

    return {
        "success": True,
        "message": f"OTP sent successfully to {identifier}."
    }, 200


def verify_otp_service(data):
    email = data.get("email")
    phone = data.get("phone")
    otp_code = data.get("otp_code")
    purpose_str = data.get("purpose")

    if not otp_code or (not email and not phone):
        return {
            "success": False,
            "message": "OTP code and email or phone are required"
        }, 400

    if not purpose_str:
        return {
            "success": False,
            "message": "Purpose is required"
        }, 400

    try:
        purpose = Purpose(purpose_str)
    except ValueError:
        return {
            "success": False,
            "message": f"Invalid purpose. Must be one of: {[e.value for e in Purpose]}"
        }, 400

    identifier = email if email else phone
    is_valid, message = verify_otp(identifier, otp_code)

    if not is_valid:
        return {
            "success": False,
            "message": message
        }, 400

    # Nếu mục đích là PASSWORD_RESET, chỉ cần trả về OK không cần verification token phức tạp vì API reset password 
    # đang tự check OTP lần nữa. (Hoặc có thể trả token và để reset_password check token).
    # Hiện tại giữ nguyên luồng cũ cho reset_password để tránh gãy code hiện tại.

    # Sinh Verification Token
    expires_in_sec = 300
    payload = {
        "sub": identifier,
        "purpose": purpose.value,
        "jti": str(uuid.uuid4()),
        "iss": "user-service",
        "aud": "customer-action",
        "exp": datetime.now(timezone.utc) + timedelta(seconds=expires_in_sec)
    }
    verification_token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

    return {
        "success": True,
        "message": message,
        "verification_token": verification_token,
        "expires_in": expires_in_sec
    }, 200


def reset_password_service(data):
    email = data.get("email")
    phone = data.get("phone")
    otp_code = data.get("otp_code")
    new_password = data.get("new_password")

    if not otp_code or not new_password or (not email and not phone):
        return {
            "success": False,
            "message": "Email or phone, OTP and new password are required"
        }, 400

    identifier = email if email else phone
    is_valid, message = verify_otp(identifier, otp_code)

    if not is_valid:
        return {
            "success": False,
            "message": message
        }, 400

    password_hash = bcrypt.hashpw(
        new_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    update_password(identifier, password_hash)

    return {
        "success": True,
        "message": "Reset password successfully"
    }, 200


def get_user_profile(current_user):
    user = find_user_by_id(current_user["user_id"])

    if not user:
        return {
            "success": False,
            "message": "User not found"
        }, 404

    return {
        "success": True,
        "message": "Get user successfully",
        "data": user
    }, 200


def admin_get_all_users(current_user):
    if current_user["role"] != "ADMIN":
        return {
            "success": False,
            "message": "Only admin can view all users"
        }, 403

    users = get_all_users()

    return {
        "success": True,
        "message": "Get all users successfully",
        "data": users
    }, 200