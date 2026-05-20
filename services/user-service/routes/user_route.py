from flask import Blueprint

from Controllers.user_controller import (
    register,
    login,
    logout,
    send_otp,
    reset_password,
    get_user,
    admin_get_users
)

user_bp = Blueprint("user_bp", __name__)

user_bp.route("/register", methods=["POST"])(register)
user_bp.route("/login", methods=["POST"])(login)
user_bp.route("/logout", methods=["POST"])(logout)
user_bp.route("/send-otp", methods=["POST"])(send_otp)
user_bp.route("/reset-password", methods=["POST"])(reset_password)
user_bp.route("/me", methods=["GET"])(get_user)
user_bp.route("/admin/users", methods=["GET"])(admin_get_users)