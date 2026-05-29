import sys
import os
from flask import Flask
from flask_cors import CORS

# Nạp root path hệ thống giúp nhận diện thư mục module common/ chung trong dự án Docker
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routes.inventory_route import inventory_bp

app = Flask(__name__)
CORS(app)

# Đăng ký blueprint phân hệ quản lý kho vật tư
app.register_blueprint(inventory_bp, url_prefix='/api/inventory')

@app.route("/", methods=["GET"])
def health_check():
    return {
        "service": "inventory-service",
        "status": "up and running"
    }

if __name__ == "__main__":
    # Phân hệ Kho chạy cố định trên cổng Port 5003 như quy ước Microservices của nhóm
    app.run(host="0.0.0.0", port=5003, debug=True)