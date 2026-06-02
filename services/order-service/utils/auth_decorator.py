from functools import wraps
from flask import request, jsonify
from common.auth import verify_token

def token_required(f):
    """Decorator để xác thực JWT token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Kiểm tra token
        payload = verify_token(request)
        if not payload:
            return jsonify({
                "success": False,
                "message": "Token không hợp lệ hoặc phiên làm việc đã hết hạn"
            }), 401
        
        # Lưu payload vào request để sử dụng ở controller
        request.user_id = payload.get("user_id")
        request.user_role = payload.get("role")
        request.user_payload = payload
        
        return f(*args, **kwargs)
    return decorated_function


def require_roles(*allowed_roles):
    """Decorator để kiểm tra quyền truy cập theo role"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Kiểm tra token
            payload = verify_token(request)
            if not payload:
                return jsonify({
                    "success": False,
                    "message": "Token không hợp lệ hoặc phiên làm việc đã hết hạn"
                }), 401
            
            user_role = payload.get("role")
            if user_role not in allowed_roles:
                return jsonify({
                    "success": False,
                    "message": f"Tài khoản thuộc nhóm quyền [{user_role}] không được phép thực hiện chức năng này"
                }), 403
            
            # Lưu payload vào request
            request.user_id = payload.get("user_id")
            request.user_role = user_role
            request.user_payload = payload
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
