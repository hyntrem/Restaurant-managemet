from functools import wraps
from flask import request, jsonify
from common.auth import verify_token

def require_roles(*allowed_roles):
    """
    Decorator kiểm tra đăng nhập và phân quyền hệ thống.
    - Cho phép gọi nội bộ qua Header X-Internal-Service.
    - Kiểm tra Role nếu có truyền tham số (Ví dụ: "CASHIER_LOBBY", "MANAGER").
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            
            # 1. KIỂM TRA YÊU CẦU GỌI NỘI BỘ (Bypass)
            valid_internal_services = ["order-service", "payment-service", "inventory-service", "table-service", "user-service"]
            incoming_service = request.headers.get("X-Internal-Service")
            if incoming_service in valid_internal_services:
                request.user_role = "INTERNAL_SERVICE"
                return f(*args, **kwargs)

            # 2. XÁC THỰC CON NGƯỜI (Giải mã JWT)
            payload = verify_token(request)
            if not payload:
                return jsonify({
                    "success": False, 
                    "message": "Token không hợp lệ hoặc phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!"
                }), 401
            
            user_role = payload.get("role")
            
            # 3. PHÂN QUYỀN (Nếu có yêu cầu nhóm quyền cụ thể)
            if allowed_roles and user_role not in allowed_roles:
                return jsonify({
                    "success": False, 
                    "message": f"Tài khoản thuộc nhóm quyền [{user_role}] không được phép thực hiện chức năng này!"
                }), 403
            
            # 4. ĐỒNG BỘ DỮ LIỆU ĐẦU RA CHO CONTROLLER
            request.user_payload = payload
            request.user_id = payload.get("user_id")
            request.user_role = user_role
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_auth(f):
    """
    Decorator chỉ yêu cầu người dùng ĐÃ ĐĂNG NHẬP (Không quan trọng Role nào).
    Tái sử dụng lại hàm require_roles() bằng cách không truyền quyền nào vào.
    """
    return require_roles()(f)