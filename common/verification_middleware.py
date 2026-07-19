from functools import wraps
from flask import request, jsonify, g
import jwt
from common.config import JWT_SECRET_KEY as SECRET_KEY

def require_verification(purpose):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            auth_header = request.headers.get("X-Verification-Token")
            if not auth_header:
                return jsonify({
                    "success": False,
                    "message": "Missing X-Verification-Token header"
                }), 401
            
            try:
                # Token might be prefixed with Bearer
                token = auth_header.split(" ")[1] if " " in auth_header else auth_header
                payload = jwt.decode(
                    token, 
                    SECRET_KEY, 
                    algorithms=["HS256"], 
                    audience="customer-action", 
                    issuer="user-service"
                )
                
                # Verify purpose
                if payload.get("purpose") != purpose:
                    return jsonify({
                        "success": False,
                        "message": "Invalid token purpose"
                    }), 403
                
                # Inject into global context g
                g.verification = {
                    "sub": payload.get("sub"),
                    "jti": payload.get("jti"),
                    "purpose": payload.get("purpose")
                }
            except jwt.ExpiredSignatureError:
                return jsonify({
                    "success": False,
                    "message": "Verification token has expired"
                }), 401
            except jwt.InvalidTokenError as e:
                return jsonify({
                    "success": False,
                    "message": f"Invalid verification token: {str(e)}"
                }), 401
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
