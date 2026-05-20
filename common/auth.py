from datetime import datetime, timedelta, UTC
import jwt

SECRET_KEY = "restaurant_secret_key"

def generate_token(user):
    payload = {
        "user_id": user["id"],
        "role": user["role"],
        "exp": datetime.now(UTC) + timedelta(hours=12)
    }

    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def verify_token(request):
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return None

    try:
        token = auth_header.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except Exception:
        return None