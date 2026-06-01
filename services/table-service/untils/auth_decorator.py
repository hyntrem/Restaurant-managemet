from functools import wraps
from flask import request, jsonify
from common.auth import verify_token

def require_roles(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Nếu là yêu cầu gọi nội bộ giữa các container (Ví dụ: order-service) thì cho qua trực tiếp
            if request.headers.get("X-Internal-Service") == "order-service":
                return f(*args, **kwargs)

            # Giải mã JWT Token bằng hàm dùng chung có sẵn trong dự án của nhóm bạn
            payload = verify_token(request)
            if not payload:
                return jsonify({"success": False, "message": "Token không hợp lệ hoặc phiên làm việc đã hết hạn"}), 401
            
            user_role = payload.get("role")
            if user_role not in allowed_roles:
                return jsonify({"success": False, "message": f"Tài khoản thuộc nhóm quyền [{user_role}] không được phép thực hiện chức năng này"}), 403
            
            request.user_payload = payload
            return f(*args, **kwargs)
        return decorated_function
    return decorator