from flask import Flask
from Routes.payment_route import payment_bp
from flask_cors import CORS

app = Flask(__name__)
CORS(app) # Cho phép Frontend (Web/App) gọi API mà không bị chặn CORS

# Đăng ký tập hợp các Route của phân hệ Payment
app.register_blueprint(payment_bp, url_prefix='/api/payments')

@app.route('/health', methods=['GET'])
def health_check():
    """Kiểm tra tình trạng sống/chết của Service"""
    return {"status": "Payment Service is up and running!", "code": 200}

if __name__ == '__main__':
    # Khởi động máy chủ trên cổng 5005 (map đúng với file docker-compose của bạn)
    app.run(host='0.0.0.0', port=5005, debug=True)